import type {
  PlannerPlan,
  PlannerScenario,
  PlannerScenarioId,
  RoutePlanData,
} from "../../types/route";
import type { PlannerScenarioCode } from "../../api/planner-contract";
import type {
  PlannerCurveViewModel,
  PlannerStepNodeStatus,
  PlannerScenarioComparisonViewModel,
  PlannerScenarioOptionViewModel,
  PlannerStepViewModel,
  PlannerViewModel,
} from "./planner-api-types";
import type { PlannerLocalGoal } from "./planner-goal-input";
import {
  EMPTY_PLANNER_DEMO_PROGRESS,
  getPlannerDemoGoalProgress,
  type PlannerDemoGoalProgress,
  type PlannerDemoProgress,
} from "./planner-demo-progress";
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
  sequence: number,
  nextSequence: number | null,
  recordedSequences: ReadonlySet<number>,
): PlannerStepNodeStatus {
  if (status === "completed" || recordedSequences.has(sequence)) {
    return "completed";
  }
  if (status === "skipped") return "skipped";
  return sequence === nextSequence ? "next" : "upcoming";
}

function nextDemoSequence(
  plan: PlannerPlan,
  progress: PlannerDemoGoalProgress,
  curveData: PlannerPlan["curveData"],
): number | null {
  const recorded = knownRecordedSequences(plan, progress);
  return (
    [...curveData.steps]
      .sort((first, second) => first.sequence - second.sequence)
      .find(
        (step) =>
          !recorded.has(step.sequence) &&
          step.status !== "completed" &&
          step.status !== "skipped",
      )?.sequence ??
    [...plan.curveData.steps]
      .sort((first, second) => first.sequence - second.sequence)
      .find(
        (step) =>
          !recorded.has(step.sequence) && step.status !== "completed",
      )?.sequence ??
    null
  );
}

function demoCurrentAmount(
  plan: PlannerPlan,
  progress: PlannerDemoGoalProgress,
): number {
  const seededAmount = plan.curveData.steps
    .filter((step) => step.status === "completed")
    .reduce((sum, step) => sum + Math.max(0, step.executedAmount), plan.curveData.allocatedAmount);
  return [...new Set(progress.recordedSequences)].reduce((sum, sequence) => {
    const step = recordedDemoStep(plan, progress, sequence);
    return step === undefined || step.status === "completed"
      ? sum : sum + Math.max(0, step.amount);
  }, seededAmount);
}

function recordedDemoStep(plan: PlannerPlan, progress: PlannerDemoGoalProgress, sequence: number) {
  const scenario = findScenario(plan, progress.recordedScenarioIds?.[sequence]);
  return (scenario.curveData ?? plan.curveData).steps.find((step) => step.sequence === sequence);
}

function knownRecordedSequences(plan: PlannerPlan, progress: PlannerDemoGoalProgress): ReadonlySet<number> {
  return new Set(progress.recordedSequences.filter((sequence) =>
    recordedDemoStep(plan, progress, sequence) !== undefined,
  ));
}

function demoCurveInput(
  plan: PlannerPlan,
  progress: PlannerDemoGoalProgress,
  curveData = plan.curveData,
): PlannerCurveInput {
  const recorded = knownRecordedSequences(plan, progress);
  const nextSequence = nextDemoSequence(plan, progress, curveData);
  const latestRecordedDate = [...recorded]
    .map((sequence) => recordedDemoStep(plan, progress, sequence)?.scheduledDate)
    .filter((date): date is string => date !== undefined).sort().pop();
  return {
    currencyCode: plan.goal.currencyCode,
    baselineAmount: plan.curveData.allocatedAmount,
    currentAmount: demoCurrentAmount(plan, progress),
    currentDate: latestRecordedDate ?? curveData.currentDate,
    targetAmount: curveData.targetAmount,
    targetDate: curveData.targetDate,
    dataNotice: curveData.notice,
    steps: curveData.steps.map((step) => {
      const confirmedStep = progress.recordedSequences.includes(step.sequence)
        ? recordedDemoStep(plan, progress, step.sequence) ?? step
        : step;
      const status = demoStepStatus(
        confirmedStep.status,
        confirmedStep.sequence,
        nextSequence,
        recorded,
      );
      return {
        id: confirmedStep.id,
        sequence: confirmedStep.sequence,
        scheduledDate: confirmedStep.scheduledDate,
        plannedAmount: confirmedStep.amount,
        executedAmount:
          status === "completed"
            ? confirmedStep.executedAmount > 0
              ? confirmedStep.executedAmount
              : confirmedStep.amount
            : 0,
        executedDate:
          status === "completed"
            ? confirmedStep.executedDate ?? confirmedStep.scheduledDate
            : null,
        status,
      };
    }),
  };
}

function toCurve(
  plan: PlannerPlan,
  progress: PlannerDemoGoalProgress,
  curveData = plan.curveData,
): PlannerCurveViewModel | null {
  return presentPlannerCurve(demoCurveInput(plan, progress, curveData));
}

function toSteps(
  plan: PlannerPlan,
  progress: PlannerDemoGoalProgress,
  curve: PlannerCurveViewModel | null,
  curveData = plan.curveData,
): readonly PlannerStepViewModel[] {
  const recorded = knownRecordedSequences(plan, progress);
  const nextSequence = nextDemoSequence(plan, progress, curveData);
  return curveData.steps.map((step) => {
    const confirmedStep = progress.recordedSequences.includes(step.sequence)
      ? recordedDemoStep(plan, progress, step.sequence) ?? step
      : step;
    const status = demoStepStatus(
      confirmedStep.status,
      confirmedStep.sequence,
      nextSequence,
      recorded,
    );
    const point = curve?.nodes.find((node) => node.sequence === step.sequence);
    const isRecorded =
      recorded.has(confirmedStep.sequence) ||
      confirmedStep.status === "completed";
    return {
      sequence: confirmedStep.sequence,
      scheduledDate: confirmedStep.scheduledDate,
      amount: confirmedStep.amount,
      amountLabel: formatAmount(confirmedStep.amount, plan.goal.currencyCode),
      budgetLabel: null,
      estimatedCostLabel: null,
      executedAmount: isRecorded
        ? confirmedStep.executedAmount > 0
          ? confirmedStep.executedAmount
          : confirmedStep.amount
        : null,
      executedDate: isRecorded
        ? confirmedStep.executedDate ?? confirmedStep.scheduledDate
        : null,
      cumulativeAmount: point?.cumulativeAmount ?? 0,
      cumulativeAmountLabel:
        point?.cumulativeAmountLabel ?? "누적 금액 확인 불가",
      actionLabel: point?.actionLabel ?? "회차 정보 확인",
      calculationBasis: isRecorded
        ? `데모 기록 금액 ${formatAmount(confirmedStep.amount, plan.goal.currencyCode)} 반영`
        : status === "skipped"
          ? "건너뛴 회차는 누적 금액에 더하지 않음"
          : `데모 응답의 회차 금액 ${formatAmount(confirmedStep.amount, plan.goal.currencyCode)} 반영`,
      status,
      statusLabel: isRecorded
        ? "데모 기록 완료"
        : point?.statusLabel ?? "예정",
      sequenceLabel: `${step.sequence}회차`,
    };
  });
}

function scenarioOptions(plan: PlannerPlan, currentScenarioId: string): readonly PlannerScenarioOptionViewModel[] {
  return plan.scenarios.map((scenario) => ({
    id: scenario.id,
    label: scenario.label,
    description: scenario.summary,
    scenarioCode: SCENARIO_CODES[scenario.id],
    isCurrent: scenario.id === currentScenarioId,
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
  progress: PlannerDemoProgress = EMPTY_PLANNER_DEMO_PROGRESS,
  localGoals: readonly PlannerLocalGoal[] = [],
): PlannerViewModel {
  const localGoal = localGoals.find((goal) => goal.id === selectedGoalId);
  if (localGoal !== undefined) {
    const goalItems = [
      ...data.plans.map((candidate) => {
        const candidateProgress = getPlannerDemoGoalProgress(
          progress,
          candidate.id,
        );
        return {
          id: candidate.id,
          name: candidate.introOption.name,
          currencyCode: candidate.introOption.currencyCode,
          targetAmountLabel: candidate.goal.targetAmountLabel,
          heldAmountLabel: `${formatAmount(
            demoCurrentAmount(candidate, candidateProgress),
            candidate.goal.currencyCode,
          )} 확보`,
          targetDateLabel: candidate.goal.targetDateLabel,
          isSelected: false,
          planStatusLabel: "데모 계획 있음",
        };
      }),
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
  const goalProgress = getPlannerDemoGoalProgress(progress, plan.id);
  const scenario = findScenario(plan, goalProgress.appliedScenarioId);
  const appliedCurveData = scenario.curveData ?? plan.curveData;
  const curve = toCurve(plan, goalProgress, appliedCurveData);
  const steps = toSteps(plan, goalProgress, curve, appliedCurveData);
  const nextStep = steps.find((step) => step.status === "next");
  const nextActionCopy = goalProgress.recordedSequences.length > 0
    ? plan.recordedState.action
    : plan.action;
  const currentAmount = demoCurrentAmount(plan, goalProgress);
  const demoProgress =
    plan.curveData.targetAmount === null || plan.curveData.targetAmount <= 0
      ? plan.goal.progressPercent
      : Math.min(100, (currentAmount / plan.curveData.targetAmount) * 100);

  return {
    goalItems: [
      ...data.plans.map((candidate) => {
        const candidateProgress = getPlannerDemoGoalProgress(
          progress,
          candidate.id,
        );
        return {
          id: candidate.id,
          name: candidate.introOption.name,
          currencyCode: candidate.introOption.currencyCode,
          targetAmountLabel: candidate.goal.targetAmountLabel,
          heldAmountLabel: `${formatAmount(
            demoCurrentAmount(candidate, candidateProgress),
            candidate.goal.currencyCode,
          )} 확보`,
          targetDateLabel: candidate.goal.targetDateLabel,
          isSelected: candidate.id === plan.id,
          planStatusLabel: "데모 계획 있음",
        };
      }),
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
      heldAmount: currentAmount,
      targetDate: plan.curveData.targetDate,
      targetDateLabel: plan.goal.targetDateLabel,
      targetAmountLabel: plan.goal.targetAmountLabel,
      heldAmountLabel: `${formatAmount(currentAmount, plan.goal.currencyCode)} 확보`,
      remainingAmountLabel:
        plan.curveData.targetAmount === null
          ? "제공되지 않음"
          : formatAmount(
              Math.max(
                0,
                plan.curveData.targetAmount - currentAmount,
              ),
              plan.goal.currencyCode,
            ),
      heldAmountBasisLabel:
        "체험용 데이터의 배정 외화와 이 화면에서 기록한 회차만 반영합니다.",
      progressPercent: demoProgress,
      progressLabel: `외화 확보율 ${Math.round(demoProgress)}% (데모)`,
    },
    plan: {
      planSource: "active",
      id: plan.id,
      version: null,
      versionLabel: "체험용",
      status: "demo",
      statusLabel: plan.plan.statusLabel,
      planEndDateLabel: plan.goal.targetDateLabel,
      totalRounds: steps.length,
      completedRounds: steps.filter((step) => step.status === "completed").length,
      scheduledRounds: steps.filter(
        (step) => step.status === "next" || step.status === "upcoming",
      ).length,
      skippedRounds: steps.filter((step) => step.status === "skipped").length,
      nextActionSeq: nextStep?.sequence ?? null,
      estimatedCostLabel: null,
      budgetStateLabel: null,
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
      canCompleteStep: nextStep !== undefined,
      canSkipStep: nextStep !== undefined,
      canPreviewScenario: nextStep !== undefined,
      canApplyDraft: true,
    },
    unsupportedAreas: [
      "실제 서버 저장",
      "금융 수치 계산",
      "실제 환전 실행",
    ],
    planAvailabilityMessage: "브라우저에서만 사용하는 체험용 계획입니다.",
    scenarioOptions: scenarioOptions(plan, scenario.id),
  };
}

export function presentDemoScenarioComparison(
  data: RoutePlanData,
  selectedGoalId: string,
  scenarioId: string,
  progress: PlannerDemoProgress = EMPTY_PLANNER_DEMO_PROGRESS,
): PlannerScenarioComparisonViewModel | null {
  const plan = findDemoPlan(data, selectedGoalId);
  const scenario = plan.scenarios.find((candidate) => candidate.id === scenarioId);
  const goalProgress = getPlannerDemoGoalProgress(progress, plan.id);
  const baseScenario = findScenario(plan, goalProgress.appliedScenarioId);
  if (scenario === undefined || scenario.id === baseScenario.id) return null;
  const nextAction = presentDemoPlanner(data, selectedGoalId, progress).nextAction;
  const baseInput = demoCurveInput(plan, goalProgress, baseScenario.curveData ?? plan.curveData);
  const alternativeInput =
    scenario.curveData === undefined
      ? null
      : demoCurveInput(plan, goalProgress, scenario.curveData);
  const firstBaseCurve = presentPlannerCurve(baseInput);
  const baseBySequence = new Map(
    baseInput.steps.map((step) => [step.sequence, step]),
  );
  const hasPathChange =
    alternativeInput?.steps.some((step) => {
      const before = baseBySequence.get(step.sequence);
      return (
        step.status !== "completed" &&
        (before === undefined ||
          before.scheduledDate !== step.scheduledDate ||
          before.plannedAmount !== step.plannedAmount ||
          before.status === "skipped" ||
          step.status === "skipped")
      );
    }) ?? false;
  const firstAlternativeCurve =
    alternativeInput === null || !hasPathChange
      ? null
      : presentPlannerCurve(alternativeInput);
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
    sharedDomain === null || alternativeInput === null || !hasPathChange
      ? firstAlternativeCurve
      : presentPlannerCurve(alternativeInput, sharedDomain);
  const changedNodeIds =
    alternativeInput?.steps
      .filter((after) => {
        if (after.status === "completed") return false;
        const before = baseBySequence.get(after.sequence);
        return (
          before === undefined ||
          before.scheduledDate !== after.scheduledDate ||
          before.plannedAmount !== after.plannedAmount ||
          before.status !== after.status
        );
      })
      .map((step) => step.id) ?? [];
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
        before: nextAction === null
          ? "제공된 다음 회차가 없습니다"
          : `${nextAction.sequence}회차 · ${nextAction.scheduledDate} · ${nextAction.amountLabel}`,
        after: scenario.nextAction,
      },
    ],
    baseCurve,
    alternativeCurve,
    changedNodeIds,
    warnings: ["체험용 변경이며 이 브라우저 화면에서만 적용됩니다."],
  };
}
