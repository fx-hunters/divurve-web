import { useState, type RefObject } from "react";
import type { DataSourceKind } from "../../types/data-source";
import {
  validateExecutedStepInput,
  type PlannerNextActionViewModel,
} from "./planner-api-types";

interface PlannerJourneyActionProps {
  readonly action: PlannerNextActionViewModel;
  readonly sourceKind: DataSourceKind;
  readonly isPending: boolean;
  readonly canComplete: boolean;
  readonly canSkip: boolean;
  readonly canExplore: boolean;
  readonly onComplete: (amount: number, rate: number) => void;
  readonly onRecordDemo: () => void;
  readonly onSkip: () => void;
  readonly onExplore: () => void;
  readonly onDetail: () => void;
  readonly detailButtonRef: RefObject<HTMLButtonElement>;
  readonly scenarioButtonRef: RefObject<HTMLButtonElement>;
}

export function PlannerJourneyAction({
  action,
  sourceKind,
  isPending,
  canComplete,
  canSkip,
  canExplore,
  onComplete,
  onRecordDemo,
  onSkip,
  onExplore,
  onDetail,
  detailButtonRef,
  scenarioButtonRef,
}: PlannerJourneyActionProps) {
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [error, setError] = useState("");
  const isDemo = sourceKind === "demo";

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateExecutedStepInput({
      executedAmount: Number(amount),
      executedRate: Number(rate),
    });
    if (!validation.isValid) {
      setError(validation.message);
      return;
    }
    setError("");
    onComplete(validation.value.executedAmount, validation.value.executedRate);
  };

  return (
    <section
      className="planner-main-action"
      aria-labelledby="planner-api-action-question"
    >
      <p className="planner-api-journey__eyebrow">다음 행동</p>
      <h2 id="planner-api-action-question">
        {action.title ?? `${action.sequence}회차를 확인할까요?`}
      </h2>
      <p className="planner-api-journey__lead">
        {action.scheduledDate} · {action.amountLabel}
      </p>
      {action.description !== undefined && (
        <p className="planner-api-action__description">{action.description}</p>
      )}

      {isDemo ? (
        <button
          className="planner-api-journey__primary"
          type="button"
          disabled={isPending || !canComplete}
          onClick={onRecordDemo}
        >
          이번 회차 데모 기록
        </button>
      ) : (
        <form className="planner-api-action" onSubmit={handleSubmit} noValidate>
          <label>
            실행 외화 금액
            <input
              aria-invalid={Boolean(error)}
              disabled={isPending || !canComplete}
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <label>
            실행 환율
            <input
              aria-invalid={Boolean(error)}
              disabled={isPending || !canComplete}
              inputMode="decimal"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
            />
          </label>
          {error && (
            <p className="planner-api-action__error" role="alert">
              {error}
            </p>
          )}
          <button
            className="planner-api-journey__primary"
            type="submit"
            disabled={isPending || !canComplete}
          >
            {isPending ? "서버에 반영 중…" : "이번 회차 기록"}
          </button>
        </form>
      )}

      <div className="planner-api-action__secondary-actions">
        {canSkip && (
          <button
            className="planner-api-journey__text-button"
            type="button"
            disabled={isPending}
            onClick={onSkip}
          >
            이번 회차를 놓쳤다면
          </button>
        )}
        {canExplore && (
          <button
            ref={scenarioButtonRef}
            className="planner-api-journey__secondary"
            type="button"
            disabled={isPending}
            onClick={onExplore}
          >
            상황이 바뀐다면?
          </button>
        )}
      </div>
      <div className="planner-api-journey__buttons">
        <button
          ref={detailButtonRef}
          type="button"
          className="planner-api-journey__secondary"
          onClick={onDetail}
        >
          전체 계획 상세 보기
        </button>
      </div>
    </section>
  );
}
