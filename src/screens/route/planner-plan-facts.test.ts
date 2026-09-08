import { describe, expect, it } from "vitest";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import { presentPlannerOverview } from "./planner-api-presenter";
import { toPlanSummaryFacts } from "./planner-plan-facts";

describe("toPlanSummaryFacts", () => {
  it("활성 계획과 목표의 서버 값을 그대로 옮긴다", () => {
    const view = presentPlannerOverview(PLANNER_API_FIXTURE, "goal-usd");

    expect(toPlanSummaryFacts(view)).toEqual({
      plan_version: 2,
      plan_status: "active",
      plan_end_date: "2026-12-20",
      total_rounds: 2,
      completed_rounds: 1,
      scheduled_rounds: 1,
      skipped_rounds: 0,
      policy_version: "planner-v1",
      currency_code: "USD",
      target_amount: 3_000,
      held_amount: 1_260,
      target_date: "2026-12-31",
    });
  });

  it("활성 계획이나 선택 목표가 없으면 근거 수치를 만들지 않는다", () => {
    const noPlan = presentPlannerOverview(PLANNER_API_FIXTURE, "goal-jpy");
    expect(noPlan.plan).toBeNull();
    expect(toPlanSummaryFacts(noPlan)).toBeNull();

    const noGoal = presentPlannerOverview({ items: [] });
    expect(toPlanSummaryFacts(noGoal)).toBeNull();
  });
});
