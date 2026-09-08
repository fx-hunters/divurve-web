import type {
  PlannerCheckpointData,
  PlannerPlan,
  PlannerScenario,
  PlannerScenarioId,
  RoutePlanData,
} from "../../types/route";
import type { PlannerScenarioCode } from "../../api/planner-contract";
import type {
  PlannerCurveViewModel,
  PlannerNodeStatus,
  PlannerScenarioComparisonViewModel,
  PlannerScenarioOptionViewModel,
  PlannerStepViewModel,
  PlannerViewModel,
} from "./planner-api-types";

const SCENARIO_CODES: Readonly<
  Record<PlannerScenarioId, PlannerScenarioCode | null>
> = {
  expectedRange: null,
  rapidRise: "RATE_UP",
  decline: "RATE_DOWN",
  missedRound: "STEP_SKIPPED",
  reducedBudget: "BUDGET_DECREASED",
};

function toNodeStatus(
  status: PlannerCheckpointData["status"],
): PlannerNodeStatus {
  const statusMap: Readonly<
    Record<PlannerCheckpointData["status"], PlannerNodeStatus>
  > = {
    complete: "completed",
    next: "next",
    upcoming: "upcoming",
    destination: "destination",
  };
  return statusMap[status];
}

function toCurve(scenario: PlannerScenario): PlannerCurveViewModel {
  const checkpoints = scenario.checkpoints;
  const destinationSource = checkpoints.find(
    (checkpoint) => checkpoint.status === "destination",
  );
  return {
    viewBox: "0 0 100 100",
    accessibleLabel: scenario.curve.accessibleLabel,
    path: normalizeDemoPath(scenario.curve.path),
    nodes: checkpoints
      .filter((checkpoint) => checkpoint.status !== "destination")
      .map((checkpoint, index) => ({
        id: checkpoint.id,
        sequence: index + 1,
        x: checkpoint.x / 10,
        y: checkpoint.y / 4.5,
        status: toNodeStatus(checkpoint.status),
        statusLabel: checkpoint.statusLabel,
        roundLabel: checkpoint.label,
      })),
    destination:
      destinationSource === undefined
        ? null
        : {
            id: destinationSource.id,
            x: destinationSource.x / 10,
            y: destinationSource.y / 4.5,
            status: "destination",
            statusLabel: destinationSource.statusLabel,
            label: destinationSource.label,
            targetAmountLabel: destinationSource.amountLabel,
            targetDateLabel: destinationSource.detail,
          },
  };
}

/** 기존 1000×450 데모 좌표를 공통 100×100 표시 좌표로만 변환한다. */
function normalizeDemoPath(path: string): string {
  let coordinateIndex = 0;
  return path.replace(/-?\d+(?:\.\d+)?/g, (value) => {
    const coordinate = Number(value);
    const normalized =
      coordinateIndex % 2 === 0 ? coordinate / 10 : coordinate / 4.5;
    coordinateIndex += 1;
    return String(Number(normalized.toFixed(2)));
  });
}

function toSteps(
  scenario: PlannerScenario,
  hasRecordedRound: boolean,
): readonly PlannerStepViewModel[] {
  return scenario.checkpoints
    .filter((checkpoint) => checkpoint.status !== "destination")
    .map((checkpoint, index) => {
      const isRecordedNext = hasRecordedRound && checkpoint.status === "next";
      const status = isRecordedNext
        ? "completed"
        : toNodeStatus(checkpoint.status);
      return {
        sequence: index + 1,
        scheduledDate: checkpoint.detail,
        amount: null,
        amountLabel: checkpoint.amountLabel,
        budgetLabel: null,
        estimatedCostLabel: null,
        executedAmount: isRecordedNext ? 0 : null,
        status,
        statusLabel: isRecordedNext ? "데모 기록 완료" : checkpoint.statusLabel,
        sequenceLabel: checkpoint.label,
      };
    });
}

function scenarioOptions(plan: PlannerPlan): readonly PlannerScenarioOptionViewModel[] {
  return plan.scenarios.map((scenario) => ({
    id: scenario.id,
    label: scenario.label,
    description: scenario.summary,
    scenarioCode: SCENARIO_CODES[scenario.id],
    isCurrent: scenario.id === plan.baseScenarioId,
    requiresBudget: scenario.id === "reducedBudget",
  }));
}

export function findDemoPlan(
  data: RoutePlanData,
  selectedGoalId?: string | null,
): PlannerPlan {
  return (
    data.plans.find((plan) => plan.id === selectedGoalId) ?? data.plans[0]
  );
}

function findScenario(
  plan: PlannerPlan,
  scenarioId?: string | null,
): PlannerScenario {
  return (
    plan.scenarios.find((scenario) => scenario.id === scenarioId) ??
    plan.scenarios.find((scenario) => scenario.id === plan.baseScenarioId) ??
    plan.scenarios[0]
  );
}

export function presentDemoPlanner(
  data: RoutePlanData,
  selectedGoalId?: string | null,
  appliedScenarioId?: string | null,
  hasRecordedRound = false,
): PlannerViewModel {
  const plan = findDemoPlan(data, selectedGoalId);
  const scenario = findScenario(plan, appliedScenarioId);
  const steps = toSteps(scenario, hasRecordedRound);
  const nextCheckpoint = hasRecordedRound
    ? scenario.checkpoints.find(
        (checkpoint) => checkpoint.id === plan.recordedState.nextCheckpointId,
      )
    : scenario.checkpoints.find((checkpoint) => checkpoint.status === "next");
  const nextActionCopy = hasRecordedRound
    ? plan.recordedState.action
    : plan.action;

  return {
    goalItems: data.plans.map((candidate) => ({
      id: candidate.id,
      name: candidate.introOption.name,
      currencyCode: candidate.introOption.currencyCode,
      targetAmountLabel: candidate.goal.targetAmountLabel,
      heldAmountLabel: candidate.goal.securedAmountLabel,
      targetDateLabel: candidate.goal.targetDateLabel,
      isSelected: candidate.id === plan.id,
    })),
    selectedGoal: {
      id: plan.id,
      name: plan.goal.name,
      currencyCode: plan.goal.currencyCode,
      targetAmount: null,
      heldAmount: null,
      targetDate: null,
      targetDateLabel: plan.goal.targetDateLabel,
      targetAmountLabel: plan.goal.targetAmountLabel,
      heldAmountLabel: plan.goal.securedAmountLabel,
      progressPercent: plan.goal.progressPercent,
      progressLabel: plan.goal.progressLabel,
    },
    plan: {
      planSource: "active",
      id: plan.id,
      version: null,
      versionLabel: "체험용",
      status: "demo",
      statusLabel: plan.plan.statusLabel,
      planEndDateLabel: plan.goal.targetDateLabel,
      totalRounds: plan.rounds.items.length,
      completedRounds: hasRecordedRound ? 1 : 0,
      scheduledRounds: Math.max(0, plan.rounds.items.length - (hasRecordedRound ? 1 : 0)),
      skippedRounds: 0,
      nextActionSeq:
        nextCheckpoint === undefined
          ? null
          : steps.find(
              (step) => step.scheduledDate === nextCheckpoint.detail,
            )?.sequence ?? null,
      estimatedCostLabel: null,
      budgetStateLabel: null,
      policyVersion: "체험용 fixture",
      disclaimer: data.dataNotice.notice,
      warnings: [],
      summaryText: plan.plan.description,
    },
    curveNodes: toCurve(scenario).nodes,
    curve: toCurve(scenario),
    steps,
    nextAction:
      nextCheckpoint === undefined
        ? null
        : {
            planId: plan.id,
            sequence:
              steps.find(
                (step) => step.scheduledDate === nextCheckpoint.detail,
              )!.sequence,
            scheduledDate: nextActionCopy.dueLabel,
            amount: null,
            amountLabel: nextActionCopy.amountLabel,
            title: nextActionCopy.title,
            description: nextActionCopy.description,
          },
    dataSource: { kind: "demo", label: data.dataNotice.sourceLabel },
    supportedActions: {
      canPreviewPlan: false,
      canCreatePlan: false,
      canCompleteStep: !hasRecordedRound,
      canSkipStep: !hasRecordedRound,
      canPreviewScenario: true,
      canApplyDraft: true,
    },
    unsupportedAreas: [
      "실제 서버 저장",
      "금융 수치 계산",
      "실제 환전 실행",
    ],
    scenarioOptions: scenarioOptions(plan),
  };
}

export function presentDemoScenarioComparison(
  data: RoutePlanData,
  selectedGoalId: string,
  scenarioId: string,
): PlannerScenarioComparisonViewModel | null {
  const plan = findDemoPlan(data, selectedGoalId);
  const scenario = plan.scenarios.find((candidate) => candidate.id === scenarioId);
  if (scenario === undefined || scenario.id === plan.baseScenarioId) return null;
  const baseScenario = findScenario(plan, plan.baseScenarioId);
  return {
    id: scenario.id,
    label: scenario.label,
    reason: scenario.changeReason,
    nextAction: scenario.nextAction,
    draftPlanId: scenario.id,
    rows: [
      {
        label: "계획 경로",
        before: baseScenario.summary,
        after: scenario.summary,
      },
      {
        label: "다음 행동",
        before: baseScenario.nextAction,
        after: scenario.nextAction,
      },
    ],
    alternativeCurve: toCurve(scenario),
    changedNodeIds: scenario.changedCheckpointIds,
    warnings: ["체험용 변경이며 이 브라우저 화면에서만 적용됩니다."],
  };
}
