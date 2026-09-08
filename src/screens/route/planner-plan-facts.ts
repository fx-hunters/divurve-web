/**
 * 활성 계획 요약 설명(`surface: planner_plan_summary`)에 넘길 근거 수치.
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

  // `safe_ratio`·`split_count` 는 백엔드 `PlanResponse` 에 없는 값이라 늘 undefined
  // 로 실려 두 키가 조용히 사라졌다(점검 리포트 H2). 서버가 실제로 주는
  // `summary` 값으로 바꾼다.
  return {
    plan_version: plan.version,
    plan_status: plan.status,
    total_rounds: plan.totalRounds,
    completed_rounds: plan.completedRounds,
    skipped_rounds: plan.skippedRounds,
    next_action_seq: plan.nextActionSeq,
    currency_code: selectedGoal.currencyCode,
    target_amount: selectedGoal.targetAmount,
    held_amount: selectedGoal.heldAmount,
    target_date: selectedGoal.targetDate,
  };
}
