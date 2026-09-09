import { useEffect, useState } from "react";
import type {
  PlannerScenarioOptionViewModel,
  PlannerViewModel,
} from "./planner-api-types";
import {
  readPlannerUiSelection,
  writePlannerGoalSelection,
  writePlannerStepSelection,
} from "./planner-ui-selection";

export type JourneyStage =
  | "goal"
  | "main"
  | "planSetup"
  | "history";

export interface PlannerJourneyOperations {
  readonly onSelectGoal: (goalId: string) => void;
  readonly onPreviewPlan: () => Promise<boolean>;
  readonly onDiscardPlanPreview: () => void;
  readonly onCreatePlan: () => Promise<boolean>;
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
  const [selectedSequence, setSelectedSequenceState] = useState<number | null>(
    () => {
      const stored = readPlannerUiSelection();
      return stored.goalId === view.selectedGoal?.id ? stored.sequence : null;
    },
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );
  useEffect(() => {
    const stored = readPlannerUiSelection();
    const storedSequence =
      stored.goalId === view.selectedGoal?.id &&
      view.steps.some((step) => step.sequence === stored.sequence)
        ? stored.sequence
        : null;
    setSelectedSequenceState((current) =>
      current !== null && view.steps.some((step) => step.sequence === current)
        ? current
        : storedSequence ??
          view.nextAction?.sequence ??
          view.steps[0]?.sequence ??
          null,
    );
  }, [view.nextAction?.sequence, view.selectedGoal?.id, view.steps]);

  const setSelectedSequence = (sequence: number | null) => {
    setSelectedSequenceState(sequence);
    if (sequence !== null) {
      writePlannerStepSelection(view.selectedGoal?.id ?? null, sequence);
    }
  };

  const selectGoal = (goalId: string) => {
    operations.onSelectGoal(goalId);
    writePlannerGoalSelection(goalId);
    setSelectedScenarioId(null);
    setStage("main");
  };
  const chooseGoal = (goalId: string) => {
    operations.onSelectGoal(goalId);
    writePlannerGoalSelection(goalId);
    setSelectedScenarioId(null);
  };
  const enterSelectedGoal = () => setStage("main");
  const continueFromStatus = async () => {
    if (view.plan?.planSource === "active") {
      setStage("main");
      return;
    }
    if (view.plan?.planSource === "preview") {
      setStage("planSetup");
      return;
    }
    if (await operations.onPreviewPlan()) setStage("planSetup");
  };
  const returnFromPlanSetup = () => {
    operations.onDiscardPlanPreview();
    setStage("main");
  };
  const createPlan = async () => {
    if (await operations.onCreatePlan()) {
      setStage("main");
    }
  };
  const complete = async (amount: number, rate: number) => {
    return operations.onComplete(amount, rate);
  };
  const recordDemo = async () => {
    return operations.onRecordDemo();
  };
  const skip = async () => {
    if (await operations.onSkip()) {
      setSelectedScenarioId("missedRound");
      return true;
    }
    return false;
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
    return operations.onApplyScenario();
  };

  return {
    stage,
    setStage,
    selectedSequence,
    setSelectedSequence,
    selectedScenarioId,
    selectGoal,
    chooseGoal,
    enterSelectedGoal,
    continueFromStatus,
    returnFromPlanSetup,
    createPlan,
    complete,
    recordDemo,
    skip,
    previewScenario,
    clearScenario,
    applyScenario,
  };
}
