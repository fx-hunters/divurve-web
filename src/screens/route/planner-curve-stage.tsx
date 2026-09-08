import { Badge } from "../../components/common/badge";
import type {
  PlannerCheckpointData,
  PlannerScenario,
} from "../../types/route";
import { PlannerCheckpointLayer } from "./planner-checkpoint";
import { PlannerNodeDetail } from "./planner-node-detail";
import { PlannerReasonPanel } from "./route-explanation-section";
import type { PlannerActiveState } from "./use-planner-interaction";

interface PlannerCurveActions {
  readonly onSelectCheckpoint: (checkpointId: string) => void;
  readonly onToggleReason: () => void;
  readonly onSelectReasonProfile: (profileId: string) => void;
}

interface PlannerCurveStageProps {
  readonly state: PlannerActiveState;
  readonly actions: PlannerCurveActions;
}

function findScenario(
  scenarios: readonly [PlannerScenario, ...PlannerScenario[]],
  scenarioId: string,
): PlannerScenario {
  return scenarios.find((scenario) => scenario.id === scenarioId)!;
}

function findFocusCheckpoint(
  scenario: PlannerScenario,
  selectedCheckpointId: string | null,
): PlannerCheckpointData {
  return (
    scenario.checkpoints.find(
      (checkpoint) => checkpoint.id === selectedCheckpointId,
    ) ?? scenario.checkpoints.find((checkpoint) => checkpoint.status === "next")!
  );
}

export function PlannerCurveStage({
  state,
  actions,
}: PlannerCurveStageProps) {
  const { plan } = state;
  const appliedScenario = findScenario(
    plan.scenarios,
    state.appliedScenarioId,
  );
  const selectedScenario = findScenario(
    plan.scenarios,
    state.selectedScenarioId,
  );
  const isPreviewingAlternative =
    state.selectedScenarioId !== state.appliedScenarioId;
  const visibleScenario = isPreviewingAlternative
    ? selectedScenario
    : appliedScenario;
  const focusedCheckpoint = findFocusCheckpoint(
    visibleScenario,
    state.selectedCheckpointId,
  );
  const quickCheckpoints = visibleScenario.checkpoints.filter(
    (checkpoint) =>
      checkpoint.status === "complete" || checkpoint.status === "next",
  );
  const reasonContextLabel = isPreviewingAlternative
    ? selectedScenario.label
    : focusedCheckpoint.title;

  return (
    <section className="planner-curve" aria-labelledby="planner-curve-title">
      <div className="planner-curve__heading">
        <div>
          <p className="route-eyebrow">현재에서 목표까지</p>
          <h3 id="planner-curve-title">하나의 계획 Curve</h3>
        </div>
        <div className="planner-curve__legend" aria-label="Curve 구분">
          <span>
            <i className="planner-curve__legend-line" />
            기존 계획
          </span>
          {isPreviewingAlternative && (
            <span>
              <i className="planner-curve__legend-line planner-curve__legend-line--alternative" />
              대체 계획
            </span>
          )}
        </div>
      </div>

      <p className="planner-curve__caption">
        환율 차트가 아니라 날짜와 행동을 잇는 계획 경로입니다.
      </p>

      <div className="planner-curve__canvas">
        <svg
          viewBox="0 0 1000 520"
          role="group"
          aria-labelledby="planner-curve-svg-title"
          aria-describedby="planner-curve-svg-description"
          preserveAspectRatio="xMidYMid meet"
        >
          <title id="planner-curve-svg-title">
            계획 경로 · {visibleScenario.curve.accessibleLabel}
          </title>
          <desc id="planner-curve-svg-description">
            세로축이나 환율 눈금 없이 현재 상태, 준비 회차, 상황 확인, 목표
            도착을 연결합니다. 각 지점은 키보드로 선택할 수 있습니다.
          </desc>
          <path
            className="planner-curve__guide"
            d={appliedScenario.curve.path}
          />
          <path
            className={
              "planner-curve__path planner-curve__path--current" +
              (isPreviewingAlternative
                ? " planner-curve__path--muted"
                : "")
            }
            d={appliedScenario.curve.path}
            pathLength="1"
            data-curve-role="current"
            key={appliedScenario.curve.id}
          />
          {isPreviewingAlternative && (
            <path
              className="planner-curve__path planner-curve__path--alternative"
              d={selectedScenario.curve.path}
              pathLength="1"
              data-curve-role="alternative"
              key={selectedScenario.curve.id}
            />
          )}

          {isPreviewingAlternative && (
            <PlannerCheckpointLayer
              checkpoints={appliedScenario.checkpoints}
              changedCheckpointIds={[]}
              isMuted
              onSelectCheckpoint={actions.onSelectCheckpoint}
            />
          )}
          <PlannerCheckpointLayer
            checkpoints={visibleScenario.checkpoints}
            changedCheckpointIds={
              isPreviewingAlternative
                ? selectedScenario.changedCheckpointIds
                : []
            }
            highlightedCheckpointId={
              state.hasRecordedRound
                ? plan.recordedState.nextCheckpointId
                : undefined
            }
            highlightedStatusLabel={
              state.hasRecordedRound
                ? plan.recordedState.nextCheckpointStatusLabel
                : undefined
            }
            selectedCheckpointId={state.selectedCheckpointId}
            onSelectCheckpoint={actions.onSelectCheckpoint}
          />
        </svg>
      </div>

      <div className="planner-curve__quick-nodes" aria-label="현재와 다음 지점">
        {quickCheckpoints.map((checkpoint) => (
          <span key={checkpoint.id} data-status={checkpoint.status}>
            <small>{checkpoint.label}</small>
            <strong>{checkpoint.title}</strong>
            <b>{checkpoint.detail}</b>
          </span>
        ))}
      </div>

      <PlannerNodeDetail
        checkpoint={focusedCheckpoint}
        isUserSelected={state.selectedCheckpointId !== null}
        onOpenReason={actions.onToggleReason}
      />

      {state.isReasonOpen && (
        <PlannerReasonPanel
          explanation={plan.explanation}
          contextLabel={reasonContextLabel}
          selectedProfileId={state.selectedReasonProfileId}
          onClose={actions.onToggleReason}
          onSelectProfile={actions.onSelectReasonProfile}
        />
      )}

      <p className="planner-curve__context" aria-live="polite">
        <Badge variant={visibleScenario.tone}>
          {isPreviewingAlternative ? "대체 계획 미리보기" : "현재 계획"}
        </Badge>
        <strong>{visibleScenario.label}</strong>
        <span>{visibleScenario.nextAction}</span>
      </p>
    </section>
  );
}
