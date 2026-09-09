import { useState } from "react";
import { ApiStateView } from "../../components/common/api-state-view";
import {
  presentPlannerOverview,
  presentPlannerPlanSummary,
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
import { PlannerJourneyGoalSelect } from "./planner-journey-goal-select";
import { PlannerJourneyHeader } from "./planner-journey-header";
import { toPlannerGoalCreateRequest } from "./planner-goal-input";
import {
  toPlannerGoalCreateRequest,
  toPlannerPlanPreviewRequest,
  type PlannerGoalInput,
} from "./planner-goal-input";
import { presentPlannerContext } from "./planner-context-presenter";
import {
  usePlannerContext,
  type PlannerContextLoader,
} from "./use-planner-context";
import type { PlannerJourneyNavigation } from "./use-planner-journey-flow";
import type { ExplanationRequester } from "../../hooks/use-ai-explanation";
import type { PlanVersionDependencies } from "./use-plan-versions";
import type { PlannerGoalUpdateRequest } from "../../api/planner-contract";
import {
  readPlannerUiSelection,
  writePlannerGoalSelection,
} from "./planner-ui-selection";
import "./planner-api-screen.css";

interface PlannerApiScreenProps {
  /** 주소가 가리키는 목표. 목표 선택 화면에서는 null이다. */
  readonly goalId: string | null;
  readonly navigation: PlannerJourneyNavigation;
  readonly dependencies?: PlannerApiDependencies;
  readonly loadContext?: PlannerContextLoader;
  readonly planVersionDependencies?: PlanVersionDependencies;
  readonly explanationRequester?: ExplanationRequester;
  readonly onExploreDemo?: () => void;
  readonly onOpenPlanDetail?: (goalId: string, planId: string) => void;
}

export function PlannerApiScreen({
  goalId,
  navigation,
  dependencies,
  loadContext,
  planVersionDependencies,
  explanationRequester,
  onExploreDemo,
  onOpenPlanDetail = () => undefined,
}: PlannerApiScreenProps) {
  const planner = usePlannerApi(dependencies);
  const contextState = usePlannerContext(loadContext);
  // 주소에 목표가 없는 목표 선택 화면에서만 쓰는 강조 상태다. 주소가 목표를
  // 가리키면 그쪽이 이긴다 — 화면과 주소가 다른 목표를 가리키면 안 된다.
  const [highlightedGoalId, setHighlightedGoalId] = useState<string | null>(
    () => readPlannerUiSelection().goalId,
  );
  const selectedGoalId = goalId ?? highlightedGoalId;
  const [selectedOption, setSelectedOption] =
    useState<PlannerScenarioOptionViewModel | null>(null);

  /*
   * 로딩이라고 화면을 통째로 가리지 않는다. 여정의 단계 배정은 서버가 준
   * 목표·계획에서 나오므로, 응답 전에는 첫 단계(목표 선택)의 틀만 세우고
   * 목록 자리를 비워 둔다. 머리말과 '새 목표 만들기'는 그대로 산다.
   */
  if (planner.state.status === "loading") {
    return (
      <section className="planner-api" data-testid="planner-journey-loading">
        <PlannerJourneyHeader kind="unknown" />
        <span className="sr-only" role="status">
          플래너를 불러오는 중입니다. 목표와 활성 계획을 서버에서 확인하고
          있습니다.
        </span>
        <div className="planner-api-journey" data-stage="goal">
          <PlannerJourneyGoalSelect
            goals={null}
            selectedGoalId=""
            onSelect={setSelectedGoalId}
            onExploreDemo={onExploreDemo}
          />
        </div>
      </section>
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

  const handleSelectGoal = (nextGoalId: string) => {
    setHighlightedGoalId(nextGoalId);
    writePlannerGoalSelection(nextGoalId);
    setSelectedOption(null);
    planner.clearTransient();
  };
  const handlePreviewPlan = async () => planner.preview(rawGoal!);
  const handleCreatePlan = async () => planner.create(rawGoal!);
  const handleCreateGoal = async (
    input: Parameters<typeof toPlannerGoalCreateRequest>[0],
  ) => {
    const result = await planner.createGoal(toPlannerGoalCreateRequest(input));
    if (result === null) return null;
    setHighlightedGoalId(result.id);
    writePlannerGoalSelection(result.id);
    return result.id;
  };
  const handlePreviewGoalDraft = async (input: PlannerGoalInput) =>
    planner.previewDraft(toPlannerPlanPreviewRequest(input));
  const handleSaveGoal = async (input: PlannerGoalUpdateRequest) =>
    planner.updateGoal(activeGoalId!, input);
  const handleDeleteGoal = async () => planner.deleteGoal(activeGoalId!);
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
    planner.apply(activeGoalId!, comparison!.draftPlanId!);
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
      navigation={navigation}
      context={
        contextState.status === "success"
          ? presentPlannerContext(contextState.data)
          : null
      }
      goalCreation={{
        sourceLabel: "내 계정",
        canCreateRecurring: false,
        today: getPlannerToday(),
        onCreate: handleCreateGoal,
        onPreview: handlePreviewGoalDraft,
        preview:
          planner.draftPreview === null
            ? null
            : presentPlannerPlanSummary(planner.draftPreview),
      }}
      goalEditing={
        rawGoal === undefined
          ? undefined
          : {
              initial: {
                name: rawGoal.name,
                targetAmount: String(rawGoal.targetAmount),
                targetDate: rawGoal.targetDate ?? "",
                budgetAmount: String(rawGoal.budgetAmount ?? 0),
              },
              today: getPlannerToday(),
              onSave: handleSaveGoal,
              onDelete: handleDeleteGoal,
            }
      }
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
