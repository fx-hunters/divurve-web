import { beforeAll, describe, expect, it } from "vitest";
import { loadRoutePlan } from "../../api/route";
import type { RoutePlanData } from "../../types/route";
import {
  presentDemoPlanner,
  presentDemoScenarioComparison,
} from "./planner-demo-adapter";
import type { PlannerLocalGoal } from "./planner-goal-input";

let data: RoutePlanData;

beforeAll(async () => {
  const loaded = await loadRoutePlan();
  if (loaded === null) throw new Error("데모 플래너 fixture가 필요합니다.");
  data = loaded;
});

function withoutScenarioCurveData(
  scenarios: RoutePlanData["plans"][number]["scenarios"],
): RoutePlanData["plans"][number]["scenarios"] {
  const [first, ...rest] = scenarios;
  return [
    { ...first, curveData: undefined },
    ...rest.map((scenario) => ({ ...scenario, curveData: undefined })),
  ];
}

describe("planner demo adapter", () => {
  it("두 fixture 목표를 공통 ViewModel과 데모 출처로 변환한다", () => {
    const model = presentDemoPlanner(data);
    expect(model.goalItems).toHaveLength(2);
    expect(model.goalItems.map((goal) => goal.name)).toEqual([
      "미국 ETF 정기 투자",
      "일본 여행 준비",
    ]);
    expect(model.dataSource).toEqual({ kind: "demo", label: "데모 데이터" });
    expect(model.plan?.planSource).toBe("active");
    expect(model.selectedGoal).toMatchObject({
      id: "usd-etf-recurring-demo",
      targetAmount: 3_000,
      heldAmount: 1_260,
      progressPercent: 42,
    });
    expect(model.curve?.viewBox).toBe("0 0 1000 440");
    expect(model.curve?.accessibleLabel).toContain("가로축은 날짜");
    expect(model.scenarioOptions).toHaveLength(5);
  });

  it("선택 목표와 적용 시나리오의 기존 Curve 표시값을 보존한다", () => {
    const model = presentDemoPlanner(
      data,
      "jpy-travel-deadline-demo",
      "rapidRise",
    );
    expect(model.selectedGoal?.name).toBe("일본 여행 준비");
    expect(model.nextAction).toMatchObject({
      amountLabel: "35,000 JPY",
      title: "1회차 준비 내용 확인",
    });
    expect(model.plan?.summaryText).toContain("예산 한도");
    expect(model.supportedActions.canPreviewScenario).toBe(true);

    const missed = presentDemoPlanner(
      data,
      "usd-etf-recurring-demo",
      "missedRound",
    );
    expect(missed.steps[0]).toMatchObject({
      status: "skipped",
      calculationBasis: "건너뛴 회차는 누적 금액에 더하지 않음",
    });
  });

  it("데모 기록 뒤에는 다음 확인 문구를 사용하고 완료 action을 막는다", () => {
    const model = presentDemoPlanner(
      data,
      "usd-etf-recurring-demo",
      "expectedRange",
      true,
    );
    expect(model.nextAction).toMatchObject({
      title: "2회차 준비 내용 확인",
      amountLabel: "290 USD",
    });
    expect(model.steps.find((step) => step.sequence === 1)?.status).toBe(
      "completed",
    );
    expect(model.supportedActions.canCompleteStep).toBe(false);
  });

  it("현재·알 수 없는 상황은 비교를 만들지 않고 대체 상황만 비교한다", () => {
    expect(
      presentDemoScenarioComparison(
        data,
        "usd-etf-recurring-demo",
        "expectedRange",
      ),
    ).toBeNull();
    expect(
      presentDemoScenarioComparison(
        data,
        "usd-etf-recurring-demo",
        "unknown",
      ),
    ).toBeNull();
    const comparison = presentDemoScenarioComparison(
      data,
      "usd-etf-recurring-demo",
      "missedRound",
    );
    expect(comparison).toMatchObject({
      id: "missedRound",
      draftPlanId: "missedRound",
    });
    expect(comparison?.baseCurve).not.toBeNull();
    expect(comparison?.alternativeCurve).not.toBeNull();
    expect(comparison?.changedNodeIds).toContain("usd-round-1");
    expect(comparison?.reason).toContain("체험");
  });

  it("알 수 없는 목표 식별자는 첫 데모 목표로 안전하게 돌아간다", () => {
    expect(presentDemoPlanner(data, "unknown").selectedGoal?.id).toBe(
      "usd-etf-recurring-demo",
    );
  });

  it("사용자가 추가한 데모 목표는 fixture 계획과 섞지 않고 계획 없음으로 표시한다", () => {
    const localGoal: PlannerLocalGoal = {
      id: "demo-local",
      input: {
        name: "유럽 여행 준비",
        kind: "deadline",
        purpose: "TRAVEL",
        currencyCode: "EUR",
        targetAmount: 2_400,
        targetDate: "2027-12-31",
        recurInterval: "monthly",
        budgetAmount: 0,
        budgetPeriod: null,
      },
    };

    const selected = presentDemoPlanner(
      data,
      localGoal.id,
      null,
      false,
      [localGoal],
    );
    expect(selected.selectedGoal).toMatchObject({
      id: "demo-local",
      targetAmount: 2_400,
      heldAmount: 0,
      remainingAmountLabel: "2,400 EUR",
    });
    expect(selected.plan).toBeNull();
    expect(selected.curve).toBeNull();
    expect(selected.goalItems[selected.goalItems.length - 1]).toMatchObject({
      name: "유럽 여행 준비",
      isSelected: true,
      planStatusLabel: "계획 데이터 없음",
    });

    const fixtureSelected = presentDemoPlanner(
      data,
      data.plans[0]!.id,
      null,
      false,
      [localGoal],
    );
    expect(
      fixtureSelected.goalItems[fixtureSelected.goalItems.length - 1],
    ).toMatchObject({
      name: "유럽 여행 준비",
      isSelected: false,
    });
  });

  it("도착 노드와 기록 뒤 다음 노드가 없는 fixture를 임의 생성 없이 표시한다", () => {
    const sourcePlan = data.plans[0]!;
    const sourceScenario = sourcePlan.scenarios[0]!;
    const withoutDestination = {
      ...sourceScenario,
      id: "rapidRise" as const,
      checkpoints: sourceScenario.checkpoints.filter(
        (checkpoint) => checkpoint.status !== "destination",
      ),
    };
    const fixture: RoutePlanData = {
      ...data,
      plans: [
        {
          ...sourcePlan,
          scenarios: [withoutDestination],
          recordedState: {
            ...sourcePlan.recordedState,
            nextCheckpointId: "missing-checkpoint",
          },
        },
      ],
    };

    const model = presentDemoPlanner(
      fixture,
      sourcePlan.id,
      "unknown",
      true,
    );
    expect(model.curve?.destination).toMatchObject({
      targetAmountLabel: "3,000 USD",
    });
    expect(model.nextAction?.sequence).toBe(2);
  });

  it("목표 금액과 다음 회차가 없는 데모 응답은 fixture의 대체 표시만 사용한다", () => {
    const sourcePlan = data.plans[0]!;
    const withoutTarget: RoutePlanData = {
      ...data,
      plans: [
        {
          ...sourcePlan,
          scenarios: withoutScenarioCurveData(sourcePlan.scenarios),
          curveData: {
            ...sourcePlan.curveData,
            targetAmount: null,
            steps: sourcePlan.curveData.steps.map((step) => ({
              ...step,
              status: "completed" as const,
              executedAmount: step.amount,
              executedDate: step.scheduledDate,
            })),
          },
        },
      ],
    };

    const model = presentDemoPlanner(withoutTarget, sourcePlan.id);
    expect(model.selectedGoal).toMatchObject({
      targetAmount: null,
      remainingAmountLabel: "제공되지 않음",
      progressPercent: sourcePlan.goal.progressPercent,
    });
    expect(model.nextAction).toBeNull();
  });

  it("잘못된 데모 날짜와 빈 회차는 금액이나 Curve를 임의 생성하지 않는다", () => {
    const sourcePlan = data.plans[0]!;
    const steps = [
      {
        ...sourcePlan.curveData.steps[0]!,
        scheduledDate: "invalid-date",
        status: "next" as const,
      },
      {
        ...sourcePlan.curveData.steps[1]!,
        scheduledDate: "invalid-date",
        status: "upcoming" as const,
      },
      {
        ...sourcePlan.curveData.steps[1]!,
        id: "demo-invalid-third",
        sequence: 3,
        scheduledDate: "invalid-date",
        status: "next" as const,
      },
      {
        ...sourcePlan.curveData.steps[1]!,
        id: "demo-invalid-fourth",
        sequence: 4,
        scheduledDate: "invalid-date",
        status: "upcoming" as const,
      },
    ];
    const invalidDates: RoutePlanData = {
      ...data,
      plans: [
        {
          ...sourcePlan,
          curveData: {
            ...sourcePlan.curveData,
            currentDate: "invalid-date",
            targetDate: null,
            targetAmount: null,
            steps,
          },
        },
      ],
    };

    const invalidModel = presentDemoPlanner(
      invalidDates,
      sourcePlan.id,
      null,
      true,
    );
    expect(invalidModel.curve).toBeNull();
    expect(invalidModel.curveNodes).toEqual([]);
    expect(invalidModel.steps.map((step) => step.status)).toEqual([
      "completed",
      "next",
      "upcoming",
      "upcoming",
    ]);
    expect(invalidModel.steps[0]).toMatchObject({
      cumulativeAmount: 0,
      cumulativeAmountLabel: "누적 금액 확인 불가",
      actionLabel: "회차 정보 확인",
      statusLabel: "데모 기록 완료",
    });
    expect(invalidModel.steps[1]?.statusLabel).toBe("예정");

    const withoutSteps: RoutePlanData = {
      ...data,
      plans: [
        {
          ...sourcePlan,
          scenarios: withoutScenarioCurveData(sourcePlan.scenarios),
          curveData: { ...sourcePlan.curveData, steps: [] },
        },
      ],
    };
    const emptyModel = presentDemoPlanner(
      withoutSteps,
      sourcePlan.id,
      null,
      true,
    );
    expect(emptyModel.selectedGoal?.heldAmount).toBe(
      sourcePlan.curveData.allocatedAmount,
    );
    expect(emptyModel.nextAction).toBeNull();
  });

  it("Curve 수치가 없는 데모 상황 비교는 변경 지점을 만들지 않는다", () => {
    const comparison = presentDemoScenarioComparison(
      data,
      "usd-etf-recurring-demo",
      "rapidRise",
    );

    expect(comparison?.alternativeCurve).toBeNull();
    expect(comparison?.changedNodeIds).toEqual([]);
  });
});
