import { useEffect, useRef, useState } from "react";
import type { DataSourceKind } from "../../types/data-source";
import type {
  PlannerCurveViewModel,
  PlannerScenarioComparisonViewModel,
  PlannerScenarioOptionViewModel,
} from "./planner-api-types";
import { PlannerCurveCanvas } from "./planner-journey-curve";

interface PlannerScenarioModalProps {
  readonly sourceKind: DataSourceKind;
  readonly baseCurve: PlannerCurveViewModel;
  readonly options: readonly PlannerScenarioOptionViewModel[];
  readonly comparison: PlannerScenarioComparisonViewModel | null;
  readonly selectedOptionId: string | null;
  readonly isPending: boolean;
  readonly returnFocus: HTMLElement | null;
  readonly onSelect: (
    option: PlannerScenarioOptionViewModel,
    newBudgetKrw?: number,
  ) => void;
  readonly onClear: () => void;
  readonly onClose: () => void;
  readonly onApply: () => void;
}

function focusableElements(container: HTMLElement): readonly HTMLElement[] {
  return [
    ...container.querySelectorAll<HTMLElement>(
      'button:not(:disabled):not([tabindex="-1"]), input:not(:disabled)',
    ),
  ];
}

export function PlannerScenarioModal({
  sourceKind,
  baseCurve,
  options,
  comparison,
  selectedOptionId,
  isPending,
  returnFocus,
  onSelect,
  onClear,
  onClose,
  onApply,
}: PlannerScenarioModalProps) {
  const [budget, setBudget] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const selectedOption = options.find(
    (option) => option.id === (pendingOptionId ?? selectedOptionId),
  );
  const comparisonCurve = comparison?.baseCurve ?? baseCurve;

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableElements(dialogRef.current!);
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      returnFocus?.focus();
    };
  }, [returnFocus]);

  const handleSelect = (option: PlannerScenarioOptionViewModel) => {
    setBudgetError("");
    setPendingOptionId(option.id);
    if (option.isCurrent) {
      setPendingOptionId(null);
      onClear();
      return;
    }
    if (!option.requiresBudget || sourceKind === "demo") {
      setPendingOptionId(null);
      onSelect(option);
    }
  };

  const handleBudgetPreview = (option: PlannerScenarioOptionViewModel) => {
    const newBudgetKrw = Number(budget);
    if (!Number.isFinite(newBudgetKrw) || newBudgetKrw <= 0) {
      setBudgetError("새 예산은 0보다 큰 금액으로 입력해 주세요.");
      return;
    }
    setBudgetError("");
    setPendingOptionId(null);
    onSelect(option, newBudgetKrw);
  };

  const handleKeepCurrent = () => {
    onClear();
    onClose();
  };
  return (
    <div
      ref={dialogRef}
      className="planner-scenario-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="planner-scenario-modal-title"
    >
      <button
        type="button"
        tabIndex={-1}
        className="planner-scenario-modal__backdrop"
        aria-label="상황 비교 닫기"
        onClick={onClose}
      />
      <section className="planner-scenario-modal__sheet">
        <header className="planner-scenario-modal__header">
          <div>
            <p className="planner-api-journey__eyebrow">상황 변경 비교</p>
            <h2 id="planner-scenario-modal-title">어떤 변화가 생겼나요?</h2>
            <p>미리보기만으로 현재 계획은 바뀌지 않습니다.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="planner-scenario-modal__close"
            aria-label="상황 비교 닫기"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="planner-api-scenario__options" role="list">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={
                option.isCurrent
                  ? comparison === null
                  : option.id === selectedOptionId
              }
              disabled={isPending}
              onClick={() => handleSelect(option)}
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>

        {selectedOption?.requiresBudget === true &&
          sourceKind !== "demo" &&
          comparison?.id !== selectedOption.id && (
            <div className="planner-api-scenario__budget">
              <label htmlFor="planner-new-budget">새 회차 예산(원)</label>
              <input
                id="planner-new-budget"
                inputMode="numeric"
                value={budget}
                aria-invalid={Boolean(budgetError)}
                disabled={isPending}
                onChange={(event) => setBudget(event.target.value)}
              />
              {budgetError && <p role="alert">{budgetError}</p>}
              <button
                type="button"
                className="planner-api-journey__primary"
                disabled={isPending}
                onClick={() => handleBudgetPreview(selectedOption)}
              >
                새 예산으로 비교
              </button>
            </div>
          )}

        {isPending && <p role="status">변경 경로를 확인하는 중…</p>}

        {comparison !== null && (
          <section
            className="planner-scenario-modal__comparison"
            aria-labelledby="planner-scenario-comparison-title"
          >
            <div className="planner-scenario-modal__curve">
              <p className="planner-scenario-modal__range">
                <span>확대 비교 구간</span>
                <strong>
                  {comparisonCurve.xStartLabel !== null &&
                  comparisonCurve.xEndLabel !== null
                    ? `${comparisonCurve.xStartLabel} ~ ${comparisonCurve.xEndLabel}`
                    : "서버가 제공한 회차 날짜 범위"}
                </strong>
              </p>
              <div className="planner-main__legend" aria-label="비교 Curve 범례">
                <span data-line="planned">기존 계획</span>
                <span data-line="alternative">변경안</span>
              </div>
              <div className="planner-api-curve planner-api-curve--comparison">
                <PlannerCurveCanvas
                  curve={comparisonCurve}
                  alternativeCurve={comparison.alternativeCurve}
                  changedNodeIds={comparison.changedNodeIds}
                />
              </div>
            </div>
            {comparison.alternativeCurve === null && (
              <p className="planner-api__notice">
                외화 누적 경로를 바꿀 날짜·금액이 응답에 없어 Curve를 갈라 표시하지 않습니다. 조건 차이를 확인해 주세요.
              </p>
            )}
            <div className="planner-scenario-modal__reason">
              <p className="planner-api-journey__eyebrow">왜 여기서 달라지나요?</p>
              <h3 id="planner-scenario-comparison-title">{comparison.reason}</h3>
              <p>{comparison.nextAction}</p>
            </div>
            <dl className="planner-api-scenario__rows">
              {comparison.rows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>
                    <span>기존 {row.before}</span>
                    <strong>
                      {row.before === row.after
                        ? "변경 없음"
                        : `변경 ${row.after}`}
                    </strong>
                  </dd>
                </div>
              ))}
            </dl>
            {comparison.warnings.length > 0 && (
              <ul className="planner-api-scenario__warnings">
                {comparison.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
            <p className="planner-api__notice">
              최종 버튼을 누르기 전까지 현재 활성 계획은 유지됩니다.
            </p>
            <div className="planner-scenario-modal__actions">
              <button
                type="button"
                className="planner-api-journey__secondary"
                disabled={isPending}
                onClick={onClear}
              >
                다른 상황 비교
              </button>
              <button
                type="button"
                className="planner-api-journey__secondary"
                disabled={isPending}
                onClick={handleKeepCurrent}
              >
                기존 계획 유지
              </button>
              {comparison.canRequestDraft === true ? (
                <button
                  type="button"
                  className="planner-api-journey__primary"
                  disabled={isPending || selectedOption === undefined}
                  onClick={() => onSelect(selectedOption!)}
                >
                  {isPending ? "변경안을 확인하는 중…" : "적용 가능한 변경안 비교"}
                </button>
              ) : (
                <button
                  type="button"
                  className="planner-api-journey__primary"
                  disabled={isPending || comparison.draftPlanId === null}
                  onClick={onApply}
                >
                  {isPending
                    ? "적용하는 중…"
                    : sourceKind === "demo"
                      ? "데모에 적용"
                      : "변경안 적용"}
                </button>
              )}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
