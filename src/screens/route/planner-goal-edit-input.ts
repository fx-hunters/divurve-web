/**
 * 목표 수정 입력의 검증과 요청 변환.
 *
 * 표현에서 떼어 둔다 — 순수 함수라 컴포넌트를 띄우지 않고 규칙만 확인할 수 있다
 * (AGENTS.md §7.6).
 */
import type { PlannerGoalUpdateRequest } from "../../api/planner-contract";

export interface PlannerGoalEditDraft {
  readonly name: string;
  readonly targetAmount: string;
  readonly targetDate: string;
  readonly budgetAmount: string;
}

/**
 * 값이 실제로 달라진 항목만 담는다. 하나도 없으면 null.
 *
 * 백엔드 `PUT /api/v1/goals/{id}`는 부분 갱신 계약이라, 안 바꾼 값을 현재 값으로
 * 다시 실어 보내면 그사이 다른 경로에서 바뀐 값을 덮어쓴다.
 */
export function toGoalUpdateRequest(
  initial: PlannerGoalEditDraft,
  draft: PlannerGoalEditDraft,
): PlannerGoalUpdateRequest | null {
  const changed: {
    name?: string;
    targetAmount?: number;
    targetDate?: string;
    budgetAmount?: number;
  } = {};
  if (draft.name !== initial.name) changed.name = draft.name.trim();
  if (draft.targetAmount !== initial.targetAmount) {
    changed.targetAmount = Number(draft.targetAmount);
  }
  if (draft.targetDate !== initial.targetDate) {
    changed.targetDate = draft.targetDate;
  }
  if (draft.budgetAmount !== initial.budgetAmount) {
    changed.budgetAmount = Number(draft.budgetAmount);
  }
  return Object.keys(changed).length === 0 ? null : changed;
}

/** 규칙을 어긴 첫 항목의 안내 문구. 통과하면 null. */
export function validateGoalEditDraft(
  draft: PlannerGoalEditDraft,
  today: string,
): string | null {
  if (draft.name.trim().length === 0) return "목표 이름을 입력해 주세요.";
  const targetAmount = Number(draft.targetAmount);
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return "목표 외화 금액은 0보다 큰 값으로 입력해 주세요.";
  }
  if (draft.targetDate.length === 0 || draft.targetDate < today) {
    return "오늘 이후의 목표 날짜를 선택해 주세요.";
  }
  const budgetAmount = Number(draft.budgetAmount);
  if (!Number.isFinite(budgetAmount) || budgetAmount < 0) {
    return "사용 가능 금액은 0 이상의 원화 금액으로 입력해 주세요.";
  }
  return null;
}
