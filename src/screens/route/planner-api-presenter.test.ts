import { describe, expect, it } from "vitest";
import type { PlannerApiOverview } from "../../api/planner";
import type {
  PlannerScenarioPreviewResponse,
  PlannerStepSkipResponse,
} from "../../api/planner-contract";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import {
  presentPlannerOverview,
  presentPlannerScenarioComparison,
  presentPlannerSkipComparison,
} from "./planner-api-presenter";
import {
  rejectUnsupportedPlannerOperation,
  validateExecutedStepInput,
  type PlannerViewModel,
} from "./planner-api-types";

function overview(): PlannerApiOverview {
  const first = PLANNER_API_FIXTURE.items[0]!;
  return {
    ...PLANNER_API_FIXTURE,
    items: [
      {
        ...first,
        goal: { ...first.goal, id: "first", name: "첫 목표", targetAmount: 100, heldAmount: 25 },
        activePlan: {
          ...first.activePlan!,
          planId: "plan",
          goalId: "first",
          version: 3,
          goal: {
            ...first.activePlan!.goal,
            targetAmount: 100,
            allocatedHoldingAmount: 25,
            remainingAmount: 65,
            targetDate: "2026-12-31",
          },
          summary: {
            ...first.activePlan!.summary,
            totalRounds: 4,
            completedRounds: 1,
            scheduledRounds: 2,
            skippedRounds: 1,
            nextActionSeq: 3,
          },
          steps: [
            { ...first.activePlan!.steps[0]!, seq: 1, scheduledDate: "2026-09-01", executedAmount: 10, status: "completed", nextAction: false },
            { ...first.activePlan!.steps[1]!, seq: 2, scheduledDate: "2026-09-10", status: "skipped", nextAction: false },
            { ...first.activePlan!.steps[1]!, seq: 3, scheduledDate: "2026-10-10", amount: 30, status: "pending", nextAction: true },
            { ...first.activePlan!.steps[1]!, seq: 4, scheduledDate: "2026-12-10", amount: 40, status: "pending", nextAction: false },
          ],
        },
      },
      {
        goal: {
          id: "second",
          name: "둘 목표",
          kind: "recurring",
          purpose: "investment",
          currencyCode: "JPY",
          targetAmount: 10,
          isSpeculative: false,
          status: "active",
          heldAmount: 40,
        },
        activePlan: null,
      },
    ],
  };
}

describe("presentPlannerOverview", () => {
  it("0개 목표에는 빈 ViewModel을 만들고 선택되지 않으면 첫 목표를 고른다", () => {
    expect(presentPlannerOverview({ items: [] })).toMatchObject({
      goalItems: [],
      selectedGoal: null,
      plan: null,
      curve: null,
      nextAction: null,
      dataSource: { kind: "unknown", label: "서버 조회 데이터" },
      supportedActions: {
        canPreviewPlan: false,
        canCreatePlan: false,
        canCompleteStep: false,
        canSkipStep: false,
      },
    });
    expect(presentPlannerOverview(overview()).selectedGoal?.id).toBe("first");
  });

  it("선택 목표의 최신 서버 계획 요약과 다음 행동을 표시한다", () => {
    const model = presentPlannerOverview(overview(), "first");
    expect(model.goalItems[0]).toMatchObject({
      id: "first",
      name: "첫 목표",
      targetAmountLabel: "100 USD",
      heldAmountLabel: "25 USD",
      isSelected: true,
    });
    expect(model.selectedGoal).toMatchObject({
      id: "first",
      progressPercent: 35,
      progressLabel: "목표 배정 및 완료 기록 기준",
      heldAmountLabel: "35 USD",
    });
    expect(model.plan).toMatchObject({
      id: "plan",
      version: 3,
      versionLabel: "v3",
      statusLabel: "적용 중",
      totalRounds: 4,
      completedRounds: 1,
      planSource: "active",
    });
    expect(model.nextAction).toMatchObject({ planId: "plan", sequence: 3, amount: 30 });
    expect(model.dataSource).toEqual({ kind: "sample", label: "샘플 데이터" });
    expect(JSON.stringify(model)).not.toContain("safeRatio");
    expect(JSON.stringify(model)).not.toContain("achieveProb");
  });

  it("목표 전환과 활성 계획 없음 상태를 표현한다", () => {
    const model = presentPlannerOverview(overview(), "second");
    expect(model.goalItems[1]?.isSelected).toBe(true);
    expect(model.selectedGoal).toMatchObject({
      id: "second",
      progressPercent: 100,
      targetDate: null,
      targetDateLabel: "미설정",
    });
    expect(model.plan).toBeNull();
    expect(model.steps).toEqual([]);
    expect(model.nextAction).toBeNull();
    expect(model.supportedActions.canPreviewPlan).toBe(true);
  });

  it("실제 날짜 간격과 누적 금액으로 Curve 좌표와 상태를 만든다", () => {
    const model = presentPlannerOverview(overview());
    expect(model.steps.map((step) => step.status)).toEqual([
      "completed",
      "skipped",
      "next",
      "upcoming",
    ]);
    const [first, second, third, fourth] = model.curveNodes;
    expect(first!.x).toBeLessThan(second!.x);
    expect(second!.x).toBeLessThan(third!.x);
    expect(third!.x).toBeLessThan(fourth!.x);
    expect(second!.cumulativeAmount).toBe(first!.cumulativeAmount);
    expect(third!.cumulativeAmount).toBe(first!.cumulativeAmount + 30);
    expect(fourth!.cumulativeAmount).toBe(third!.cumulativeAmount + 40);
    expect(model.curve).toMatchObject({
      destination: {
        status: "destination",
        targetAmountLabel: "100 USD",
      },
    });
  });

  it("알 수 없는 선택은 첫 목표로 돌아가고 회차가 없어도 목적지를 표시한다", () => {
    const first = overview().items[0]!;
    const noSteps: PlannerApiOverview = {
      items: [
        {
          ...first,
          goal: { ...first.goal, targetDate: undefined },
          activePlan: {
            ...first.activePlan!,
            planId: null,
            version: null,
            summary: { ...first.activePlan!.summary, nextActionSeq: null },
            steps: [],
          },
        },
      ],
      isSampleData: false,
    };
    const model = presentPlannerOverview(noSteps, "unknown");
    expect(model.selectedGoal).toMatchObject({ id: "first", targetDateLabel: "2026-12-31" });
    expect(model.plan).toMatchObject({
      versionLabel: "미리보기",
      planSource: "preview",
    });
    expect(model.curve?.path).toBe("");
    expect(model.curve?.destination).toMatchObject({
      status: "destination",
      targetAmountLabel: "100 USD",
    });
    expect(model.nextAction).toBeNull();
    expect(model.dataSource).toEqual({ kind: "account", label: "내 계정 데이터" });
  });

  it("진행률은 잘못된 분모에서 0이고 항상 0부터 100 사이로 제한한다", () => {
    const first = overview().items[0]!;
    const withGoal = (goal: typeof first.goal): PlannerApiOverview => ({
      items: [{ ...first, goal, activePlan: null }],
    });
    expect(presentPlannerOverview(withGoal({ ...first.goal, targetAmount: 0 })).selectedGoal?.progressPercent).toBe(0);
    expect(presentPlannerOverview(withGoal({ ...first.goal, heldAmount: -5 })).selectedGoal?.progressPercent).toBe(0);
    expect(presentPlannerOverview(withGoal({ ...first.goal, heldAmount: Number.NaN })).selectedGoal?.progressPercent).toBe(0);
    expect(presentPlannerOverview(withGoal({ ...first.goal, targetAmount: Number.POSITIVE_INFINITY })).selectedGoal?.progressPercent).toBe(0);
    expect(presentPlannerOverview(overview(), "second").selectedGoal?.progressPercent).toBe(100);
  });

  it("실행 입력은 양의 유한수만 허용한다", () => {
    expect(validateExecutedStepInput({ executedAmount: 1, executedRate: 1_400 })).toEqual({
      isValid: true,
      value: { executedAmount: 1, executedRate: 1_400 },
    });
    expect(validateExecutedStepInput({ executedAmount: Number.POSITIVE_INFINITY, executedRate: 1_400 })).toMatchObject({ isValid: false });
    expect(validateExecutedStepInput({ executedAmount: 1, executedRate: 0 })).toMatchObject({ isValid: false });
    expect(validateExecutedStepInput({ executedAmount: 1, executedRate: Number.NEGATIVE_INFINITY })).toMatchObject({ isValid: false });
  });

  it("서버 계획 상태와 명시되지 않은 다음 회차를 결정적으로 표시한다", () => {
    const first = overview().items[0]!;
    const labels = [
      ["completed", "완료"],
      ["superseded", "이전 버전"],
      ["paused", "paused"],
    ] as const;
    for (const [status, expected] of labels) {
      const model = presentPlannerOverview({
        items: [
          {
            ...first,
            activePlan: {
              ...first.activePlan!,
              summary: { ...first.activePlan!.summary, status },
            },
          },
        ],
      });
      expect(model.plan?.statusLabel).toBe(expected);
    }

    const fallback = presentPlannerOverview({
      items: [
        {
          ...first,
          activePlan: {
            ...first.activePlan!,
            summary: {
              ...first.activePlan!.summary,
              nextActionSeq: null,
              estimatedCost: null,
            },
            steps: first.activePlan!.steps.map((step, index) => ({
              ...step,
              nextAction: false,
              budgetKrw: index === 2 ? null : step.budgetKrw,
              estimatedCost: index === 2 ? null : step.estimatedCost,
            })),
          },
        },
      ],
    });
    expect(fallback.nextAction?.sequence).toBe(3);
    expect(fallback.plan?.estimatedCostLabel).toBeNull();
    expect(fallback.steps[2]).toMatchObject({
      status: "next",
      budgetLabel: null,
      estimatedCostLabel: null,
    });
  });

  it("서버 scenario 응답을 변경 전후 행과 분기 Curve로만 변환한다", () => {
    const model = presentPlannerOverview(overview());
    const response: PlannerScenarioPreviewResponse = {
      basePlanId: "plan",
      baseVersion: 3,
      draftPlanId: "draft",
      draftVersion: 4,
      changeReasonCode: "BUDGET_DECREASED",
      priorityConstraint: "budget",
      before: {
        remainingAmount: 75,
        targetDate: "2026-12-01",
        totalRounds: 4,
        openRounds: 2,
        perRoundAmount: null,
        roundBudgetKrw: null,
        costRange: null,
      },
      after: {
        remainingAmount: 75,
        targetDate: "2026-12-15",
        totalRounds: 5,
        openRounds: 3,
        perRoundAmount: 25,
        roundBudgetKrw: 180_000,
        costRange: null,
      },
      changedSteps: [
        {
          seq: 3,
          changeType: "date_changed",
          dateBefore: "2026-09-01",
          dateAfter: "2026-09-02",
          amountBefore: 10,
          amountAfter: 10,
        },
        {
          seq: 5,
          changeType: "amount_changed",
          dateBefore: "2026-09-10",
          dateAfter: "2026-09-10",
          amountBefore: 20,
          amountAfter: 15,
        },
      ],
      keptConstraints: [],
      brokenConstraints: [],
      budgetState: "within_budget",
      adjustmentOptions: [],
      warnings: ["조건 확인"],
    };
    const option = model.scenarioOptions!.find(
      (candidate) => candidate.id === "reducedBudget",
    )!;
    const comparison = presentPlannerScenarioComparison(response, model, option);
    expect(comparison.rows).toEqual([
      { label: "남은 목표 금액", before: "75 USD", after: "75 USD" },
      { label: "목표일", before: "2026-12-01", after: "2026-12-15" },
      { label: "남은 회차", before: "2회", after: "3회" },
      { label: "회차 금액", before: "제공되지 않음", after: "25 USD" },
      { label: "회차 예산", before: "제공되지 않음", after: "180,000원" },
      { label: "예상 원화 비용", before: "제공되지 않음", after: "제공되지 않음" },
    ]);
    expect(comparison.alternativeCurve?.path).not.toBe(model.curve?.path);
    expect(comparison.changedNodeIds).toHaveLength(2);
    expect(comparison.warnings).toEqual(["조건 확인"]);

    const noDestination: PlannerViewModel = {
      ...model,
      curve:
        model.curve === null
          ? null
          : {
              ...model.curve,
              destination: null,
              targetAmount: null,
              targetDate: null,
              targetLineY: null,
            },
    };
    expect(
      presentPlannerScenarioComparison(response, noDestination, option)
        .alternativeCurve?.destination,
    ).toBeNull();

    const empty: PlannerViewModel = {
      ...model,
      selectedGoal: null,
      curveNodes: [],
      curve: null,
    };
    const emptyComparison = presentPlannerScenarioComparison(
      response,
      empty,
      option,
    );
    expect(emptyComparison.rows[0]).toEqual({
      label: "남은 목표 금액",
      before: "75 외화",
      after: "75 외화",
    });
    expect(emptyComparison.alternativeCurve).toBeNull();

    const unchanged = presentPlannerScenarioComparison(
      {
        ...response,
        changedSteps: [
          {
            seq: 3,
            changeType: "amount_changed",
            dateBefore: "2026-10-10",
            dateAfter: "2026-10-10",
            amountBefore: 30,
            amountAfter: 30,
          },
        ],
      },
      model,
      option,
    );
    expect(unchanged.baseCurve).toBe(model.curve);
    expect(unchanged.alternativeCurve).toBeNull();

    const staleView: PlannerViewModel = {
      ...model,
      curve: {
        ...model.curve!,
        currentDate: null,
        targetDate: null,
      },
      curveNodes: [],
      steps: [],
    };
    const safelyPartial = presentPlannerScenarioComparison(
      response,
      staleView,
      option,
    );
    expect(safelyPartial.baseCurve).toBeNull();
    expect(safelyPartial.alternativeCurve).not.toBeNull();

    const withoutNodeIds = presentPlannerScenarioComparison(
      response,
      { ...model, curveNodes: [] },
      option,
    );
    expect(withoutNodeIds.alternativeCurve?.nodes[0]?.id).toBe("scenario-1");
  });

  it("건너뛰기 응답은 저장되지 않은 재분배 영향으로만 표시한다", () => {
    const model = presentPlannerOverview(overview());
    const option = model.scenarioOptions!.find(
      (candidate) => candidate.id === "missedRound",
    )!;
    const response: PlannerStepSkipResponse = {
      seq: 2,
      applied: false,
      amountBefore: 20,
      amountAfter: 30,
      remainingAmount: 60,
      remainingRounds: 2,
      perRoundCostKrw: 42_000,
      exceedsBudget: true,
      adjustmentOptions: ["EXTEND_TARGET_DATE", "REDUCE_TARGET_AMOUNT"],
    };

    expect(presentPlannerSkipComparison(response, model, option)).toMatchObject({
      id: "missedRound",
      draftPlanId: null,
      canRequestDraft: true,
      alternativeCurve: null,
      changedNodeIds: [],
      rows: [
        { label: "회차 준비 금액", before: "20 USD", after: "30 USD" },
        { label: "남은 목표 금액", before: "기존 값 제공되지 않음", after: "60 USD" },
        { label: "재분배할 회차", before: "기존 값 제공되지 않음", after: "2회" },
        { label: "회차 예상 원화", before: "기존 값 제공되지 않음", after: "42,000원" },
      ],
      warnings: [
        "재분배 후 회차 금액이 설정한 예산 범위를 넘습니다.",
        "서버가 2개의 추가 조정 선택지를 제공했습니다.",
      ],
    });

    expect(
      presentPlannerSkipComparison(
        { ...response, perRoundCostKrw: null, exceedsBudget: false, adjustmentOptions: [] },
        { ...model, selectedGoal: null },
        option,
      ),
    ).toMatchObject({
      rows: [
        { before: "20 외화", after: "30 외화" },
        { after: "60 외화" },
        { after: "2회" },
        { after: "계산 근거 제공되지 않음" },
      ],
      warnings: [],
    });
  });

  it("지원하지 않는 공급처 동작은 서버 호출 없이 false를 반환한다", async () => {
    await expect(rejectUnsupportedPlannerOperation()).resolves.toBe(false);
  });
});
