/**
 * 목표 조건 수정 장면.
 *
 * 백엔드 `PUT /api/v1/goals/{id}`는 부분 갱신 계약이라 바꾸지 않은 필드는 키
 * 자체를 담지 않는다. 그래서 저장할 때 처음 값과 달라진 항목만 골라 보낸다 —
 * 안 바꾼 값을 현재 값으로 다시 실어 보내면 그사이 다른 경로에서 바뀐 값을
 * 덮어쓴다.
 */
import { useState } from "react";
import type { PlannerGoalUpdateRequest } from "../../api/planner-contract";
import type { PlannerGoalSummaryViewModel } from "./planner-api-types";
import {
  toGoalUpdateRequest,
  validateGoalEditDraft,
  type PlannerGoalEditDraft,
} from "./planner-goal-edit-input";

interface PlannerGoalEditFormProps {
  readonly goal: PlannerGoalSummaryViewModel;
  readonly initial: PlannerGoalEditDraft;
  readonly isPending: boolean;
  readonly today: string;
  readonly onSave: (input: PlannerGoalUpdateRequest) => Promise<boolean>;
  readonly onDelete: () => Promise<boolean>;
  readonly onBack: () => void;
}

export function PlannerGoalEditForm({
  goal,
  initial,
  isPending,
  today,
  onSave,
  onDelete,
  onBack,
}: PlannerGoalEditFormProps) {
  const [draft, setDraft] = useState<PlannerGoalEditDraft>(initial);
  const [error, setError] = useState("");
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const update = <Key extends keyof PlannerGoalEditDraft>(
    key: Key,
    value: PlannerGoalEditDraft[Key],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPending) return;
    const message = validateGoalEditDraft(draft, today);
    if (message !== null) {
      setError(message);
      return;
    }
    const changes = toGoalUpdateRequest(initial, draft);
    if (changes === null) {
      setError("바뀐 값이 없습니다.");
      return;
    }
    setError("");
    await onSave(changes);
  };

  return (
    <section
      className="planner-goal-form"
      aria-labelledby="planner-goal-edit-title"
    >
      <div>
        <p className="planner-api-journey__eyebrow">목표 수정</p>
        <h2 id="planner-goal-edit-title">{goal.name}의 조건을 바꿉니다</h2>
        <p className="planner-api-journey__lead">
          바꾼 항목만 서버에 보냅니다. 조건을 바꿔도 활성 계획은 그대로이며, 새
          조건으로 계획을 다시 만들어야 회차가 바뀝니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="planner-goal-form__grid">
          <label>
            목표 이름 또는 목적
            <input
              value={draft.name}
              disabled={isPending}
              onChange={(event) => update("name", event.target.value)}
            />
          </label>
          <label>
            목표 외화 금액
            <input
              inputMode="decimal"
              value={draft.targetAmount}
              disabled={isPending}
              onChange={(event) => update("targetAmount", event.target.value)}
            />
          </label>
          <label>
            목표 날짜
            <input
              type="date"
              min={today}
              value={draft.targetDate}
              disabled={isPending}
              onChange={(event) => update("targetDate", event.target.value)}
            />
          </label>
          <label>
            월 사용 가능 금액(원)
            <input
              inputMode="numeric"
              value={draft.budgetAmount}
              disabled={isPending}
              onChange={(event) => update("budgetAmount", event.target.value)}
            />
          </label>
        </div>

        {error && (
          <p className="planner-goal-form__error" role="alert">
            {error}
          </p>
        )}

        <div className="planner-api-journey__buttons">
          <button
            type="button"
            className="planner-api-journey__secondary"
            disabled={isPending}
            onClick={onBack}
          >
            현재 상태로
          </button>
          <button
            type="submit"
            className="planner-api-journey__primary"
            disabled={isPending}
          >
            {isPending ? "저장하는 중…" : "바뀐 조건 저장"}
          </button>
        </div>
      </form>

      <div className="planner-goal-form__danger">
        {isDeleteConfirmOpen ? (
          <>
            <p role="alert">
              {goal.name}과 그 계획 기록을 지웁니다. 되돌릴 수 없습니다.
            </p>
            <div className="planner-api-journey__buttons">
              <button
                type="button"
                className="planner-api-journey__secondary"
                disabled={isPending}
                onClick={() => setDeleteConfirmOpen(false)}
              >
                그대로 두기
              </button>
              <button
                type="button"
                className="planner-goal-form__delete"
                disabled={isPending}
                onClick={() => void onDelete()}
              >
                {isPending ? "지우는 중…" : "목표 지우기"}
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="planner-goal-form__delete"
            disabled={isPending}
            onClick={() => setDeleteConfirmOpen(true)}
          >
            이 목표 지우기
          </button>
        )}
      </div>
    </section>
  );
}
