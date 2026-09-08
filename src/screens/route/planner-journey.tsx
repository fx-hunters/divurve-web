import type {
  PlannerCheckpointData,
  PlannerScenario,
  RouteDataNotice,
} from "../../types/route";
import { GoalSummarySection } from "./goal-summary-section";
import { PlannerCurveStage } from "./planner-curve-stage";
import { PlannerDetailDrawer } from "./planner-detail-drawer";
import { ScenarioSwitcher } from "./scenario-section";
import {
  PlannerActionDock,
  type PlannerDockActionId,
} from "./today-action-section";
import type {
  PlannerActiveState,
  PlannerRevealPhase,
  UsePlannerInteractionResult,
} from "./use-planner-interaction";

interface PlannerJourneyProps {
  readonly dataNotice: RouteDataNotice;
  readonly state: PlannerActiveState;
  readonly actions: UsePlannerInteractionResult;
}

const REVEAL_ANNOUNCEMENTS: Readonly<Record<PlannerRevealPhase, string>> = {
  orientation: "현재 위치를 확인하고 있습니다.",
  pathReveal: "현재 위치에서 목표까지 계획 Curve를 펼쳤습니다.",
  actionFocus: "다음 행동을 확인할 수 있습니다.",
  explore: "상황별 대체 경로를 확인할 수 있습니다.",
};

function findScenario(
  state: PlannerActiveState,
  scenarioId: string,
): PlannerScenario {
  return state.plan.scenarios.find((scenario) => scenario.id === scenarioId)!;
}

function findSelectedCheckpoint(
  state: PlannerActiveState,
): PlannerCheckpointData | undefined {
  if (state.selectedCheckpointId === null) {
    return undefined;
  }
  const visibleScenario = findScenario(state, state.selectedScenarioId);
  return visibleScenario.checkpoints.find(
    (checkpoint) => checkpoint.id === state.selectedCheckpointId,
  );
}

function getDockMode(
  state: PlannerActiveState,
): "explore" | "record" | "compare" | "apply" | "next" {
  if (state.hasRecordedRound) {
    return "next";
  }
  if (state.selectedScenarioId !== state.appliedScenarioId) {
    return state.isComparisonOpen ? "apply" : "compare";
  }
  return findSelectedCheckpoint(state)?.status === "next"
    ? "record"
    : "explore";
}

export function PlannerJourney({
  dataNotice,
  state,
  actions,
}: PlannerJourneyProps) {
  const { plan } = state;
  const action = state.hasRecordedRound
    ? plan.recordedState.action
    : plan.action;
  const isCurveVisible = state.revealPhase !== "orientation";
  const isActionVisible =
    state.revealPhase === "actionFocus" || state.revealPhase === "explore";
  const dockMode = getDockMode(state);

  const handleDockAction = (actionId: PlannerDockActionId) => {
    switch (actionId) {
      case "explore":
        actions.openScenarios();
        break;
      case "record":
        actions.recordRound();
        break;
      case "compare":
        actions.compareScenario();
        break;
      case "apply":
        actions.beginConfirmation();
        break;
      case "next":
        actions.selectCheckpoint(plan.recordedState.nextCheckpointId);
        break;
      case "skip":
        actions.selectScenario("missedRound");
        break;
      case "reason":
        actions.toggleReason();
        break;
      case "details":
        actions.openDetails();
        break;
    }
  };

  return (
    <section
      className="planner-journey"
      aria-labelledby="planner-journey-title"
      data-reveal-phase={state.revealPhase}
      data-entry-mode={state.entryMode}
    >
      {state.revealPhase !== "orientation" && (
        <nav className="planner-journey__toolbar" aria-label="플래너 화면 도구">
          <button type="button" onClick={actions.returnToIntro}>
            <span aria-hidden="true">←</span>
            다른 목표 보기
          </button>
          <button type="button" onClick={actions.replayReveal}>
            처음부터 다시 보기
          </button>
        </nav>
      )}

      <GoalSummarySection
        goal={plan.goal}
        dataNotice={dataNotice}
        revealPhase={state.revealPhase}
        isExpanded={state.isGoalExpanded}
        onToggle={actions.toggleGoalDetails}
      />

      <p className="route-visually-hidden" role="status" aria-live="polite">
        {REVEAL_ANNOUNCEMENTS[state.revealPhase]}
      </p>

      {state.hasRecordedRound && state.revealPhase !== "orientation" && (
        <p className="planner-recorded-notice" role="status" aria-live="polite">
          {plan.recordedState.announcement}
        </p>
      )}

      {isCurveVisible && (
        <div className="planner-journey__scene">
          <PlannerCurveStage
            state={state}
            actions={{
              onSelectCheckpoint: actions.selectCheckpoint,
              onToggleReason: actions.toggleReason,
              onSelectReasonProfile: actions.selectReasonProfile,
            }}
          />

          {isActionVisible && (
            <PlannerActionDock
              action={action}
              plan={plan.plan}
              mode={dockMode}
              isRecorded={state.hasRecordedRound}
              recordedStatusLabel={plan.recordedState.currentStatusLabel}
              onAction={handleDockAction}
            />
          )}
        </div>
      )}

      {state.isScenarioOpen && (
        <ScenarioSwitcher
          state={state}
          onSelect={actions.selectScenario}
          onShowAll={actions.showAllScenarios}
          onClose={actions.closeScenarios}
          onConfirmApply={actions.applyScenario}
          onCancelApply={actions.cancelConfirmation}
        />
      )}

      {state.isDetailsOpen && (
        <PlannerDetailDrawer
          plan={plan}
          action={action}
          dataNotice={dataNotice}
          onClose={actions.closeDetails}
        />
      )}
    </section>
  );
}
