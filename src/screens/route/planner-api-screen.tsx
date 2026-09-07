import { useState } from "react";
import { ApiStateView } from "../../components/common/api-state-view";
import {
  presentPlannerOverview,
  presentPlannerScenarioComparison,
  replacePlannerPlan,
} from "./planner-api-presenter";
import type { PlannerScenarioOptionViewModel } from "./planner-api-types";
import {
  PlannerJourneyScreen,
  type PlannerJourneyFeedback,
} from "./planner-journey-screen";
import { usePlannerApi, type PlannerApiDependencies } from "./use-planner-api";
import "./planner-api-screen.css";

interface PlannerApiScreenProps {
  readonly dependencies?: PlannerApiDependencies;
}

export function PlannerApiScreen({ dependencies }: PlannerApiScreenProps) {
  const planner = usePlannerApi(dependencies);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
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
  if (planner.state.status === "empty") {
    return (
      <ApiStateView
        status="empty"
        title="등록된 외화 목표가 없습니다"
        message="서버에 등록된 외화 목표가 생기면 이곳에서 계획을 확인할 수 있습니다."
      />
    );
  }

  const baseOverview = planner.state.data;
  const baseView = presentPlannerOverview(baseOverview, selectedGoalId);
  const activeGoalId = baseView.selectedGoal?.id ?? null;
  const effectiveOverview =
    planner.planPreview !== null && planner.planPreview.goalId === activeGoalId
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
  const comparison =
    planner.scenarioPreview !== null && selectedOption !== null
      ? presentPlannerScenarioComparison(
          planner.scenarioPreview,
          view,
          selectedOption,
        )
      : null;

  const handleSelectGoal = (goalId: string) => {
    setSelectedGoalId(goalId);
    setSelectedOption(null);
    planner.clearTransient();
  };
  const handlePreviewPlan = async () =>
    rawGoal === undefined ? false : planner.preview(rawGoal);
  const handleCreatePlan = async () =>
    rawGoal === undefined ? false : planner.create(rawGoal);
  const handleComplete = async (amount: number, rate: number) => {
    const action = view.nextAction;
    return action === null
      ? false
      : planner.complete(action.planId, action.sequence, amount, rate);
  };
  const handleSkip = async () => {
    const action = view.nextAction;
    return action === null
      ? false
      : planner.skip(action.planId, action.sequence);
  };
  const handlePreviewScenario = async (
    option: PlannerScenarioOptionViewModel,
    newBudgetKrw?: number,
  ) => {
    setSelectedOption(option);
    if (option.scenarioCode === null) {
      planner.clearTransient();
      return true;
    }
    const planId = view.plan?.id;
    if (planId === null || planId === undefined) return false;
    const input = {
      scenarioCode: option.scenarioCode,
      ...(option.scenarioCode === "STEP_SKIPPED" && view.nextAction !== null
        ? { skippedSeq: view.nextAction.sequence }
        : {}),
      ...(option.scenarioCode === "BUDGET_DECREASED" &&
      newBudgetKrw !== undefined
        ? { newBudgetKrw }
        : {}),
    };
    return planner.previewScenario(planId, input);
  };
  const handleApply = async () => {
    if (activeGoalId === null || comparison?.draftPlanId === null || comparison === null) {
      return false;
    }
    return planner.apply(activeGoalId, comparison.draftPlanId);
  };
  const feedback: PlannerJourneyFeedback =
    planner.actionState.status === "success"
      ? {
          status: "success",
          message: planner.actionState.message,
        }
      : planner.actionState;

  return (
    <PlannerJourneyScreen
      ariaLabel="API 플래너"
      view={view}
      feedback={feedback}
      scenarioComparison={comparison}
      onSelectGoal={handleSelectGoal}
      onPreviewPlan={handlePreviewPlan}
      onCreatePlan={handleCreatePlan}
      onComplete={handleComplete}
      onRecordDemo={async () => false}
      onSkip={handleSkip}
      onPreviewScenario={handlePreviewScenario}
      onClearScenario={() => {
        setSelectedOption(null);
        planner.clearTransient();
      }}
      onApplyScenario={handleApply}
    />
  );
}
