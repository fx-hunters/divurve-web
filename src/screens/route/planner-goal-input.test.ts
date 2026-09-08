import { describe, expect, it } from "vitest";
import {
  INITIAL_PLANNER_GOAL_DRAFT,
  toPlannerGoalCreateRequest,
  validatePlannerGoalDraft,
} from "./planner-goal-input";

const validDraft = {
  ...INITIAL_PLANNER_GOAL_DRAFT,
  name: "일본 여행",
  targetAmount: "180000",
  targetDate: "2027-03-01",
};

describe("planner goal input", () => {
  it("마감형 입력을 현재 GoalCreateRequest로 변환한다", () => {
    const result = validatePlannerGoalDraft(validDraft, "2026-09-08", false);
    expect(result).toEqual({
      isValid: true,
      value: {
        name: "일본 여행",
        kind: "deadline",
        purpose: "TRAVEL",
        currencyCode: "USD",
        targetAmount: 180000,
        targetDate: "2027-03-01",
        recurInterval: "monthly",
        budgetAmount: 0,
        budgetPeriod: null,
      },
    });
    if (result.isValid) {
      expect(toPlannerGoalCreateRequest(result.value)).toMatchObject({
        budgetCurrencyCode: "KRW",
        isSpeculative: false,
      });
    }
  });

  it("이름·금액·날짜·예산 경계를 검증한다", () => {
    expect(validatePlannerGoalDraft({ ...validDraft, name: " " }, "2026-09-08", true)).toMatchObject({ field: "name" });
    expect(validatePlannerGoalDraft({ ...validDraft, targetAmount: "0" }, "2026-09-08", true)).toMatchObject({ field: "targetAmount" });
    expect(validatePlannerGoalDraft({ ...validDraft, targetDate: "2026-09-07" }, "2026-09-08", true)).toMatchObject({ field: "targetDate" });
    expect(validatePlannerGoalDraft({ ...validDraft, budgetAmount: "invalid" }, "2026-09-08", true)).toMatchObject({ field: "budgetAmount" });
  });

  it("반복형은 지원 여부와 회차 예산을 검증하고 목적 코드를 고정한다", () => {
    const recurring = { ...validDraft, kind: "recurring" as const };
    expect(validatePlannerGoalDraft(recurring, "2026-09-08", false)).toMatchObject({ field: "kind" });
    expect(validatePlannerGoalDraft(recurring, "2026-09-08", true)).toMatchObject({ field: "budgetAmount" });
    expect(
      validatePlannerGoalDraft(
        { ...recurring, budgetAmount: "300000" },
        "2026-09-08",
        true,
      ),
    ).toMatchObject({
      isValid: true,
      value: { purpose: "STOCK_ACCUMULATION", budgetPeriod: "monthly" },
    });
  });
});
