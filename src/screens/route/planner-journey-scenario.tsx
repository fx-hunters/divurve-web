import { useState } from "react";
import type { DataSourceKind } from "../../types/data-source";
import type {
  PlannerCurveViewModel,
  PlannerScenarioComparisonViewModel,
  PlannerScenarioOptionViewModel,
} from "./planner-api-types";
import { PlannerCurveCanvas } from "./planner-journey-curve";

interface PlannerJourneyScenarioProps {
  readonly sourceKind: DataSourceKind;
  readonly baseCurve: PlannerCurveViewModel;
  readonly options: readonly PlannerScenarioOptionViewModel[];
  readonly comparison: PlannerScenarioComparisonViewModel | null;
  readonly selectedOptionId: string | null;
  readonly isPending: boolean;
  readonly onSelect: (
    option: PlannerScenarioOptionViewModel,
    newBudgetKrw?: number,
  ) => void;
  readonly onClear: () => void;
  readonly onContinue: () => void;
  readonly onBack: () => void;
}

export function PlannerJourneyScenario({
  sourceKind,
  baseCurve,
  options,
  comparison,
  selectedOptionId,
  isPending,
  onSelect,
  onClear,
  onContinue,
  onBack,
}: PlannerJourneyScenarioProps) {
  const [budget, setBudget] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);
  const selectedOption = options.find(
    (option) => option.id === (pendingOptionId ?? selectedOptionId),
  );

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
  const handleBudgetPreview = () => {
    if (selectedOption === undefined) return;
    const newBudgetKrw = Number(budget);
    if (!Number.isFinite(newBudgetKrw) || newBudgetKrw <= 0) {
      setBudgetError("새 예산은 0보다 큰 금액으로 입력해 주세요.");
      return;
    }
    setBudgetError("");
    setPendingOptionId(null);
    onSelect(selectedOption, newBudgetKrw);
  };

  return (
    <section
      className="planner-api-journey__scene planner-api-journey__scene--curve"
      aria-labelledby="planner-api-scenario-title"
    >
      <p className="planner-api-journey__eyebrow">상황 변경 비교</p>
      <h2 id="planner-api-scenario-title">상황이 달라지면 경로를 비교해 보세요</h2>
      <p className="planner-api-journey__lead">
        선택만으로 현재 계획이 바뀌지 않습니다. 변경 전후를 확인한 뒤 직접
        적용해야 합니다.
      </p>
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
              onClick={handleBudgetPreview}
            >
              새 예산으로 비교
            </button>
          </div>
        )}

      {isPending && <p role="status">대체 계획을 확인하는 중…</p>}
      {comparison !== null && (
        <div className="planner-api-scenario__comparison">
          <div className="planner-api-curve planner-api-curve--comparison">
            <PlannerCurveCanvas
              curve={baseCurve}
              alternativeCurve={comparison.alternativeCurve}
              changedNodeIds={comparison.changedNodeIds}
            />
          </div>
          <div>
            <h3>{comparison.label}</h3>
            <p>{comparison.reason}</p>
          </div>
          <dl className="planner-api-scenario__rows">
            {comparison.rows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>
                  <span>변경 전 {row.before}</span>
                  <strong>변경 후 {row.after}</strong>
                </dd>
              </div>
            ))}
          </dl>
          <p className="planner-api-scenario__next">{comparison.nextAction}</p>
          {comparison.warnings.length > 0 && (
            <ul className="planner-api-scenario__warnings">
              {comparison.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="planner-api-journey__primary"
            onClick={onContinue}
          >
            변경 내용 확인
          </button>
        </div>
      )}
      <button
        type="button"
        className="planner-api-journey__secondary"
        disabled={isPending}
        onClick={onBack}
      >
        다음 행동으로 돌아가기
      </button>
    </section>
  );
}
