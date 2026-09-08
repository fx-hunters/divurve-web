import { describe, expect, it } from "vitest";
import type { PlanResponse } from "../../api/generated/divurve-api";
import type { PlannerApiOverview } from "../../api/planner";
import { PLAN_DISCLAIMER } from "../../test/api-fixtures";
import { presentPlannerOverview } from "./planner-api-presenter";
import { validateExecutedStepInput } from "./planner-api-types";

/**
 * 백엔드 `PlanResponse`(플래너 명세 §11) 그대로의 계획. 저장된 계획이라
 * `planId`·`version` 이 있고 `warnings` 는 빈 배열이다.
 */
function plan(): PlanResponse {
  return {
    planId: "plan",
    goalId: "first",
    version: 3,
    calculationMeta: {
      calculatedAt: "2026-09-08T04:34:58Z",
      rateAsOf: "2026-09-08T00:00:00Z",
      forecastAsOf: "2026-09-08T00:00:00Z",
      policyVersion: "plan-2026.09.1-equal-split",
      currencyCode: "USD",
      quoteUnit: 1,
      rates: { low: 1_313.22, base: 1_342.6, high: 1_372.63 },
      spreadRatio: 0.009625,
      feeKrw: 10_000,
    },
    goal: {
      goalType: "deadline",
      purpose: "travel",
      currencyCode: "USD",
      targetAmount: 100,
      allocatedHoldingAmount: 25,
      remainingAmount: 75,
      targetDate: "2026-12-31",
    },
    summary: {
      status: "active",
      planEndDate: "2026-12-26",
      totalRounds: 4,
      completedRounds: 1,
      scheduledRounds: 2,
      skippedRounds: 1,
      nextActionSeq: 3,
      estimatedCost: { lowKrw: 98_491, baseKrw: 100_695, highKrw: 102_947 },
      budgetState: "COVERED_IN_RANGE",
    },
    steps: [
      { seq: 1, scheduledDate: "2026-01-01", amount: 10, executedAmount: 10, executedRate: 1_395, executedDate: "2026-01-01", status: "completed", nextAction: false },
      { seq: 2, scheduledDate: "2026-02-01", amount: 20, executedAmount: 0, status: "skipped", nextAction: false },
      { seq: 3, scheduledDate: "2026-03-01", amount: 30, executedAmount: 0, status: "due", nextAction: true },
      { seq: 4, scheduledDate: "2026-04-01", amount: 40, executedAmount: 0, status: "scheduled", nextAction: false },
    ],
    warnings: [],
    disclaimer: PLAN_DISCLAIMER,
  };
}

function overview(): PlannerApiOverview {
  return {
    items: [
      {
        goal: {
          id: "first", name: "첫 목표", kind: "deadline", purpose: "travel",
          currencyCode: "USD", targetAmount: 100, targetDate: "2026-12-31",
          isSpeculative: false, status: "active", heldAmount: 25,
        },
        activePlan: plan(),
      },
      {
        goal: {
          id: "second", name: "둘 목표", kind: "recurring", purpose: "investment",
          currencyCode: "JPY", targetAmount: 10, isSpeculative: false,
          status: "active", heldAmount: 40,
        },
        activePlan: null,
      },
    ],
  };
}

function withPlan(overrides: Partial<PlanResponse>): PlannerApiOverview {
  const first = overview().items[0]!;
  return { items: [{ ...first, activePlan: { ...first.activePlan!, ...overrides } }] };
}

describe("presentPlannerOverview", () => {
  it("0개 목표에는 빈 서버 ViewModel을 만들고, 선택되지 않으면 첫 목표를 고른다", () => {
    expect(presentPlannerOverview({ items: [] })).toMatchObject({
      goalItems: [], selectedGoal: null, plan: null, curve: null,
      nextAction: null, dataSource: { kind: "server" },
      supportedActions: { canCompleteStep: false, canSkipStep: false },
    });
    expect(presentPlannerOverview(overview()).selectedGoal?.id).toBe("first");
  });

  it("계획 요약은 서버 summary 값을 그대로 옮긴다", () => {
    const model = presentPlannerOverview(overview(), "first");
    expect(model.goalItems).toEqual([
      { id: "first", name: "첫 목표", currencyCode: "USD", isSelected: true },
      { id: "second", name: "둘 목표", currencyCode: "JPY", isSelected: false },
    ]);
    expect(model.selectedGoal).toMatchObject({
      id: "first", targetAmount: 100, heldAmount: 25,
      targetDate: "2026-12-31", targetDateLabel: "2026-12-31",
      progressPercent: 25, progressLabel: "외화 확보 진행",
    });
    expect(model.plan).toEqual({
      planId: "plan",
      version: 3,
      versionLabel: "v3",
      status: "active",
      statusLabel: "적용 중",
      totalRounds: 4,
      completedRounds: 1,
      scheduledRounds: 2,
      skippedRounds: 1,
      nextActionSeq: 3,
      planEndDateLabel: "2026-12-26",
      estimatedCostLabel: "98,491 ~ 102,947원 (기준 100,695원)",
      budgetStateLabel: "현재 환율 범위에서 예산으로 감당됩니다",
      warnings: [],
      disclaimer: PLAN_DISCLAIMER,
    });
    // 없는 필드를 포매터에 넣어 NaN을 그리던 자리다(점검 리포트 H2).
    expect(JSON.stringify(model)).not.toContain("NaN");
    expect(JSON.stringify(model)).not.toContain("undefined");
    expect(model.nextAction).toMatchObject({ planId: "plan", sequence: 3, amount: 30 });
    expect(model.unsupportedAreas).toContain("회차 건너뛰기 적용");
  });

  it("서버가 값을 주지 않은 요약 필드는 지어내지 않고 그 사실을 적는다", () => {
    const model = presentPlannerOverview(
      withPlan({
        planId: undefined,
        version: undefined,
        summary: {
          status: "draft",
          totalRounds: 4,
          completedRounds: 0,
          scheduledRounds: 4,
          skippedRounds: 0,
        },
        warnings: ["BUDGET_SHORTFALL", "UNKNOWN_CODE"] as never,
      }),
    );
    expect(model.plan).toMatchObject({
      planId: null,
      version: null,
      versionLabel: "저장 전",
      statusLabel: "계산됨",
      nextActionSeq: null,
      planEndDateLabel: "미설정",
      estimatedCostLabel: "서버 값 없음",
      budgetStateLabel: "서버 값 없음",
      // 모르는 경고 코드는 원문 그대로 노출한다
      warnings: ["예산이 계획 비용에 미치지 못합니다", "UNKNOWN_CODE"],
    });
    // nextActionSeq가 없으면 다음 행동도 없다 — 프론트가 대신 고르지 않는다
    expect(model.nextAction).toBeNull();
    expect(model.supportedActions).toEqual({ canCompleteStep: false, canSkipStep: false });
    expect(model.steps.map((step) => step.status)).toEqual([
      "completed", "skipped", "upcoming", "upcoming",
    ]);
  });

  it("저장 전 계획에는 회차 기록·건너뛰기를 열지 않는다", () => {
    const model = presentPlannerOverview(withPlan({ planId: undefined }));
    expect(model.plan?.nextActionSeq).toBe(3);
    expect(model.nextAction).toBeNull();
    expect(model.supportedActions.canSkipStep).toBe(false);
  });

  it("목표 전환과 활성 계획 없음 상태를 표현한다", () => {
    const model = presentPlannerOverview(overview(), "second");
    expect(model.goalItems[1]?.isSelected).toBe(true);
    expect(model.selectedGoal).toMatchObject({
      id: "second", progressPercent: 100, targetDate: null, targetDateLabel: "미설정",
    });
    expect(model.plan).toBeNull();
    expect(model.steps).toEqual([]);
    expect(model.curve).toBeNull();
    expect(model.nextAction).toBeNull();
  });

  it("알 수 없는 선택 ID는 첫 목표로 안전하게 되돌리고 회차가 없어도 목적지를 표시한다", () => {
    const firstItem = overview().items[0]!;
    const noSteps: PlannerApiOverview = {
      items: [{
        ...firstItem,
        goal: { ...firstItem.goal, targetDate: undefined },
        activePlan: { ...firstItem.activePlan!, steps: [] },
      }],
    };
    const model = presentPlannerOverview(noSteps, "unknown");
    expect(model.selectedGoal).toMatchObject({ id: "first", targetDateLabel: "미설정" });
    expect(model.goalItems[0]?.isSelected).toBe(true);
    expect(model.steps).toEqual([]);
    expect(model.curve).toMatchObject({
      path: "M 100 20",
      destination: { statusLabel: "목표 도착", targetDateLabel: "미설정" },
    });
  });

  it("회차 좌표와 상태는 서버 회차 순서·상태로만 만든다", () => {
    const model = presentPlannerOverview(overview());
    expect(model.steps.map((step) => step.status)).toEqual(["completed", "skipped", "next", "upcoming"]);
    expect(model.curveNodes.map((node) => node.status)).toEqual(["completed", "skipped", "next", "upcoming"]);
    expect(model.curveNodes.map((node) => node.x)).toEqual([20, 40, 60, 80]);
    expect(model.curveNodes.map((node) => node.y)).toEqual([70, 30, 30, 30]);
    expect(model.curveNodes.map((node) => node.roundLabel)).toEqual(["1회차", "2회차", "3회차", "4회차"]);
    // 노드 id는 목표 id로 만든다 — 미리보기 응답에는 planId가 없다
    expect(model.curveNodes.map((node) => node.id)).toEqual([
      "first-1", "first-2", "first-3", "first-4",
    ]);
    expect(model.steps.map((step) => step.statusLabel)).toEqual(["완료", "건너뜀", "다음 회차", "예정"]);
    expect(model.steps.map((step) => step.executedAmount)).toEqual([10, 0, 0, 0]);
    expect(model.curve).toMatchObject({
      path: "M 20 70 L 40 30 L 60 30 L 80 30 L 100 20",
      destination: { status: "destination", targetAmountLabel: "100 USD", targetDateLabel: "2026-12-31" },
    });
  });

  it("진행률은 대상 금액이 없거나 0이면 0이며 항상 0부터 100 사이로 제한한다", () => {
    const firstItem = overview().items[0]!;
    const withGoal = (goal: typeof firstItem.goal): PlannerApiOverview => ({
      items: [{ ...firstItem, goal }],
    });
    expect(presentPlannerOverview(withGoal({ ...firstItem.goal, targetAmount: 0, heldAmount: 20 })).selectedGoal?.progressPercent).toBe(0);
    expect(presentPlannerOverview(withGoal({ ...firstItem.goal, heldAmount: -5 })).selectedGoal?.progressPercent).toBe(0);
    expect(presentPlannerOverview(withGoal({ ...firstItem.goal, heldAmount: Number.NaN })).selectedGoal?.progressPercent).toBe(0);
    expect(presentPlannerOverview(withGoal({ ...firstItem.goal, targetAmount: Number.POSITIVE_INFINITY })).selectedGoal?.progressPercent).toBe(0);
    expect(presentPlannerOverview(overview(), "second").selectedGoal?.progressPercent).toBe(100);
  });

  it("실행 입력은 양의 유한수만 허용한다", () => {
    expect(validateExecutedStepInput({ executedAmount: 1, executedRate: 1400 })).toEqual({ isValid: true, value: { executedAmount: 1, executedRate: 1400 } });
    expect(validateExecutedStepInput({ executedAmount: Number.POSITIVE_INFINITY, executedRate: 1400 })).toMatchObject({ isValid: false });
    expect(validateExecutedStepInput({ executedAmount: 1, executedRate: 0 })).toMatchObject({ isValid: false });
    expect(validateExecutedStepInput({ executedAmount: 1, executedRate: Number.NEGATIVE_INFINITY })).toMatchObject({ isValid: false });
  });

  it("계획 상태·예산 상태 문구는 백엔드 어휘를 모두 덮는다", () => {
    const statusLabels = (["draft", "active", "needs_review", "completed", "paused", "superseded"] as const).map(
      (status) => presentPlannerOverview(withPlan({ summary: { ...plan().summary, status } })).plan?.statusLabel,
    );
    expect(statusLabels).toEqual(["계산됨", "적용 중", "재검토 필요", "완료", "일시 정지", "대체됨"]);

    const budgetLabels = (["COVERED_IN_RANGE", "RANGE_SENSITIVE", "CONSTRAINT_ADJUSTMENT_REQUIRED", "BUDGET_NOT_PROVIDED"] as const).map(
      (budgetState) => presentPlannerOverview(withPlan({ summary: { ...plan().summary, budgetState } })).plan?.budgetStateLabel,
    );
    expect(budgetLabels).toEqual([
      "현재 환율 범위에서 예산으로 감당됩니다",
      "환율 범위에 따라 예산 조정이 필요할 수 있습니다",
      "금액·날짜·예산 중 하나를 조정해야 합니다",
      "예산을 입력하지 않아 가능 여부를 판정하지 않았습니다",
    ]);
  });
});
