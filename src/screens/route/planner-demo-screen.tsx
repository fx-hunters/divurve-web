import { useState } from "react";
import type { RoutePlanData } from "../../types/route";
import {
  findDemoPlan,
  presentDemoPlanner,
  presentDemoScenarioComparison,
} from "./planner-demo-adapter";
import {
  rejectUnsupportedPlannerOperation,
  type PlannerScenarioComparisonViewModel,
  type PlannerScenarioOptionViewModel,
} from "./planner-api-types";
import {
  PlannerJourneyScreen,
  type PlannerJourneyFeedback,
} from "./planner-journey-screen";
import type { PlannerGoalInput, PlannerLocalGoal } from "./planner-goal-input";
import type { PlannerJourneyNavigation } from "./use-planner-journey-flow";
import { getPlannerToday } from "./use-planner-api";
import {
  readPlannerUiSelection,
  writePlannerGoalSelection,
} from "./planner-ui-selection";

interface PlannerDemoScreenProps {
  readonly data: RoutePlanData;
  /** 주소가 가리키는 데모 목표. 목표 선택 화면에서는 null이다. */
  readonly goalId: string | null;
  readonly navigation: PlannerJourneyNavigation;
  readonly onExitDemo?: () => void;
  readonly createGoalId?: () => string;
  readonly onOpenPlanDetail?: (goalId: string, planId: string) => void;
}

export function PlannerDemoScreen({
  data,
  goalId,
  navigation,
  onExitDemo,
  createGoalId = () => crypto.randomUUID(),
  onOpenPlanDetail = () => undefined,
}: PlannerDemoScreenProps) {
  const initialPlan = data.plans[0];
  // 주소에 목표가 없는 목표 선택 화면에서만 쓰는 강조 상태다(API 화면과 같은 규칙).
  const [highlightedGoalId, setHighlightedGoalId] = useState(() => {
    const storedGoalId = readPlannerUiSelection().goalId;
    return data.plans.some((plan) => plan.id === storedGoalId)
      ? storedGoalId!
      : initialPlan.id;
  });
  const selectedGoalId = goalId ?? highlightedGoalId;
  const [appliedScenarioId, setAppliedScenarioId] = useState<string>(
    initialPlan.baseScenarioId,
  );
  const [hasRecordedRound, setRecordedRound] = useState(false);
  const [comparison, setComparison] =
    useState<PlannerScenarioComparisonViewModel | null>(null);
  const [feedback, setFeedback] = useState<PlannerJourneyFeedback>({
    status: "idle",
  });
  const [localGoals, setLocalGoals] = useState<readonly PlannerLocalGoal[]>([]);
  const view = presentDemoPlanner(
    data,
    selectedGoalId,
    appliedScenarioId,
    hasRecordedRound,
    localGoals,
  );

  const handleSelectGoal = (nextGoalId: string) => {
    const plan = findDemoPlan(data, nextGoalId);
    setHighlightedGoalId(nextGoalId);
    writePlannerGoalSelection(nextGoalId);
    setAppliedScenarioId(plan.baseScenarioId);
    setRecordedRound(false);
    setComparison(null);
    setFeedback(
      nextGoalId.startsWith("demo-")
        ? {
            status: "success",
            message:
              "목표를 데모 화면에만 추가했습니다. 서버에는 저장하지 않았습니다.",
          }
        : { status: "idle" },
    );
  };
  const handleRecord = async () => {
    setRecordedRound(true);
    setFeedback({
      status: "success",
      message:
        "이번 회차를 데모 화면에서만 기록했습니다. 서버에는 저장하지 않았습니다.",
    });
    return true;
  };
  const handleSkip = async () => {
    const result = presentDemoScenarioComparison(
      data,
      selectedGoalId,
      "missedRound",
    );
    setComparison(result);
    setFeedback({
      status: "success",
      message:
        "회차 누락 시의 데모 경로입니다. 현재 데모 계획에는 아직 적용되지 않았습니다.",
    });
    return result !== null;
  };
  const handlePreviewScenario = async (
    option: PlannerScenarioOptionViewModel,
  ) => {
    const result = presentDemoScenarioComparison(
      data,
      selectedGoalId,
      option.id,
    )!;
    setComparison(result);
    setFeedback({
      status: "success",
      message:
        "체험용 대체 경로입니다. 확인 전에는 현재 데모 계획이 유지됩니다.",
    });
    return true;
  };
  const handleApply = async () => {
    setAppliedScenarioId(comparison!.id);
    setComparison(null);
    setFeedback({
      status: "success",
      message:
        "선택한 경로를 이 데모 화면에만 적용했습니다. 서버 데이터는 바뀌지 않았습니다.",
    });
    return true;
  };
  const handleClearTransient = () => {
    setComparison(null);
    setFeedback({ status: "idle" });
  };
  const handleCreateGoal = async (input: PlannerGoalInput) => {
    const id = `demo-${createGoalId()}`;
    setLocalGoals((current) => [...current, { id, input }]);
    setHighlightedGoalId(id);
    writePlannerGoalSelection(id);
    setComparison(null);
    return id;
  };

  return (
    <PlannerJourneyScreen
      ariaLabel="데모 플래너"
      view={view}
      feedback={feedback}
      scenarioComparison={comparison}
      navigation={navigation}
      goalCreation={{
        sourceLabel: "데모",
        canCreateRecurring: true,
        today: getPlannerToday(),
        onCreate: handleCreateGoal,
      }}
      onExitDemo={onExitDemo}
      onOpenPlanDetail={onOpenPlanDetail}
      onSelectGoal={handleSelectGoal}
      onPreviewPlan={rejectUnsupportedPlannerOperation}
      onDiscardPlanPreview={handleClearTransient}
      onCreatePlan={rejectUnsupportedPlannerOperation}
      onComplete={handleRecord}
      onRecordDemo={handleRecord}
      onSkip={handleSkip}
      onPreviewScenario={handlePreviewScenario}
      onClearScenario={handleClearTransient}
      onApplyScenario={handleApply}
    />
  );
}
