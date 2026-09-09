import { useState } from "react";
import {
  DEADLINE_PURPOSES,
  INITIAL_PLANNER_GOAL_DRAFT,
  validatePlannerGoalDraft,
  type PlannerGoalDraft,
  type PlannerGoalInput,
} from "./planner-goal-input";
import type { PlannerPlanSummaryViewModel } from "./planner-api-types";

interface PlannerGoalFormProps {
  readonly sourceLabel: string;
  readonly canCreateRecurring: boolean;
  readonly isPending: boolean;
  readonly today: string;
  readonly onSubmit: (input: PlannerGoalInput) => Promise<boolean>;
  readonly onCancel: () => void;
  /** 저장 전에 조건만으로 계획을 계산한다. 마감형에서만 쓸 수 있다. */
  readonly onPreview?: (input: PlannerGoalInput) => Promise<boolean>;
  /** 계산된 미리보기. 아직 저장되지 않은 계획이다. */
  readonly preview?: PlannerPlanSummaryViewModel | null;
}

export function PlannerGoalForm({
  sourceLabel,
  canCreateRecurring,
  isPending,
  today,
  onSubmit,
  onCancel,
  onPreview,
  preview = null,
}: PlannerGoalFormProps) {
  const [draft, setDraft] = useState<PlannerGoalDraft>(INITIAL_PLANNER_GOAL_DRAFT);
  const [error, setError] = useState("");

  const update = <Key extends keyof PlannerGoalDraft>(
    key: Key,
    value: PlannerGoalDraft[Key],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  /** 저장과 미리보기가 같은 조건을 쓰도록 검증을 한곳에 둔다. */
  const validated = (): PlannerGoalInput | null => {
    const validation = validatePlannerGoalDraft(
      draft,
      today,
      canCreateRecurring,
    );
    if (!validation.isValid) {
      setError(validation.message);
      return null;
    }
    setError("");
    return validation.value;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPending) return;
    const input = validated();
    if (input !== null) await onSubmit(input);
  };

  // 제출과 달리 여기엔 진행 중 가드가 없다 — 버튼이 비활성이라 도달할 수 없고,
  // Enter 제출 같은 다른 경로도 없다.
  const handlePreview = async (
    preview: NonNullable<PlannerGoalFormProps["onPreview"]>,
  ) => {
    const input = validated();
    if (input !== null) await preview(input);
  };

  return (
    <section className="planner-goal-form" aria-labelledby="planner-goal-form-title">
      <div>
        <p className="planner-api-journey__eyebrow">새 목표</p>
        <h2 id="planner-goal-form-title">어떤 외화를 언제까지 준비할까요?</h2>
        <p className="planner-api-journey__lead">
          {sourceLabel === "데모"
            ? "입력한 목표는 현재 데모 화면에서만 확인할 수 있습니다. 새 목표의 계획은 만들지 않으며, Curve와 기록은 준비된 두 예시 목표에서 체험할 수 있습니다."
            : `${sourceLabel}에 목표 조건을 저장합니다. 계획은 미리보기를 확인한 뒤 별도로 만듭니다.`}
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
        {preview !== null && (
          <section className="planner-goal-form__preview" aria-label="저장 전 계획 미리보기">
            <p className="planner-api-journey__eyebrow">저장 전 미리보기</p>
            <dl>
              <div><dt>계획 종료일</dt><dd>{preview.planEndDateLabel}</dd></div>
              <div><dt>전체 회차</dt><dd>{preview.totalRounds}회</dd></div>
              <div><dt>비용 범위</dt><dd>{preview.estimatedCostLabel ?? "서버 응답에 없음"}</dd></div>
              {preview.budgetStateLabel !== null && (
                <div><dt>예산 상태</dt><dd>{preview.budgetStateLabel}</dd></div>
              )}
            </dl>
            {preview.warnings.length > 0 && (
              <ul aria-label="미리보기 경고">
                {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            )}
            <p className="planner-api__notice">{preview.disclaimer}</p>
          </section>
        )}
        <div className="planner-api-journey__buttons">
          <button type="button" className="planner-api-journey__secondary" disabled={isPending} onClick={onCancel}>취소</button>
          {onPreview !== undefined && draft.kind === "deadline" && (
            <button type="button" className="planner-api-journey__secondary" disabled={isPending} onClick={() => void handlePreview(onPreview)}>
              {isPending ? "계산하는 중…" : "저장 전에 계획 보기"}
            </button>
          )}
          <button type="submit" className="planner-api-journey__primary" disabled={isPending}>{isPending ? "목표를 저장하는 중…" : sourceLabel === "데모" ? "데모 목표 추가" : "새 목표 만들기"}</button>
        </div>
      </form>
    </section>
  );
}
