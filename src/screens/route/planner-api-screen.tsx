import { useState } from "react";
import { ApiStateView } from "../../components/common/api-state-view";
import {
  presentPlannerOverview,
  presentPlannerScenarioComparison,
  presentPlannerSkipComparison,
  replacePlannerPlan,
} from "./planner-api-presenter";
import {
  rejectUnsupportedPlannerOperation,
  type PlannerScenarioOptionViewModel,
} from "./planner-api-types";
import {
  PlannerJourneyScreen,
  type PlannerJourneyFeedback,
} from "./planner-journey-screen";
import {
  getPlannerToday,
  usePlannerApi,
  type PlannerApiDependencies,
} from "./use-planner-api";
import { toPlannerGoalCreateRequest } from "./planner-goal-input";
import type { ExplanationRequester } from "../../hooks/use-ai-explanation";
import type { PlanVersionDependencies } from "./use-plan-versions";
import {
  readPlannerUiSelection,
  writePlannerGoalSelection,
} from "./planner-ui-selection";
import "./planner-api-screen.css";

interface PlannerApiScreenProps {
  readonly dependencies?: PlannerApiDependencies;
  readonly planVersionDependencies?: PlanVersionDependencies;
  readonly explanationRequester?: ExplanationRequester;
  readonly onExploreDemo?: () => void;
  readonly onOpenPlanDetail?: (goalId: string, planId: string) => void;
}

export function PlannerApiScreen({
  dependencies,
  planVersionDependencies,
  explanationRequester,
  onExploreDemo,
  onOpenPlanDetail = () => undefined,
}: PlannerApiScreenProps) {
  const planner = usePlannerApi(dependencies);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(
    () => readPlannerUiSelection().goalId,
  );
  const [selectedOption, setSelectedOption] =
    useState<PlannerScenarioOptionViewModel | null>(null);

  if (planner.state.status === "loading") {
    return (
      <ApiStateView
        status="loading"
        title="플래너를 불러오는 중입니다"
        message="목표와 활성 계획을 서버에서 확인하고 있습니다."
      />
    );
  }
  if (planner.state.status === "error") {
    return (
      <ApiStateView
        status="error"
        title="플래너를 불러오지 못했습니다"
        message={planner.state.message}
        onRetry={planner.reload}
      />
    );
  }
  const baseOverview = planner.state.data;
  const baseView = presentPlannerOverview(baseOverview, selectedGoalId);
  const activeGoalId = baseView.selectedGoal?.id ?? null;
  const effectiveOverview =
    activeGoalId !== null &&
    planner.planPreview !== null &&
    planner.planPreview.goalId === activeGoalId
      ? replacePlannerPlan(
          baseOverview,
          planner.planPreview.goalId,
          planner.planPreview.plan,
        )
      : baseOverview;
  const view = presentPlannerOverview(effectiveOverview, activeGoalId);
  const rawGoal = baseOverview.items.find(
    (item) => item.goal.id === activeGoalId,
  )?.goal;
  const skippedOption = view.scenarioOptions?.find(
    (option) => option.id === "missedRound",
  );
  const comparison =
    planner.scenarioPreview !== null && selectedOption !== null
      ? presentPlannerScenarioComparison(
          planner.scenarioPreview,
          view,
          selectedOption,
        )
      : planner.skipPreview !== null && skippedOption !== undefined
        ? presentPlannerSkipComparison(
            planner.skipPreview,
            view,
            skippedOption,
          )
      : null;

  const handleSelectGoal = (goalId: string) => {
    setSelectedGoalId(goalId);
    writePlannerGoalSelection(goalId);
    setSelectedOption(null);
    planner.clearTransient();
  };
  const handlePreviewPlan = async () =>
    rawGoal === undefined ? false : planner.preview(rawGoal);
  const handleCreatePlan = async () =>
    rawGoal === undefined ? false : planner.create(rawGoal);
  const handleCreateGoal = async (
    input: Parameters<typeof toPlannerGoalCreateRequest>[0],
  ) => {
    const result = await planner.createGoal(toPlannerGoalCreateRequest(input));
    if (result === null) return null;
    setSelectedGoalId(result.id);
    writePlannerGoalSelection(result.id);
    return result.id;
  };
  const handleClearTransient = () => {
    setSelectedOption(null);
    planner.clearTransient();
  };
  const handleComplete = async (amount: number, rate: number) => {
    const action = view.nextAction!;
    return planner.complete(action.planId, action.sequence, amount, rate);
  };
  const handleSkip = async () => {
    const action = view.nextAction!;
    return planner.skip(action.planId, action.sequence);
  };
  const handlePreviewScenario = async (
    option: PlannerScenarioOptionViewModel,
    newBudgetKrw?: number,
  ) => {
    setSelectedOption(option);
    const scenarioCode = option.scenarioCode!;
    const planId = view.plan!.id!;
    const input = {
      scenarioCode,
      ...(scenarioCode === "STEP_SKIPPED" && view.nextAction !== null
        ? { skippedSeq: view.nextAction.sequence }
        : {}),
      ...(scenarioCode === "BUDGET_DECREASED" &&
      newBudgetKrw !== undefined
        ? { newBudgetKrw }
        : {}),
    };
    return planner.previewScenario(planId, input);
  };
  const handleApply = async () =>
    typeof comparison?.draftPlanId === "string" && activeGoalId !== null
      ? planner.apply(activeGoalId, comparison.draftPlanId)
      : false;
  const feedback: PlannerJourneyFeedback =
    planner.actionState.status === "success"
      ? { status: "success", message: planner.actionState.message }
      : planner.actionState;

  return (
    <PlannerJourneyScreen
      ariaLabel="API 플래너"
      view={view}
      feedback={feedback}
      scenarioComparison={comparison}
      history={{
        dependencies: planVersionDependencies,
        explanationRequester,
      }}
      goalCreation={{
        sourceLabel: "내 계정",
        canCreateRecurring: false,
        today: getPlannerToday(),
        onCreate: handleCreateGoal,
      }}
      onExploreDemo={onExploreDemo}
      onOpenPlanDetail={onOpenPlanDetail}
      onSelectGoal={handleSelectGoal}
      onPreviewPlan={handlePreviewPlan}
      onDiscardPlanPreview={handleClearTransient}
      onCreatePlan={handleCreatePlan}
      onComplete={handleComplete}
      onRecordDemo={rejectUnsupportedPlannerOperation}
      onSkip={handleSkip}
      onPreviewScenario={handlePreviewScenario}
      onClearScenario={handleClearTransient}
      onApplyScenario={handleApply}
    />
  );
}
