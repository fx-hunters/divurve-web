import type {
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
import type { PlannerLocalGoal } from "./planner-goal-input";
import {
  mergePlannerCurveDomains,
  presentPlannerCurve,
  type PlannerCurveInput,
} from "./planner-curve-presenter";

const amountFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 2,
});

function formatAmount(value: number, currencyCode: string): string {
  return `${amountFormatter.format(value)} ${currencyCode}`;
}

const SCENARIO_CODES: Readonly<
  Record<PlannerScenarioId, PlannerScenarioCode | null>
> = {
  expectedRange: null,
  rapidRise: "RATE_UP",
  decline: "RATE_DOWN",
  missedRound: "STEP_SKIPPED",
  reducedBudget: "BUDGET_DECREASED",
};

function demoStepStatus(
  status: "completed" | "next" | "upcoming" | "skipped",
  index: number,
  hasRecordedRound: boolean,
): PlannerNodeStatus {
  if (!hasRecordedRound) return status;
  if (index === 0) return "completed";
  if (index === 1) return "next";
  return status === "next" ? "upcoming" : status;
}

function demoCurveInput(
  plan: PlannerPlan,
  hasRecordedRound: boolean,
  curveData = plan.curveData,
): PlannerCurveInput {
  return {
    currencyCode: plan.goal.currencyCode,
    allocatedAmount: curveData.allocatedAmount,
    currentDate: curveData.currentDate,
    targetAmount: curveData.targetAmount,
    targetDate: curveData.targetDate,
    dataNotice: curveData.notice,
    steps: curveData.steps.map((step, index) => ({
      id: step.id,
      sequence: step.sequence,
      scheduledDate: step.scheduledDate,
      plannedAmount: step.amount,
      executedAmount:
        hasRecordedRound && index === 0 ? step.amount : step.executedAmount,
      executedDate:
        hasRecordedRound && index === 0
          ? step.scheduledDate
          : step.executedDate,
      status: demoStepStatus(step.status, index, hasRecordedRound),
    })),
  };
}

function toCurve(
  plan: PlannerPlan,
  hasRecordedRound: boolean,
  curveData = plan.curveData,
): PlannerCurveViewModel | null {
  return presentPlannerCurve(demoCurveInput(plan, hasRecordedRound, curveData));
}

function toSteps(
  plan: PlannerPlan,
  hasRecordedRound: boolean,
  curve: PlannerCurveViewModel | null,
): readonly PlannerStepViewModel[] {
  return plan.curveData.steps.map((step, index) => {
      const status = demoStepStatus(step.status, index, hasRecordedRound);
      const point = curve?.nodes.find((node) => node.sequence === step.sequence);
      const isRecorded = hasRecordedRound && index === 0;
      return {
        sequence: step.sequence,
        scheduledDate: step.scheduledDate,
        amount: step.amount,
        amountLabel: formatAmount(step.amount, plan.goal.currencyCode),
        budgetLabel: null,
        estimatedCostLabel: null,
        executedAmount: isRecorded ? step.amount : null,
        cumulativeAmount: point?.cumulativeAmount ?? 0,
        cumulativeAmountLabel: point?.cumulativeAmountLabel ?? "누적 금액 확인 불가",
        actionLabel: point?.actionLabel ?? "회차 정보 확인",
        calculationBasis: isRecorded
          ? `데모 기록 금액 ${formatAmount(step.amount, plan.goal.currencyCode)} 반영`
          : status === "skipped"
            ? "건너뛴 회차는 누적 금액에 더하지 않음"
            : `데모 응답의 회차 금액 ${formatAmount(step.amount, plan.goal.currencyCode)} 반영`,
        status,
        statusLabel: isRecorded ? "데모 기록 완료" : point?.statusLabel ?? "예정",
        sequenceLabel: `${step.sequence}회차`,
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
  localGoals: readonly PlannerLocalGoal[] = [],
): PlannerViewModel {
  const localGoal = localGoals.find((goal) => goal.id === selectedGoalId);
  if (localGoal !== undefined) {
    const goalItems = [
      ...data.plans.map((candidate) => ({
        id: candidate.id,
        name: candidate.introOption.name,
        currencyCode: candidate.introOption.currencyCode,
        targetAmountLabel: candidate.goal.targetAmountLabel,
        heldAmountLabel: candidate.goal.securedAmountLabel,
        targetDateLabel: candidate.goal.targetDateLabel,
        isSelected: false,
        planStatusLabel: "데모 계획 있음",
      })),
      ...localGoals.map((candidate) => ({
        id: candidate.id,
        name: candidate.input.name,
        currencyCode: candidate.input.currencyCode,
        targetAmountLabel: formatAmount(candidate.input.targetAmount, candidate.input.currencyCode),
        heldAmountLabel: `0 ${candidate.input.currencyCode} 배정`,
        targetDateLabel: candidate.input.targetDate,
        isSelected: candidate.id === localGoal.id,
        planStatusLabel: "계획 데이터 없음",
      })),
    ];
    return {
      goalItems,
      selectedGoal: {
        id: localGoal.id,
        name: localGoal.input.name,
        currencyCode: localGoal.input.currencyCode,
        targetAmount: localGoal.input.targetAmount,
        heldAmount: 0,
        targetDate: localGoal.input.targetDate,
        targetDateLabel: localGoal.input.targetDate,
        targetAmountLabel: formatAmount(localGoal.input.targetAmount, localGoal.input.currencyCode),
        heldAmountLabel: `0 ${localGoal.input.currencyCode} 배정`,
        remainingAmountLabel: formatAmount(
          localGoal.input.targetAmount,
          localGoal.input.currencyCode,
        ),
        heldAmountBasisLabel: "새 데모 목표에는 배정한 외화가 없습니다.",
        progressPercent: 0,
        progressLabel: "데모 목표 배정 상태",
      },
      plan: null,
      curveNodes: [],
      curve: null,
      steps: [],
      nextAction: null,
      dataSource: { kind: "demo", label: data.dataNotice.sourceLabel },
      supportedActions: {
        canPreviewPlan: false,
        canCreatePlan: false,
        canCompleteStep: false,
        canSkipStep: false,
        canPreviewScenario: false,
        canApplyDraft: false,
      },
      unsupportedAreas: ["데모 입력으로 계획 계산", "실제 서버 저장"],
      planAvailabilityMessage:
        "입력한 목표는 이 화면에만 추가했습니다. 회차 데이터가 없어 Curve는 기존 데모 목표에서 확인할 수 있습니다.",
      scenarioOptions: [],
    };
  }
  const plan = findDemoPlan(data, selectedGoalId);
  const scenario = findScenario(plan, appliedScenarioId);
  const curve = toCurve(plan, hasRecordedRound);
  const steps = toSteps(plan, hasRecordedRound, curve);
  const nextStep = steps.find((step) => step.status === "next");
  const nextActionCopy = hasRecordedRound
    ? plan.recordedState.action
    : plan.action;
  const demoCurrentAmount =
    plan.curveData.allocatedAmount +
    (hasRecordedRound ? plan.curveData.steps[0]?.amount ?? 0 : 0);
  const demoProgress =
    plan.curveData.targetAmount === null || plan.curveData.targetAmount <= 0
      ? plan.goal.progressPercent
      : Math.min(100, (demoCurrentAmount / plan.curveData.targetAmount) * 100);

  return {
    goalItems: [
      ...data.plans.map((candidate) => ({
      id: candidate.id,
      name: candidate.introOption.name,
      currencyCode: candidate.introOption.currencyCode,
      targetAmountLabel: candidate.goal.targetAmountLabel,
      heldAmountLabel: candidate.goal.securedAmountLabel,
      targetDateLabel: candidate.goal.targetDateLabel,
      isSelected: candidate.id === plan.id,
      planStatusLabel: "데모 계획 있음",
      })),
      ...localGoals.map((candidate) => ({
        id: candidate.id,
        name: candidate.input.name,
        currencyCode: candidate.input.currencyCode,
        targetAmountLabel: formatAmount(candidate.input.targetAmount, candidate.input.currencyCode),
        heldAmountLabel: `0 ${candidate.input.currencyCode} 배정`,
        targetDateLabel: candidate.input.targetDate,
        isSelected: false,
        planStatusLabel: "계획 데이터 없음",
      })),
    ],
    selectedGoal: {
      id: plan.id,
      name: plan.goal.name,
      currencyCode: plan.goal.currencyCode,
      targetAmount: plan.curveData.targetAmount,
      heldAmount: demoCurrentAmount,
      targetDate: plan.curveData.targetDate,
      targetDateLabel: plan.goal.targetDateLabel,
      targetAmountLabel: plan.goal.targetAmountLabel,
      heldAmountLabel: plan.goal.securedAmountLabel,
      remainingAmountLabel:
        plan.curveData.targetAmount === null
          ? "제공되지 않음"
          : formatAmount(
              Math.max(
                0,
                plan.curveData.targetAmount - demoCurrentAmount,
              ),
              plan.goal.currencyCode,
            ),
      heldAmountBasisLabel:
        "체험용 데이터의 배정 외화와 이 화면에서 기록한 회차만 반영합니다.",
      progressPercent: demoProgress,
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
      estimatedCostLabel: null,
      policyVersion: "체험용 데이터",
      calculatedAtLabel: plan.curveData.currentDate,
      rateAsOfLabel: null,
      disclaimer: data.dataNotice.notice,
      warnings: [],
      summaryText:
        scenario.id === plan.baseScenarioId
          ? plan.plan.description
          : scenario.summary,
    },
    curveNodes: curve?.nodes ?? [],
    curve,
    steps,
    nextAction:
      nextStep === undefined
        ? null
        : {
            planId: plan.id,
            sequence: nextStep.sequence,
            scheduledDate: nextStep.scheduledDate,
            amount: nextStep.amount,
            amountLabel: nextStep.amountLabel,
            title: `${nextStep.sequence}회차 준비 내용 확인`,
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
    planAvailabilityMessage: "브라우저에서만 사용하는 체험용 계획입니다.",
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
  const baseInput = demoCurveInput(plan, false);
  const alternativeInput =
    scenario.curveData === undefined
      ? null
      : demoCurveInput(plan, false, scenario.curveData);
  const firstBaseCurve = presentPlannerCurve(baseInput);
  const firstAlternativeCurve =
    alternativeInput === null ? null : presentPlannerCurve(alternativeInput);
  const sharedDomain =
    firstBaseCurve === null || firstAlternativeCurve === null
      ? null
      : mergePlannerCurveDomains(
          firstBaseCurve.domain,
          firstAlternativeCurve.domain,
        );
  const baseCurve =
    sharedDomain === null
      ? firstBaseCurve
      : presentPlannerCurve(baseInput, sharedDomain);
  const alternativeCurve =
    sharedDomain === null || alternativeInput === null
      ? firstAlternativeCurve
      : presentPlannerCurve(alternativeInput, sharedDomain);
  const baseBySequence = new Map(
    plan.curveData.steps.map((step) => [step.sequence, step]),
  );
  const changedNodeIds =
    alternativeCurve?.nodes
      .filter((node) => {
        const before = baseBySequence.get(node.sequence);
        const after = scenario.curveData?.steps.find(
          (step) => step.sequence === node.sequence,
        );
        return (
          before === undefined ||
          after === undefined ||
          before.scheduledDate !== after.scheduledDate ||
          before.amount !== after.amount ||
          before.status !== after.status
        );
      })
      .map((node) => node.id) ?? [];
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
    baseCurve,
    alternativeCurve,
    changedNodeIds,
    warnings: ["체험용 변경이며 이 브라우저 화면에서만 적용됩니다."],
  };
}
