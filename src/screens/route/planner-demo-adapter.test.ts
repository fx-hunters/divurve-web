import { beforeAll, describe, expect, it } from "vitest";
import { loadRoutePlan } from "../../api/route";
import type { RoutePlanData } from "../../types/route";
import {
  presentDemoPlanner,
  presentDemoScenarioComparison,
} from "./planner-demo-adapter";
import type { PlannerLocalGoal } from "./planner-goal-input";
import {
  EMPTY_PLANNER_DEMO_PROGRESS,
  type PlannerDemoProgress,
} from "./planner-demo-progress";

let data: RoutePlanData;

function mapNonEmpty<T>(
  items: readonly [T, ...T[]],
  mapper: (item: T) => T,
): readonly [T, ...T[]] {
  const [first, ...rest] = items;
  return [mapper(first), ...rest.map(mapper)];
}

beforeAll(async () => {
  const loaded = await loadRoutePlan();
  if (loaded === null) throw new Error("데모 플래너 fixture가 필요합니다.");
  data = loaded;
});

function demoProgress(
  goalId: string,
  recordedSequences: readonly number[] = [],
  appliedScenarioId: string | null = null,
): PlannerDemoProgress {
  return {
    version: 1,
    goals: {
      [goalId]: { recordedSequences, appliedScenarioId },
    },
  };
}

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
      demoProgress("jpy-travel-deadline-demo", [], "rapidRise"),
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
      demoProgress("usd-etf-recurring-demo", [], "missedRound"),
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
      demoProgress("usd-etf-recurring-demo", [1], "expectedRange"),
    );
    expect(model.nextAction).toMatchObject({
      title: "2회차 준비 내용 확인",
      amountLabel: "290 USD",
    });
    expect(model.steps.find((step) => step.sequence === 1)?.status).toBe(
      "completed",
    );
    expect(model.supportedActions.canCompleteStep).toBe(false);
    expect(model.selectedGoal).toMatchObject({
      heldAmount: 1_405,
      heldAmountLabel: "1,405 USD 확보",
      remainingAmountLabel: "1,595 USD",
      progressLabel: "외화 확보율 47% (데모)",
    });
    expect(model.selectedGoal?.progressPercent).toBeCloseTo(46.83, 2);
  });

  it("일본 목표 기록도 요약·진행률·Curve·다음 행동에 같은 값으로 반영한다", () => {
    const goalId = "jpy-travel-deadline-demo";
    const model = presentDemoPlanner(data, goalId, demoProgress(goalId, [1]));

    expect(model.selectedGoal).toMatchObject({
      heldAmount: 75_000,
      heldAmountLabel: "75,000 JPY 확보",
      remainingAmountLabel: "105,000 JPY",
      progressLabel: "외화 확보율 42% (데모)",
    });
    expect(model.selectedGoal?.progressPercent).toBeCloseTo(41.67, 2);
    expect(model.curve?.currentPoint?.amount).toBe(75_000);
    expect(model.steps[0]).toMatchObject({
      status: "completed",
      cumulativeAmount: 75_000,
    });
    expect(model.nextAction).toMatchObject({ sequence: 2, amount: 35_000 });
  });

  it("완료한 실제 구간을 유지하고 다음 미완료 회차에 데이터가 있을 때만 변경 Curve를 만든다", () => {
    const goalId = "jpy-travel-deadline-demo";
    const progress = demoProgress(goalId, [1]);
    const missed = presentDemoScenarioComparison(
      data,
      goalId,
      "missedRound",
      progress,
    );
    expect(missed?.alternativeCurve).toBeNull();
    expect(missed?.changedNodeIds).toEqual([]);

    const reduced = presentDemoScenarioComparison(
      data,
      goalId,
      "reducedBudget",
      progress,
    );
    expect(reduced?.alternativeCurve).not.toBeNull();
    expect(reduced?.baseCurve?.nodes[0]).toMatchObject({
      status: "completed",
      cumulativeAmount: 75_000,
    });
    expect(reduced?.alternativeCurve?.nodes[0]).toMatchObject({
      status: "completed",
      cumulativeAmount: 75_000,
    });
    expect(reduced?.changedNodeIds).not.toContain("jpy-round-1");
    expect(reduced?.changedNodeIds).toContain("jpy-round-2");
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
      demoProgress("usd-etf-recurring-demo", [1]),
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
    expect(selected.goalItems[0]?.heldAmountLabel).toBe("1,405 USD 확보");

    const fixtureSelected = presentDemoPlanner(
      data,
      data.plans[0]!.id,
      EMPTY_PLANNER_DEMO_PROGRESS,
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
      demoProgress(sourcePlan.id, [1], "unknown"),
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
      demoProgress(sourcePlan.id, [1]),
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
      demoProgress(sourcePlan.id, [1]),
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

  it("대체 경로에만 있는 기록 회차는 그 대체 회차 값으로 완료 상태를 만든다", () => {
    const sourcePlan = data.plans[0]!;
    const extraStep = {
      ...sourcePlan.curveData.steps[1]!,
      id: "scenario-only-round",
      sequence: 99,
      scheduledDate: "2027-01-01",
      amount: 77,
      status: "upcoming" as const,
    };
    const fixture: RoutePlanData = {
      ...data,
      plans: [
        {
          ...sourcePlan,
          scenarios: mapNonEmpty(sourcePlan.scenarios, (scenario) =>
            scenario.id === "reducedBudget"
              ? {
                  ...scenario,
                  curveData: {
                    ...sourcePlan.curveData,
                    steps: [...sourcePlan.curveData.steps, extraStep],
                  },
                }
              : scenario,
          ),
        },
      ],
    };

    const model = presentDemoPlanner(
      fixture,
      sourcePlan.id,
      demoProgress(sourcePlan.id, [99], "reducedBudget"),
    );

    expect(model.steps.find((step) => step.sequence === 99)).toMatchObject({
      scheduledDate: "2027-01-01",
      amount: 77,
      status: "completed",
      executedAmount: 77,
    });
  });

  it("대체 경로가 모든 회차를 건너뛰어도 원래 계획의 미완료 회차를 안전하게 찾는다", () => {
    const sourcePlan = data.plans[0]!;
    const fixture: RoutePlanData = {
      ...data,
      plans: [
        {
          ...sourcePlan,
          scenarios: mapNonEmpty(sourcePlan.scenarios, (scenario) =>
            scenario.id === "reducedBudget"
              ? {
                  ...scenario,
                  curveData: {
                    ...sourcePlan.curveData,
                    steps: sourcePlan.curveData.steps.map((step) => ({
                      ...step,
                      status: "skipped" as const,
                    })),
                  },
                }
              : scenario,
          ),
        },
      ],
    };

    const model = presentDemoPlanner(
      fixture,
      sourcePlan.id,
      demoProgress(sourcePlan.id, [], "reducedBudget"),
    );

    expect(model.steps).toHaveLength(sourcePlan.curveData.steps.length);
    expect(model.steps.every((step) => step.status === "skipped")).toBe(true);
    expect(model.nextAction).toBeNull();
  });
});
