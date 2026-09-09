import { useRef, useState } from "react";
import {
  getDataSourceCopy,
} from "../../components/common/data-source-badge";
import type {
  PlannerScenarioComparisonViewModel,
  PlannerViewModel,
} from "./planner-api-types";
import type { ExplanationRequester } from "../../hooks/use-ai-explanation";
import { PlannerGoalForm } from "./planner-goal-form";
import type { PlannerGoalInput } from "./planner-goal-input";
import { PlannerJourneyGoalSelect } from "./planner-journey-goal-select";
import { PlannerJourneyHeader } from "./planner-journey-header";
import { PlannerJourneyMain } from "./planner-journey-main";
import { PlannerJourneyPlanSetup } from "./planner-journey-plan-setup";
import { PlannerScenarioModal } from "./planner-journey-scenario";
import { PlannerPlanHistory } from "./planner-plan-history";
import { toPlanSummaryFacts } from "./planner-plan-facts";
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
    readonly explanationRequester?: ExplanationRequester;
  };
  readonly goalCreation: {
    readonly sourceLabel: string;
    readonly canCreateRecurring: boolean;
    readonly today: string;
    readonly onCreate: (input: PlannerGoalInput) => Promise<string | null>;
  };
  readonly onOpenPlanDetail: (goalId: string, planId: string) => void;
  readonly onExploreDemo?: () => void;
  readonly onExitDemo?: () => void;
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
  goalCreation,
  onOpenPlanDetail,
  onExploreDemo,
  onExitDemo,
  ...operations
}: PlannerJourneyScreenProps) {
  const flow = usePlannerJourneyFlow(view, operations);
  const [isGoalFormOpen, setGoalFormOpen] = useState(false);
  const [isScenarioOpen, setScenarioOpen] = useState(false);
  const [isPlanChanged, setPlanChanged] = useState(false);
  const detailTrigger = useRef<HTMLButtonElement>(null);
  const scenarioTrigger = useRef<HTMLButtonElement>(null);
  const goal = view.selectedGoal;
  const isPending = feedback.status === "loading";
  const sourceCopy = getDataSourceCopy(view.dataSource.kind);

  const handleCreateGoal = async (input: PlannerGoalInput) => {
    const goalId = await goalCreation.onCreate(input);
    if (goalId === null) return false;
    setGoalFormOpen(false);
    flow.selectGoal(goalId);
    return true;
  };

  const handleOpenDetail = () => {
    if (goal === null || typeof view.plan?.id !== "string") return;
    onOpenPlanDetail(goal.id, view.plan.id);
  };

  const handleOpenScenario = () => {
    flow.clearScenario();
    setScenarioOpen(true);
  };

  const handleCloseScenario = () => {
    flow.clearScenario();
    setScenarioOpen(false);
  };

  const handleSkip = async () => {
    if (await flow.skip()) setScenarioOpen(true);
  };

  const handleApplyScenario = async () => {
    if (await flow.applyScenario()) {
      setScenarioOpen(false);
      setPlanChanged(true);
    }
  };

  return (
    <section
      className="planner-api"
      aria-label={ariaLabel}
      data-testid="planner-journey-screen"
      data-source={view.dataSource.kind}
    >
      <PlannerJourneyHeader
        kind={view.dataSource.kind}
        description={sourceCopy.description}
      />

      <div className="planner-api-journey" data-stage={flow.stage}>
        {flow.stage === "goal" && isGoalFormOpen && (
          <PlannerGoalForm
            sourceLabel={goalCreation.sourceLabel}
            canCreateRecurring={goalCreation.canCreateRecurring}
            isPending={isPending}
            today={goalCreation.today}
            onSubmit={handleCreateGoal}
            onCancel={() => setGoalFormOpen(false)}
          />
        )}
        {flow.stage === "goal" && !isGoalFormOpen && (
          <PlannerJourneyGoalSelect
            goals={view.goalItems}
            selectedGoalId={goal?.id ?? ""}
            onSelect={flow.chooseGoal}
            onContinue={flow.enterSelectedGoal}
            onCreateGoal={() => setGoalFormOpen(true)}
            onExploreDemo={onExploreDemo}
            onExitDemo={onExitDemo}
          />
        )}
        {flow.stage === "main" && (
          <PlannerJourneyMain
            view={view}
            selectedSequence={flow.selectedSequence}
            isPending={isPending}
            detailButtonRef={detailTrigger}
            scenarioButtonRef={scenarioTrigger}
            isPlanChanged={isPlanChanged}
            onSelectSequence={flow.setSelectedSequence}
            onPreviewPlan={() => void flow.continueFromStatus()}
            onComplete={(amount, rate) => void flow.complete(amount, rate)}
            onRecordDemo={() => void flow.recordDemo()}
            onSkip={() => void handleSkip()}
            onExploreScenario={handleOpenScenario}
            onOpenDetail={handleOpenDetail}
            onOpenHistory={
              history === undefined
                ? undefined
                : () => flow.setStage("history")
            }
            onBackToGoals={() => flow.setStage("goal")}
            onPlanChangeAnimationEnd={() => setPlanChanged(false)}
          />
        )}
        {flow.stage === "history" && history !== undefined && goal !== null && (
          <PlannerPlanHistory
            goalId={goal.id}
            goalName={goal.name}
            currencyCode={goal.currencyCode}
            facts={toPlanSummaryFacts(view)}
            dependencies={history.dependencies}
            explanationRequester={history.explanationRequester}
            onBack={() => flow.setStage("main")}
          />
        )}
        {flow.stage === "planSetup" && view.plan !== null && (
          <PlannerJourneyPlanSetup
            plan={view.plan}
            isPending={isPending}
            onBack={flow.returnFromPlanSetup}
            onCreate={() => void flow.createPlan()}
          />
        )}
        <FeedbackView feedback={feedback} />
      </div>

      {isScenarioOpen &&
        view.curve !== null &&
        view.scenarioOptions !== undefined && (
          <PlannerScenarioModal
            sourceKind={view.dataSource.kind}
            baseCurve={view.curve}
            options={view.scenarioOptions}
            comparison={scenarioComparison}
            selectedOptionId={flow.selectedScenarioId}
            isPending={isPending}
            returnFocus={scenarioTrigger.current}
            onSelect={(option, budget) => void flow.previewScenario(option, budget)}
            onClear={flow.clearScenario}
            onClose={handleCloseScenario}
            onApply={() => void handleApplyScenario()}
          />
        )}
    </section>
  );
}
