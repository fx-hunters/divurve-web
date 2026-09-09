import { useState } from "react";
import {
  DEADLINE_PURPOSES,
  INITIAL_PLANNER_GOAL_DRAFT,
  validatePlannerGoalDraft,
  type PlannerGoalDraft,
  type PlannerGoalInput,
} from "./planner-goal-input";

interface PlannerGoalFormProps {
  readonly sourceLabel: string;
  readonly canCreateRecurring: boolean;
  readonly isPending: boolean;
  readonly today: string;
  readonly onSubmit: (input: PlannerGoalInput) => Promise<boolean>;
  readonly onCancel: () => void;
}

export function PlannerGoalForm({
  sourceLabel,
  canCreateRecurring,
  isPending,
  today,
  onSubmit,
  onCancel,
}: PlannerGoalFormProps) {
  const [draft, setDraft] = useState<PlannerGoalDraft>(INITIAL_PLANNER_GOAL_DRAFT);
  const [error, setError] = useState("");

  const update = <Key extends keyof PlannerGoalDraft>(
    key: Key,
    value: PlannerGoalDraft[Key],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPending) return;
    const validation = validatePlannerGoalDraft(
      draft,
      today,
      canCreateRecurring,
    );
    if (!validation.isValid) {
      setError(validation.message);
      return;
    }
    setError("");
    await onSubmit(validation.value);
  };

  return (
    <section className="planner-goal-form" aria-labelledby="planner-goal-form-title">
      <div>
        <p className="planner-api-journey__eyebrow">새 목표</p>
        <h2 id="planner-goal-form-title">어떤 외화를 언제까지 준비할까요?</h2>
        <p className="planner-api-journey__lead">
          {sourceLabel}에 목표 조건을 저장합니다. 계획은 미리보기를 확인한 뒤 별도로 만듭니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <fieldset className="planner-goal-form__kind">
          <legend>목표 방식</legend>
          <label>
            <input
              type="radio"
              name="planner-goal-kind"
              checked={draft.kind === "deadline"}
              onChange={() => update("kind", "deadline")}
            />
            <span><strong>마감형</strong><small>여행·학비·해외 결제처럼 날짜가 있는 목표</small></span>
          </label>
          <label aria-disabled={!canCreateRecurring}>
            <input
              type="radio"
              name="planner-goal-kind"
              checked={draft.kind === "recurring"}
              disabled={!canCreateRecurring}
              onChange={() => update("kind", "recurring")}
            />
            <span><strong>반복형</strong><small>{canCreateRecurring ? "정기적으로 외화를 준비하는 목표" : "서버 저장 계약 준비 중"}</small></span>
          </label>
        </fieldset>

        <div className="planner-goal-form__grid">
          <label>
            목표 이름 또는 목적
            <input value={draft.name} disabled={isPending} onChange={(event) => update("name", event.target.value)} />
          </label>
          <label>
            목표 통화
            <select value={draft.currencyCode} disabled={isPending} onChange={(event) => update("currencyCode", event.target.value as PlannerGoalDraft["currencyCode"])}>
              <option value="USD">USD · 미국 달러</option>
              <option value="JPY">JPY · 일본 엔</option>
              <option value="EUR">EUR · 유로</option>
            </select>
          </label>
          {draft.kind === "deadline" && (
            <label>
              사용 목적
              <select value={draft.purpose} disabled={isPending} onChange={(event) => update("purpose", event.target.value as PlannerGoalDraft["purpose"])}>
                {DEADLINE_PURPOSES.map((purpose) => <option key={purpose.value} value={purpose.value}>{purpose.label}</option>)}
              </select>
            </label>
          )}
          <label>
            목표 외화 금액
            <input inputMode="decimal" value={draft.targetAmount} disabled={isPending} onChange={(event) => update("targetAmount", event.target.value)} />
          </label>
          <label>
            {draft.kind === "deadline" ? "목표 날짜" : "첫 점검 종료일"}
            <input type="date" min={today} value={draft.targetDate} disabled={isPending} onChange={(event) => update("targetDate", event.target.value)} />
          </label>
          <label>
            준비 주기
            <select value={draft.recurInterval} disabled={isPending} onChange={(event) => update("recurInterval", event.target.value as PlannerGoalDraft["recurInterval"])}>
              <option value="weekly">매주</option>
              <option value="biweekly">격주</option>
              <option value="monthly">매월</option>
            </select>
          </label>
          <label>
            {draft.kind === "recurring" ? "회차별 사용 가능 금액(원)" : "월 사용 가능 금액(원) · 선택"}
            <input inputMode="numeric" value={draft.budgetAmount} disabled={isPending} onChange={(event) => update("budgetAmount", event.target.value)} />
          </label>
        </div>

        {!canCreateRecurring && (
          <p className="planner-goal-form__contract-note">
            반복형 목표는 데모에서 먼저 체험할 수 있어요. 내 계정에는 현재 지원되는 마감형 목표만 저장할 수 있습니다.
          </p>
        )}
        {error && <p className="planner-goal-form__error" role="alert">{error}</p>}
        <div className="planner-api-journey__buttons">
          <button type="button" className="planner-api-journey__secondary" disabled={isPending} onClick={onCancel}>취소</button>
          <button type="submit" className="planner-api-journey__primary" disabled={isPending}>{isPending ? "목표를 저장하는 중…" : sourceLabel === "데모" ? "데모 목표 추가" : "새 목표 만들기"}</button>
        </div>
      </form>
    </section>
  );
}
