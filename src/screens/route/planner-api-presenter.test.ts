import { describe, expect, it } from "vitest";
import type { PlannerApiOverview } from "../../api/planner";
import { presentPlannerOverview } from "./planner-api-presenter";
import { validateExecutedStepInput } from "./planner-api-types";

function overview(): PlannerApiOverview {
  return {
    items: [
      {
        goal: {
          id: "first", name: "첫 목표", kind: "deadline", purpose: "travel",
          currencyCode: "USD", targetAmount: 100, targetDate: "2026-12-31",
          isSpeculative: false, status: "active", heldAmount: 25,
        },
        activePlan: {
          id: "plan", goalId: "first", version: 3, isActive: true,
          reason: "서버 사유", safeRatio: 0.6, splitCount: 4,
          opportunityAmount: 0, opportunityTriggerRate: 0,
          steps: [
            { seq: 1, scheduledDate: "2026-01-01", amount: 10, krwEstimate: 0, status: "completed", executedAmount: 10 },
            { seq: 2, scheduledDate: "2026-02-01", amount: 20, krwEstimate: 0, status: "skipped" },
            { seq: 3, scheduledDate: "2026-03-01", amount: 30, krwEstimate: 0, status: "pending" },
            { seq: 4, scheduledDate: "2026-04-01", amount: 40, krwEstimate: 0, status: "pending" },
          ],
        },
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

describe("presentPlannerOverview", () => {
  it("0개 목표에는 빈 서버 ViewModel을 만들고, 선택되지 않으면 첫 목표를 고른다", () => {
    expect(presentPlannerOverview({ items: [] })).toMatchObject({
      goalItems: [], selectedGoal: null, plan: null, curve: null,
      nextAction: null, dataSource: { kind: "server" },
      supportedActions: { canCompleteStep: false, canSkipStep: false },
    });
    expect(presentPlannerOverview(overview()).selectedGoal?.id).toBe("first");
  });

  it("선택된 목표의 서버 값과 계획 요약만 표시한다", () => {
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
    expect(model.plan).toMatchObject({
      id: "plan", version: 3, reason: "서버 사유", safeRatio: 0.6, splitCount: 4,
    });
    expect(model.nextAction).toMatchObject({ planId: "plan", sequence: 3, amount: 30 });
    expect(JSON.stringify(model)).not.toContain("achieveProb");
  });

  it("목표 전환과 활성 계획 없음 상태를 표현한다", () => {
    const model = presentPlannerOverview(overview(), "second");
    expect(model.goalItems[1]?.isSelected).toBe(true);
    expect(model.selectedGoal).toMatchObject({
      id: "second", progressPercent: 100, targetDate: null, targetDateLabel: "미설정",
    });
    expect(model.plan).toBeNull();
    expect(model.steps).toEqual([]);
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

  it("단계 순서와 상태만으로 안정적인 노드 좌표와 상태를 만든다", () => {
    const model = presentPlannerOverview(overview());
    expect(model.steps.map((step) => step.status)).toEqual(["completed", "skipped", "next", "upcoming"]);
    expect(model.curveNodes.map((node) => node.status)).toEqual(["completed", "skipped", "next", "upcoming"]);
    expect(model.curveNodes.map((node) => node.x)).toEqual([20, 40, 60, 80]);
    expect(model.curveNodes.map((node) => node.y)).toEqual([70, 30, 30, 30]);
    expect(model.curveNodes.map((node) => node.roundLabel)).toEqual(["1회차", "2회차", "3회차", "4회차"]);
    expect(model.steps.map((step) => step.statusLabel)).toEqual(["완료", "건너뜀", "다음 회차", "예정"]);
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

  it("비활성 계획은 계획 정보만 표시하고 회차 행동을 열지 않는다", () => {
    const firstItem = overview().items[0]!;
    const inactive: PlannerApiOverview = {
      items: [{ ...firstItem, activePlan: { ...firstItem.activePlan!, isActive: false } }],
    };
    const model = presentPlannerOverview(inactive);
    expect(model.plan?.isActive).toBe(false);
    expect(model.steps.map((step) => step.status)).toEqual(["completed", "skipped", "upcoming", "upcoming"]);
    expect(model.nextAction).toBeNull();
    expect(model.supportedActions).toEqual({ canCompleteStep: false, canSkipStep: false });
    expect(model.unsupportedAreas).toEqual(["목표 및 계획 생성·재계산", "대체 시나리오"]);
  });
});
