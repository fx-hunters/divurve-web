import { Badge } from "../../components/common/badge";
import type {
  PlannerScenario,
  PlannerScenarioId,
} from "../../types/route";
import type { PlannerActiveState } from "./use-planner-interaction";

interface ScenarioSwitcherProps {
  readonly state: PlannerActiveState;
  readonly onSelect: (scenarioId: PlannerScenarioId) => void;
  readonly onShowAll: () => void;
  readonly onClose: () => void;
  readonly onConfirmApply: () => void;
  readonly onCancelApply: () => void;
}

const PRIMARY_SCENARIO_IDS: readonly PlannerScenarioId[] = [
  "rapidRise",
  "missedRound",
  "reducedBudget",
];

const ALL_SCENARIO_IDS: readonly PlannerScenarioId[] = [
  ...PRIMARY_SCENARIO_IDS,
  "expectedRange",
  "decline",
];

function isScenario(
  scenario: PlannerScenario | undefined,
): scenario is PlannerScenario {
  return scenario !== undefined;
}

export function ScenarioSwitcher({
  state,
  onSelect,
  onShowAll,
  onClose,
  onConfirmApply,
  onCancelApply,
}: ScenarioSwitcherProps) {
  const { plan } = state;
  const selectedScenario = plan.scenarios.find(
    (scenario) => scenario.id === state.selectedScenarioId,
  )!;
  const visibleScenarioIds = state.areAllScenariosVisible
    ? ALL_SCENARIO_IDS
    : PRIMARY_SCENARIO_IDS;
  const visibleScenarios = visibleScenarioIds
    .map((scenarioId) =>
      plan.scenarios.find((scenario) => scenario.id === scenarioId),
    )
    .filter(isScenario);
  const isAlternative =
    state.selectedScenarioId !== state.appliedScenarioId;

  return (
    <section
      id="planner-scenarios"
      className="scenario-switcher"
      aria-labelledby="scenario-switcher-title"
      data-comparison-open={state.isComparisonOpen}
    >
      <div className="scenario-switcher__heading">
        <div>
          <h3 id="scenario-switcher-title">상황이 달라졌다면</h3>
        </div>
        <button
          type="button"
          className="scenario-switcher__close"
          onClick={onClose}
          aria-label="상황별 경로 닫기"
        >
          ×
        </button>
      </div>

      <div
        className="scenario-switcher__options"
        role="group"
        aria-label="상황 선택"
      >
        {visibleScenarios.map((scenario) => {
          const isApplied = scenario.id === state.appliedScenarioId;
          const isSelected = scenario.id === state.selectedScenarioId;

          return (
            <button
              type="button"
              className="scenario-switcher__option"
              data-tone={scenario.tone}
              data-applied={isApplied}
              aria-pressed={isSelected}
              key={scenario.id}
              onClick={() => onSelect(scenario.id)}
            >
              <span>{scenario.label}</span>
              {isApplied && <small>적용 중</small>}
            </button>
          );
        })}
      </div>

      {!state.areAllScenariosVisible && (
        <button
          type="button"
          className="scenario-switcher__show-all"
          aria-expanded={false}
          onClick={onShowAll}
        >
          전체 상황 보기
          <span aria-hidden="true">＋2</span>
        </button>
      )}

      <div className="scenario-switcher__preview" aria-live="polite">
        <div className="scenario-switcher__preview-title">
          <Badge variant={selectedScenario.tone}>
            {isAlternative ? "대체 계획 미리보기" : "현재 적용 계획"}
          </Badge>
          <strong>{selectedScenario.label}</strong>
        </div>
        <p>{selectedScenario.summary}</p>

        {isAlternative && !state.isComparisonOpen && (
          <p className="scenario-switcher__compare-hint">
            기존 계획은 흐리게 남아 있습니다.
          </p>
        )}

        {isAlternative && state.isComparisonOpen && (
          <>
            <dl>
              <div>
                <dt>변경 이유</dt>
                <dd>{selectedScenario.changeReason}</dd>
              </div>
              <div>
                <dt>다음 행동</dt>
                <dd>{selectedScenario.nextAction}</dd>
              </div>
            </dl>
            <p className="scenario-switcher__approval">
              기존 계획은 사용자 승인 전까지 그대로 유지됩니다.
            </p>
          </>
        )}

        {!isAlternative && (
          <p className="scenario-switcher__current">
            현재 이 계획이 적용되어 있습니다.
          </p>
        )}
      </div>

      {state.stage === "confirmChange" && (
        <div
          className="scenario-switcher__confirm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="planner-confirm-title"
          aria-describedby="planner-confirm-description"
        >
          <div>
            <h4 id="planner-confirm-title">대체 계획을 적용할까요?</h4>
            <p id="planner-confirm-description">
              {selectedScenario.label} mock 응답으로 현재 계획 표시를
              바꿉니다.
            </p>
          </div>
          <div className="scenario-switcher__confirm-actions">
            <button
              type="button"
              className="route-button route-button--secondary"
              onClick={onCancelApply}
            >
              취소
            </button>
            <button
              type="button"
              className="route-button route-button--primary"
              autoFocus
              onClick={onConfirmApply}
            >
              변경 계획 적용
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
