import { useEffect, useState } from "react";
import type {
  PlannerScenarioOptionViewModel,
  PlannerViewModel,
} from "./planner-api-types";

export type JourneyStage =
  | "goal"
  | "status"
  | "planSetup"
  | "curve"
  | "action"
  | "scenario"
  | "confirm"
  | "result"
  | "noPlan";

export interface PlannerJourneyOperations {
  readonly onSelectGoal: (goalId: string) => void;
  readonly onPreviewPlan?: () => Promise<boolean>;
  readonly onCreatePlan?: () => Promise<boolean>;
  readonly onComplete: (amount: number, rate: number) => Promise<boolean>;
  readonly onRecordDemo: () => Promise<boolean>;
  readonly onSkip: () => Promise<boolean>;
  readonly onPreviewScenario: (
    option: PlannerScenarioOptionViewModel,
    newBudgetKrw?: number,
  ) => Promise<boolean>;
  readonly onClearScenario: () => void;
  readonly onApplyScenario: () => Promise<boolean>;
}

export function usePlannerJourneyFlow(
  view: PlannerViewModel,
  operations: PlannerJourneyOperations,
) {
  const [stage, setStage] = useState<JourneyStage>("goal");
  const [selectedSequence, setSelectedSequence] = useState<number | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );
  const [resultTitle, setResultTitle] = useState("현재 계획을 확인했습니다");

  useEffect(() => {
    setSelectedSequence(view.nextAction?.sequence ?? view.steps[0]?.sequence ?? null);
  }, [view.nextAction?.sequence, view.selectedGoal?.id, view.steps]);

  const selectGoal = (goalId: string) => {
    operations.onSelectGoal(goalId);
    setSelectedScenarioId(null);
    setStage("status");
  };
  const continueFromStatus = async () => {
    if (view.plan !== null) {
      setStage("curve");
      return;
    }
    if (operations.onPreviewPlan === undefined) {
      setStage("noPlan");
      return;
    }
    if (await operations.onPreviewPlan()) setStage("planSetup");
  };
  const createPlan = async () => {
    if (
      operations.onCreatePlan !== undefined &&
      (await operations.onCreatePlan())
    ) {
      setStage("curve");
    }
  };
  const complete = async (amount: number, rate: number) => {
    if (await operations.onComplete(amount, rate)) {
      setResultTitle("이번 회차 기록을 마쳤습니다");
      setStage("result");
    }
  };
  const recordDemo = async () => {
    if (await operations.onRecordDemo()) {
      setResultTitle("이번 회차를 데모로 기록했습니다");
      setStage("result");
    }
  };
  const skip = async () => {
    if (await operations.onSkip()) {
      setSelectedScenarioId("missedRound");
      setStage("scenario");
    }
  };
  const previewScenario = async (
    option: PlannerScenarioOptionViewModel,
    newBudgetKrw?: number,
  ) => {
    setSelectedScenarioId(option.id);
    await operations.onPreviewScenario(option, newBudgetKrw);
  };
  const clearScenario = () => {
    setSelectedScenarioId(null);
    operations.onClearScenario();
  };
  const applyScenario = async () => {
    if (await operations.onApplyScenario()) {
      setResultTitle(
        view.dataSource.kind === "demo"
          ? "대체 경로를 데모에 적용했습니다"
          : "대체 계획을 적용했습니다",
      );
      setStage("result");
    }
  };

  return {
    stage,
    setStage,
    selectedSequence,
    setSelectedSequence,
    selectedScenarioId,
    resultTitle,
    selectGoal,
    continueFromStatus,
    createPlan,
    complete,
    recordDemo,
    skip,
    previewScenario,
    clearScenario,
    applyScenario,
  };
}
