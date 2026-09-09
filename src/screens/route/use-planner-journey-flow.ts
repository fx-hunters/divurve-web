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

/** 목표 하나를 고른 뒤의 단계. */
export type PlannerGoalStage = "main" | "planSetup" | "history" | "edit";

export type JourneyStage = "goal" | PlannerGoalStage;

/**
 * 단계 이동을 화면 밖으로 넘기는 계약.
 *
 * 단계를 이 훅이 `useState`로 들고 있으면 주소창이 단계를 모른다 — 새로고침하면
 * 첫 단계로 돌아가고, 뒤로가기는 플래너 전체를 벗어난다. 그래서 현재 단계는
 * 받아서 쓰고, 이동은 호출부(주소를 아는 쪽)에 맡긴다.
 */
export interface PlannerJourneyNavigation {
  readonly stage: JourneyStage;
  /** 목표 선택으로 돌아간다. 주소에서 목표가 빠진다. */
  readonly onOpenGoalSelect: () => void;
  /** 목표 하나의 단계를 연다. 목표를 바꾸는 이동도 이 함수로 한다. */
  readonly onOpenGoalStage: (goalId: string, stage: PlannerGoalStage) => void;
}

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
  navigation: PlannerJourneyNavigation,
) {
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

  const goalId = view.selectedGoal?.id ?? null;

  const setSelectedSequence = (sequence: number | null) => {
    setSelectedSequenceState(sequence);
    if (sequence !== null) {
      writePlannerStepSelection(goalId, sequence);
    }
  };

  /** 목표를 골라 곧바로 들어간다. 주소가 그 목표를 가리키게 된다. */
  const selectGoal = (nextGoalId: string) => {
    operations.onSelectGoal(nextGoalId);
    writePlannerGoalSelection(nextGoalId);
    setSelectedScenarioId(null);
    navigation.onOpenGoalStage(nextGoalId, "main");
  };
  /** 목록에서 강조만 바꾼다. 아직 이동하지 않는다. */
  const chooseGoal = (nextGoalId: string) => {
    operations.onSelectGoal(nextGoalId);
    writePlannerGoalSelection(nextGoalId);
    setSelectedScenarioId(null);
  };
  const openStage = (stage: PlannerGoalStage) => {
    if (goalId !== null) navigation.onOpenGoalStage(goalId, stage);
  };
  const enterSelectedGoal = () => openStage("main");
  const openHistory = () => openStage("history");
  const openEdit = () => openStage("edit");
  const backToGoals = () => navigation.onOpenGoalSelect();
  const continueFromStatus = async () => {
    if (view.plan?.planSource === "active") {
      openStage("main");
      return;
    }
    if (view.plan?.planSource === "preview") {
      openStage("planSetup");
      return;
    }
    if (await operations.onPreviewPlan()) openStage("planSetup");
  };
  const returnFromPlanSetup = () => {
    operations.onDiscardPlanPreview();
    openStage("main");
  };
  const createPlan = async () => {
    if (await operations.onCreatePlan()) openStage("main");
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
    stage: navigation.stage,
    selectedSequence,
    setSelectedSequence,
    selectedScenarioId,
    selectGoal,
    chooseGoal,
    enterSelectedGoal,
    openHistory,
    openEdit,
    backToGoals,
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
