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
            allocatedHoldingAmount: 35,
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
      heldAmountLabel: "35 USD",
      isSelected: true,
    });
    expect(model.selectedGoal).toMatchObject({
      id: "first",
      progressPercent: 35,
      progressLabel: "현재 목표 확보액 기준",
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
      nextActionSeq: 3,
      budgetStateLabel: "현재 환율 범위에서 예산으로 감당됩니다",
    });
    expect(model.nextAction).toMatchObject({ planId: "plan", sequence: 3, amount: 30 });
    expect(model.dataSource).toEqual({ kind: "sample", label: "샘플 데이터" });
    expect(JSON.stringify(model)).not.toContain("safeRatio");
    expect(JSON.stringify(model)).not.toContain("achieveProb");
  });

  it.each([
    {
      label: "완료 0회",
      allocatedHoldingAmount: 100,
      completedAmounts: [] as readonly number[],
      expectedCurrent: 100,
      expectedCumulative: [140],
    },
    {
      label: "완료 1회",
      allocatedHoldingAmount: 115,
      completedAmounts: [15] as readonly number[],
      expectedCurrent: 115,
      expectedCumulative: [115, 155],
    },
    {
      label: "완료 여러 회",
      allocatedHoldingAmount: 140,
      completedAmounts: [15, 25] as readonly number[],
      expectedCurrent: 140,
      expectedCumulative: [115, 140, 180],
    },
  ])(
    "저장 Plan의 현재 확보액을 다시 합산하지 않는다: $label",
    ({ allocatedHoldingAmount, completedAmounts, expectedCurrent, expectedCumulative }) => {
      const source = overview().items[0]!;
      const plan = source.activePlan!;
      const template = plan.steps[0]!;
      const completedSteps = completedAmounts.map((executedAmount, index) => ({
        ...template,
        seq: index + 1,
        scheduledDate: `2026-09-${String(index + 1).padStart(2, "0")}`,
        executedAmount,
        executedDate: `2026-09-${String(index + 1).padStart(2, "0")}`,
        status: "completed",
        nextAction: false,
      }));
      const futureStep = {
        ...template,
        seq: completedSteps.length + 1,
        scheduledDate: "2026-10-01",
        amount: 40,
        executedAmount: 0,
        executedDate: null,
        status: "due",
        nextAction: true,
      };
      const model = presentPlannerOverview({
        items: [
          {
            ...source,
            activePlan: {
              ...plan,
              goal: {
                ...plan.goal,
                allocatedHoldingAmount,
                remainingAmount: 300 - allocatedHoldingAmount,
                targetAmount: 300,
              },
              summary: {
                ...plan.summary,
                completedRounds: completedSteps.length,
                scheduledRounds: 1,
                totalRounds: completedSteps.length + 1,
                nextActionSeq: futureStep.seq,
              },
              steps: [...completedSteps, futureStep],
            },
          },
        ],
      });

      expect(model.selectedGoal?.heldAmount).toBe(expectedCurrent);
      expect(model.curve?.currentPoint?.amount).toBe(expectedCurrent);
      expect(model.curveNodes.map((node) => node.cumulativeAmount)).toEqual(
        expectedCumulative,
      );
    },
  );

  it("현재 확보액보다 완료 합계가 크면 과거 누적을 임의 보정하지 않는다", () => {
    const source = overview().items[0]!;
    const activePlan = source.activePlan!;
    const model = presentPlannerOverview({
      items: [
        {
          ...source,
          activePlan: {
            ...activePlan,
            goal: {
              ...activePlan.goal,
              allocatedHoldingAmount: 5,
            },
            steps: [
              {
                ...activePlan.steps[0]!,
                executedAmount: 10,
                status: "completed",
              },
              activePlan.steps[2]!,
            ],
          },
        },
      ],
    });

    expect(model.selectedGoal?.heldAmount).toBe(5);
    expect(model.curve?.nodes.some((node) => node.status === "completed")).toBe(
      false,
    );
    expect(model.curve?.dataNotice).toContain("과거 완료 구간은 표시하지 않았습니다");
    expect(model.steps[0]?.cumulativeAmountLabel).toBe("누적 금액 확인 불가");
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

  it("저장 Plan의 현재 확보액이 올바르지 않으면 0으로 표시한다", () => {
    const first = overview().items[0]!;
    const model = presentPlannerOverview({
      items: [
        {
          ...first,
          activePlan: {
            ...first.activePlan!,
            goal: {
              ...first.activePlan!.goal,
              allocatedHoldingAmount: Number.NaN,
            },
          },
        },
      ],
    });

    expect(model.selectedGoal).toMatchObject({
      heldAmount: 0,
      heldAmountLabel: "0 USD",
      progressPercent: 0,
    });
    expect(model.curve?.currentPoint?.amount).toBe(0);
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
      ["paused", "일시 정지"],
      ["needs_review", "재검토 필요"],
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
              budgetState: null,
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
    expect(fallback.plan?.budgetStateLabel).toBeNull();
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

    const completedStepWithoutExecutionDate: PlannerViewModel = {
      ...model,
      steps: model.steps.map((step) =>
        step.status === "completed" ? { ...step, executedDate: null } : step,
      ),
    };
    expect(
      presentPlannerScenarioComparison(
        response,
        completedStepWithoutExecutionDate,
        option,
      ).baseCurve?.nodes.find((node) => node.sequence === 1)?.date,
    ).toBe("2026-09-01");

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

  it("확장 상태와 내부 코드는 사용자 문구로 안전하게 대체한다", () => {
    const first = overview().items[0]!;
    const sourcePlan = first.activePlan!;
    const fallbackOverview: PlannerApiOverview = {
      items: [
        {
          ...first,
          goal: { ...first.goal, targetDate: undefined },
          activePlan: {
            ...sourcePlan,
            calculationMeta: null,
            goal: {
              ...sourcePlan.goal,
              targetAmount: null,
              targetDate: null,
            },
            summary: {
              ...sourcePlan.summary,
              status: "future_plan_status",
              planEndDate: null,
              budgetState: "FUTURE_BUDGET_STATE",
            },
            steps: [
              {
                ...sourcePlan.steps[0]!,
                scheduledDate: "invalid-date",
                budgetKrw: 180_000,
                status: "pending",
                nextAction: true,
              },
            ],
            warnings: ["FUTURE_WARNING"],
          },
        },
      ],
      isSampleData: false,
    };

    const model = presentPlannerOverview(fallbackOverview);
    expect(model.plan).toMatchObject({
      statusLabel: "상태 확인 필요",
      planEndDateLabel: "제공되지 않음",
      budgetStateLabel: "예산 상태 세부 정보는 제공되지 않았습니다",
      policyVersion: null,
      calculatedAtLabel: null,
      rateAsOfLabel: null,
      warnings: ["추가 확인이 필요한 계획 조건이 있습니다"],
    });
    expect(model.curve).toBeNull();
    expect(model.steps[0]).toMatchObject({
      budgetLabel: "180,000원",
      cumulativeAmount: 0,
      cumulativeAmountLabel: "누적 금액 확인 불가",
      actionLabel: "회차 정보 확인",
    });
  });

  it("scenario 변경 필드가 일부 없거나 확장 코드여도 기존 회차 기준을 보존한다", () => {
    const model = presentPlannerOverview(overview());
    const option = model.scenarioOptions!.find(
      (candidate) => candidate.id === "rapidRise",
    )!;
    const sourceResponse: PlannerScenarioPreviewResponse = {
      basePlanId: "plan",
      baseVersion: 3,
      draftPlanId: "draft-future",
      draftVersion: 4,
      changeReasonCode: "FUTURE_REASON",
      priorityConstraint: "budget",
      before: {
        remainingAmount: 75,
        targetDate: "2026-12-31",
        totalRounds: 4,
        openRounds: 2,
        perRoundAmount: 30,
        roundBudgetKrw: 200_000,
        costRange: null,
      },
      after: {
        remainingAmount: 75,
        targetDate: "2026-12-31",
        totalRounds: 4,
        openRounds: 2,
        perRoundAmount: 30,
        roundBudgetKrw: null,
        costRange: null,
      },
      changedSteps: [
        {
          seq: 3,
          changeType: "amount_changed",
          dateBefore: "2026-10-10",
          dateAfter: null,
          amountBefore: 30,
          amountAfter: 31,
        },
        {
          seq: 4,
          changeType: "date_changed",
          dateBefore: "2026-12-10",
          dateAfter: "2026-12-11",
          amountBefore: 40,
          amountAfter: null,
        },
      ],
      keptConstraints: [],
      brokenConstraints: [],
      budgetState: "within_budget",
      adjustmentOptions: [],
      warnings: [],
    };
    const viewWithMissingRoundAmount: PlannerViewModel = {
      ...model,
      steps: model.steps.map((step) =>
        step.sequence === 3 ? { ...step, amount: null } : step,
      ),
    };

    const comparison = presentPlannerScenarioComparison(
      sourceResponse,
      viewWithMissingRoundAmount,
      option,
    );
    expect(comparison.reason).toBe(
      "서버가 전달한 변경 조건으로 남은 계획을 다시 계산했습니다.",
    );
    expect(comparison.rows).toContainEqual({
      label: "회차 예산",
      before: "200,000원",
      after: "제공되지 않음",
    });
    expect(comparison.alternativeCurve).not.toBeNull();

    const unsafeResponse: PlannerScenarioPreviewResponse = {
      ...sourceResponse,
      before: {
        ...sourceResponse.before,
        remainingAmount: Number.NaN,
        targetDate: undefined as unknown as string,
        openRounds: Number.NaN,
        roundBudgetKrw: Number.NaN,
        costRange: {
          lowKrw: Number.NaN,
          baseKrw: Number.NaN,
          highKrw: Number.NaN,
        },
      },
      warnings: ["BUDGET_SHORTFALL", "FUTURE_WARNING"],
    };
    const safeComparison = presentPlannerScenarioComparison(
      unsafeResponse,
      viewWithMissingRoundAmount,
      option,
    );
    expect(safeComparison.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "남은 목표 금액",
          before: "제공되지 않음",
        }),
        expect.objectContaining({
          label: "목표일",
          before: "제공되지 않음",
        }),
        expect.objectContaining({
          label: "남은 회차",
          before: "제공되지 않음",
        }),
        expect.objectContaining({
          label: "회차 예산",
          before: "제공되지 않음",
        }),
        expect.objectContaining({
          label: "예상 원화 비용",
          before: "제공되지 않음",
        }),
      ]),
    );
    expect(safeComparison.warnings).toEqual([
      "예산이 계획 비용에 미치지 못합니다",
      "추가 확인이 필요한 변경 조건이 있습니다",
    ]);
    expect(JSON.stringify(safeComparison)).not.toContain("BUDGET_SHORTFALL");
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

    expect(
      presentPlannerSkipComparison({ ...response, seq: 0 }, model, option).reason,
    ).toBe(
      "선택한 회차를 건너뛴 조건으로 서버가 남은 금액의 재분배 영향을 계산했습니다.",
    );
  });

  it("지원하지 않는 공급처 동작은 서버 호출 없이 false를 반환한다", async () => {
    await expect(rejectUnsupportedPlannerOperation()).resolves.toBe(false);
  });
});
