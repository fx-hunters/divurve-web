import { useState } from "react";
import type { RoutePlanData } from "../../types/route";
import {
  presentDemoPlanner,
  presentDemoScenarioComparison,
} from "./planner-demo-adapter";
import type {
  PlannerScenarioComparisonViewModel,
  PlannerScenarioOptionViewModel,
} from "./planner-api-types";
import {
  PlannerJourneyScreen,
  type PlannerJourneyFeedback,
} from "./planner-journey-screen";

interface PlannerDemoScreenProps {
  readonly data: RoutePlanData;
}

export function PlannerDemoScreen({ data }: PlannerDemoScreenProps) {
  const initialPlan = data.plans[0];
  const [selectedGoalId, setSelectedGoalId] = useState(initialPlan.id);
  const [appliedScenarioId, setAppliedScenarioId] = useState<string>(
    initialPlan.baseScenarioId,
  );
  const [hasRecordedRound, setRecordedRound] = useState(false);
  const [comparison, setComparison] =
    useState<PlannerScenarioComparisonViewModel | null>(null);
  const [feedback, setFeedback] = useState<PlannerJourneyFeedback>({
    status: "idle",
  });
  const view = presentDemoPlanner(
    data,
    selectedGoalId,
    appliedScenarioId,
    hasRecordedRound,
  );

  const handleSelectGoal = (goalId: string) => {
    const plan = data.plans.find((candidate) => candidate.id === goalId);
    if (plan === undefined) return;
    setSelectedGoalId(goalId);
    setAppliedScenarioId(plan.baseScenarioId);
    setRecordedRound(false);
    setComparison(null);
    setFeedback({ status: "idle" });
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
    );
    setComparison(result);
    setFeedback(
      result === null
        ? { status: "idle" }
        : {
            status: "success",
            message:
              "체험용 대체 경로입니다. 확인 전에는 현재 데모 계획이 유지됩니다.",
          },
    );
    return result !== null;
  };
  const handleApply = async () => {
    if (comparison === null) return false;
    setAppliedScenarioId(comparison.id);
    setComparison(null);
    setFeedback({
      status: "success",
      message:
        "선택한 경로를 이 데모 화면에만 적용했습니다. 서버 데이터는 바뀌지 않았습니다.",
    });
    return true;
  };

  return (
    <PlannerJourneyScreen
      ariaLabel="데모 플래너"
      view={view}
      feedback={feedback}
      scenarioComparison={comparison}
      onSelectGoal={handleSelectGoal}
      onComplete={async () => false}
      onRecordDemo={handleRecord}
      onSkip={handleSkip}
      onPreviewScenario={handlePreviewScenario}
      onClearScenario={() => {
        setComparison(null);
        setFeedback({ status: "idle" });
      }}
      onApplyScenario={handleApply}
    />
  );
}
