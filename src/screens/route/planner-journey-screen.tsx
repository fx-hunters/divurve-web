import { useRef, useState } from "react";
import {
  DataSourceBadge,
  getDataSourceCopy,
} from "../../components/common/data-source-badge";
import type {
  PlannerScenarioComparisonViewModel,
  PlannerViewModel,
} from "./planner-api-types";
import { PlannerJourneyAction } from "./planner-journey-action";
import { PlannerJourneyCurve } from "./planner-journey-curve";
import { PlannerJourneyDetail } from "./planner-journey-detail";
import { PlannerJourneyGoalSelect } from "./planner-journey-goal-select";
import {
  PlannerJourneyConfirm,
  PlannerJourneyNoAction,
  PlannerJourneyNoPlan,
  PlannerJourneyResult,
} from "./planner-journey-outcome";
import { PlannerJourneyPlanSetup } from "./planner-journey-plan-setup";
import { PlannerJourneyScenario } from "./planner-journey-scenario";
import { PlannerJourneyStatus } from "./planner-journey-status";
import { PlannerPlanHistory } from "./planner-plan-history";
import type { PlanVersionDependencies } from "./use-plan-versions";
import {
  usePlannerJourneyFlow,
  type PlannerJourneyOperations,
} from "./use-planner-journey-flow";

export type PlannerJourneyFeedback =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "success"; readonly message: string }
  | { readonly status: "error"; readonly message: string };

interface PlannerJourneyScreenProps extends PlannerJourneyOperations {
  readonly ariaLabel: string;
  readonly view: PlannerViewModel;
  readonly feedback: PlannerJourneyFeedback;
  readonly scenarioComparison: PlannerScenarioComparisonViewModel | null;
  readonly history?: {
    readonly dependencies?: PlanVersionDependencies;
  };
}

function FeedbackView({ feedback }: { readonly feedback: PlannerJourneyFeedback }) {
  if (feedback.status === "idle") return null;
  return (
    <div
      className="planner-api__notice"
      role={feedback.status === "error" ? "alert" : "status"}
    >
      {feedback.status === "loading" ? "요청을 처리하는 중…" : feedback.message}
    </div>
  );
}

export function PlannerJourneyScreen({
  ariaLabel,
  view,
  feedback,
  scenarioComparison,
  history,
  ...operations
}: PlannerJourneyScreenProps) {
  const flow = usePlannerJourneyFlow(view, operations);
  const [isDetailOpen, setDetailOpen] = useState(false);
  const detailTrigger = useRef<HTMLButtonElement>(null);
  const goal = view.selectedGoal;
  const isPending = feedback.status === "loading";
  const sourceCopy = getDataSourceCopy(view.dataSource.kind);
  if (goal === null) return null;

  return (
    <section
      className="planner-api"
      aria-label={ariaLabel}
      data-testid="planner-journey-screen"
      data-source={view.dataSource.kind}
    >
      <header className="planner-api__header">
        <div>
          <p className="planner-api-journey__eyebrow">DIVISA + CURVE</p>
          <h1>내 외화 플래너</h1>
          <p>{sourceCopy.description}</p>
        </div>
        <DataSourceBadge kind={view.dataSource.kind} />
      </header>

      {flow.stage !== "goal" && (
        <div className="planner-api__recap" aria-label="선택한 목표 요약">
          <span>{goal.name}</span>
          <strong>{goal.heldAmountLabel}</strong>
          <small>목표 {goal.targetAmountLabel}</small>
        </div>
      )}

      <div className="planner-api-journey" data-stage={flow.stage}>
        {flow.stage === "goal" && (
          <PlannerJourneyGoalSelect
            goals={view.goalItems}
            selectedGoalId={goal.id}
            onSelect={flow.selectGoal}
            onContinue={() => flow.setStage("status")}
          />
        )}
        {flow.stage === "status" && (
          <PlannerJourneyStatus
            goal={goal}
            onBack={() => flow.setStage("goal")}
            onContinue={() => void flow.continueFromStatus()}
            onHistory={
              history === undefined
                ? undefined
                : () => flow.setStage("history")
            }
          />
        )}
        {flow.stage === "history" && history !== undefined && (
          <PlannerPlanHistory
            goalId={goal.id}
            goalName={goal.name}
            currencyCode={goal.currencyCode}
            dependencies={history.dependencies}
            onBack={() => flow.setStage("status")}
          />
        )}
        {flow.stage === "planSetup" && view.plan !== null && (
          <PlannerJourneyPlanSetup
            plan={view.plan}
            isPending={isPending}
            onBack={() => flow.setStage("status")}
            onCreate={() => void flow.createPlan()}
          />
        )}
        {flow.stage === "curve" && view.curve !== null && (
          <PlannerJourneyCurve
            curve={view.curve}
            steps={view.steps}
            selectedSequence={flow.selectedSequence}
            onSelect={flow.setSelectedSequence}
            onBack={() => flow.setStage("status")}
            onContinue={() => flow.setStage("action")}
          />
        )}
        {flow.stage === "action" && view.nextAction !== null && (
          <PlannerJourneyAction
            action={view.nextAction}
            sourceKind={view.dataSource.kind}
            isPending={isPending}
            canComplete={view.supportedActions.canCompleteStep}
            canSkip={view.supportedActions.canSkipStep}
            canExplore={view.supportedActions.canPreviewScenario}
            detailButtonRef={detailTrigger}
            onComplete={(amount, rate) => void flow.complete(amount, rate)}
            onRecordDemo={() => void flow.recordDemo()}
            onSkip={() => void flow.skip()}
            onExplore={() => flow.setStage("scenario")}
            onBack={() => flow.setStage("curve")}
            onDetail={() => setDetailOpen(true)}
          />
        )}
        {flow.stage === "action" && view.nextAction === null && (
          <PlannerJourneyNoAction
            detailButtonRef={detailTrigger}
            onDetail={() => setDetailOpen(true)}
          />
        )}
        {flow.stage === "scenario" &&
          view.curve !== null &&
          view.scenarioOptions !== undefined && (
            <PlannerJourneyScenario
              sourceKind={view.dataSource.kind}
              baseCurve={view.curve}
              options={view.scenarioOptions}
              comparison={scenarioComparison}
              selectedOptionId={flow.selectedScenarioId}
              isPending={isPending}
              onSelect={(option, budget) =>
                void flow.previewScenario(option, budget)
              }
              onClear={flow.clearScenario}
              onContinue={() => flow.setStage("confirm")}
              onBack={() => flow.setStage("action")}
            />
          )}
        {flow.stage === "confirm" && scenarioComparison !== null && (
          <PlannerJourneyConfirm
            comparison={scenarioComparison}
            isPending={isPending}
            onBack={() => flow.setStage("scenario")}
            onApply={() => void flow.applyScenario()}
          />
        )}
        {flow.stage === "result" && (
          <PlannerJourneyResult
            title={flow.resultTitle}
            onGoals={() => flow.setStage("goal")}
            onCurve={() => flow.setStage("curve")}
          />
        )}
        {flow.stage === "noPlan" && (
          <PlannerJourneyNoPlan onBack={() => flow.setStage("status")} />
        )}
        <FeedbackView feedback={feedback} />
      </div>

      {isDetailOpen && view.plan !== null && (
        <PlannerJourneyDetail
          plan={view.plan}
          steps={view.steps}
          returnFocus={detailTrigger.current}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </section>
  );
}
