/**
 * 후속 Planner 설명 연결 시 사용할 활성 계획 근거 수치.
 *
 * 전부 서버가 준 값을 그대로 옮기기만 한다 — 프론트에서 계산하지 않는다
 * (AGENTS.md §1). 키 표기가 snake_case인 이유는 `POST /api/v1/ai/explain` 이
 * `facts`를 표기 변환 없이(raw) 보내는 계약이기 때문이다.
 */
import type { ExplanationFacts } from "../../hooks/use-ai-explanation";
import type { PlannerViewModel } from "./planner-api-types";

export function toPlanSummaryFacts(
  view: PlannerViewModel,
): ExplanationFacts | null {
  const { plan, selectedGoal } = view;
  if (plan === null || selectedGoal === null) return null;

  return {
    plan_version: plan.version,
    plan_status: plan.status,
    plan_end_date: plan.planEndDateLabel,
    total_rounds: plan.totalRounds,
    completed_rounds: plan.completedRounds,
    scheduled_rounds: plan.scheduledRounds,
    skipped_rounds: plan.skippedRounds,
    policy_version: plan.policyVersion,
    currency_code: selectedGoal.currencyCode,
    target_amount: selectedGoal.targetAmount,
    held_amount: selectedGoal.heldAmount,
    target_date: selectedGoal.targetDate,
  };
}
