import type { PlannerApiOverview } from "../../api/planner";
import type {
  PlannerCostRange,
  PlannerPlanResponse,
  PlannerScenarioPreviewResponse,
  PlannerScenarioSide,
  PlannerStepSkipResponse,
} from "../../api/planner-contract";
import {
  getDataSourceCopy,
  toApiDataSourceKind,
} from "../../components/common/data-source-badge";
import type {
  PlannerCurveViewModel,
  PlannerStepNodeStatus,
  PlannerSourceItem,
  PlannerScenarioComparisonViewModel,
  PlannerScenarioOptionViewModel,
  PlannerStepViewModel,
  PlannerViewModel,
} from "./planner-api-types";
import {
  mergePlannerCurveDomains,
  presentPlannerCurve,
  type PlannerCurveInput,
} from "./planner-curve-presenter";

const API_SCENARIO_OPTIONS: readonly PlannerScenarioOptionViewModel[] = [
  {
    id: "expectedRange",
    label: "현재 계획 유지",
    description: "서버에 적용 중인 계획을 그대로 확인합니다.",
    scenarioCode: null,
    isCurrent: true,
    requiresBudget: false,
  },
  {
    id: "rapidRise",
    label: "환율이 빠르게 상승하면",
    description: "변화 조건을 서버에 전달해 대체 계획을 미리 봅니다.",
    scenarioCode: "RATE_UP",
    isCurrent: false,
    requiresBudget: false,
  },
  {
    id: "decline",
    label: "환율이 하락하면",
    description: "변화 조건을 서버에 전달해 대체 계획을 미리 봅니다.",
    scenarioCode: "RATE_DOWN",
    isCurrent: false,
    requiresBudget: false,
  },
  {
    id: "missedRound",
    label: "이번 회차를 놓치면",
    description: "다음 회차를 건너뛴 경우의 계획을 서버에서 비교합니다.",
    scenarioCode: "STEP_SKIPPED",
    isCurrent: false,
    requiresBudget: false,
  },
  {
    id: "reducedBudget",
    label: "사용할 예산이 줄면",
    description: "입력한 새 예산 조건으로 계획을 서버에서 비교합니다.",
    scenarioCode: "BUDGET_DECREASED",
    isCurrent: false,
    requiresBudget: true,
  },
];

const numberFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 2,
});
const krwFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 0,
});

function formatAmount(value: number, currencyCode: string): string {
  if (!Number.isFinite(value)) return "제공되지 않음";
  return `${numberFormatter.format(value)} ${currencyCode}`;
}

function formatKrw(value: number): string {
  if (!Number.isFinite(value)) return "제공되지 않음";
  return `${krwFormatter.format(value)}원`;
}

function formatCostRange(range: PlannerCostRange | null): string | null {
  if (range === null) return null;
  if (
    !Number.isFinite(range.lowKrw) ||
    !Number.isFinite(range.highKrw)
  ) {
    return null;
  }
  return `${formatKrw(range.lowKrw)} ~ ${formatKrw(range.highKrw)}`;
}

function displayServerText(value: string, fallback: string): string {
  return /^[A-Za-z][A-Za-z0-9_]*$/.test(value) ? fallback : value;
}

function formatDateValue(value: string): string {
  return typeof value === "string" && value.length > 0
    ? value
    : "제공되지 않음";
}

function formatRoundCount(value: number): string {
  return Number.isInteger(value) && value >= 0
    ? `${value}회`
    : "제공되지 않음";
}

const BUDGET_STATE_LABELS: Readonly<Record<string, string | undefined>> = {
  COVERED_IN_RANGE: "현재 환율 범위에서 예산으로 감당됩니다",
  RANGE_SENSITIVE: "환율 범위에 따라 예산 조정이 필요할 수 있습니다",
  CONSTRAINT_ADJUSTMENT_REQUIRED: "금액·날짜·예산 중 하나를 조정해야 합니다",
  BUDGET_NOT_PROVIDED: "예산을 입력하지 않아 가능 여부를 판정하지 않았습니다",
};

const WARNING_LABELS: Readonly<Record<string, string | undefined>> = {
  BUDGET_SHORTFALL: "예산이 계획 비용에 미치지 못합니다",
  TARGET_ALREADY_MET: "이미 목표 금액을 확보했습니다",
  FORECAST_UNAVAILABLE: "환율 구간을 얻지 못해 기준 환율만 사용했습니다",
};

function formatNullableAmount(
  value: number | null,
  currencyCode: string,
): string {
  return value === null ? "제공되지 않음" : formatAmount(value, currencyCode);
}

function progressPercent(heldAmount: number, targetAmount: number): number {
  if (
    !Number.isFinite(heldAmount) ||
    !Number.isFinite(targetAmount) ||
    targetAmount <= 0
  ) {
    return 0;
  }
  return Math.min(100, Math.max(0, (heldAmount / targetAmount) * 100));
}

function statusLabel(status: PlannerStepNodeStatus): string {
  switch (status) {
    case "completed":
      return "완료";
    case "next":
      return "다음 회차";
    case "upcoming":
      return "예정";
    case "skipped":
      return "건너뜀";
  }
}

function planStatusLabel(status: string): string {
  const normalizedStatus = status.toLowerCase();
  switch (normalizedStatus) {
    case "active":
      return "적용 중";
    case "draft":
      return "적용 전 미리보기";
    case "completed":
      return "완료";
    case "superseded":
      return "이전 버전";
    case "needs_review":
      return "재검토 필요";
    case "paused":
      return "일시 정지";
    default:
      return displayServerText(status, "상태 확인 필요");
  }
}

function nextStepIndex(item: PlannerSourceItem): number {
  const plan = item.activePlan;
  if (plan === null) return -1;
  const explicit = plan.steps.findIndex(
    (step) => step.nextAction || step.seq === plan.summary.nextActionSeq,
  );
  if (explicit >= 0) return explicit;
  return plan.steps.findIndex(
    (step) => step.status !== "completed" && step.status !== "skipped",
  );
}

function nodeStatus(status: string, isNext: boolean): PlannerStepNodeStatus {
  if (status === "completed") return "completed";
  if (status === "skipped") return "skipped";
  return isNext ? "next" : "upcoming";
}

function toSteps(
  item: PlannerSourceItem,
  nextIndex: number,
  curve: PlannerCurveViewModel | null,
): readonly PlannerStepViewModel[] {
  const plan = item.activePlan;
  if (plan === null) return [];
  return plan.steps.map((step, index) => {
    const status = nodeStatus(step.status, index === nextIndex);
    const point = curve?.nodes.find((node) => node.sequence === step.seq);
    const effectiveAmount = status === "completed" ? step.executedAmount : step.amount;
    return {
      sequence: step.seq,
      scheduledDate: step.scheduledDate,
      amount: step.amount,
      amountLabel: formatAmount(step.amount, item.goal.currencyCode),
      budgetLabel: step.budgetKrw === null ? null : formatKrw(step.budgetKrw),
      estimatedCostLabel: formatCostRange(step.estimatedCost),
      executedAmount: step.executedAmount > 0 ? step.executedAmount : null,
      executedDate:
        status === "completed"
          ? step.executedDate ?? step.scheduledDate
          : null,
      cumulativeAmount: point?.cumulativeAmount ?? 0,
      cumulativeAmountLabel:
        point?.cumulativeAmountLabel ?? "누적 금액 확인 불가",
      actionLabel: point?.actionLabel ?? "회차 정보 확인",
      calculationBasis:
        status === "completed"
          ? `실행 금액 ${formatAmount(effectiveAmount, item.goal.currencyCode)} 반영`
          : status === "skipped"
            ? "건너뛴 회차는 누적 금액에 더하지 않음"
            : `서버 계획 금액 ${formatAmount(effectiveAmount, item.goal.currencyCode)} 반영`,
      status,
      statusLabel: statusLabel(status),
      sequenceLabel: `${step.seq}회차`,
    };
  });
}

function currentAmount(item: PlannerSourceItem): number {
  const plan = item.activePlan;
  if (plan === null) return item.goal.heldAmount;
  const value = plan.goal.allocatedHoldingAmount;
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function completedAmount(item: PlannerSourceItem): number {
  return (
    item.activePlan?.steps
      .filter((step) => step.status === "completed")
      .reduce(
        (sum, step) =>
          sum +
          (Number.isFinite(step.executedAmount) && step.executedAmount > 0
            ? step.executedAmount
            : 0),
        0,
      ) ?? 0
  );
}

function toCurve(
  item: PlannerSourceItem,
  nextIndex: number,
): PlannerCurveViewModel | null {
  const plan = item.activePlan;
  if (plan === null) return null;
  const planKey = plan.planId ?? `preview-${item.goal.id}`;
  const current = currentAmount(item);
  const completed = completedAmount(item);
  const canReconstructStoredHistory =
    plan.planId === null || completed <= current;
  // 저장 Plan 조회 응답의 allocatedHoldingAmount에는 완료 회차가 이미 포함된다.
  // 과거 완료 노드를 그릴 때만 백엔드의 H + executed 계약으로 시작점을 복원한다.
  const baseline =
    plan.planId === null || !canReconstructStoredHistory
      ? current
      : current - completed;
  return presentPlannerCurve({
    currencyCode: plan.goal.currencyCode,
    baselineAmount: baseline,
    currentAmount: current,
    currentDate: plan.calculationMeta?.calculatedAt ?? null,
    targetAmount: plan.goal.targetAmount ?? item.goal.targetAmount,
    targetDate: plan.goal.targetDate ?? item.goal.targetDate ?? null,
    dataNotice: canReconstructStoredHistory
      ? null
      : "현재 확보액보다 완료 기록 합계가 커서 과거 완료 구간은 표시하지 않았습니다.",
    steps: plan.steps.flatMap((step, index) => {
      const status = nodeStatus(step.status, index === nextIndex);
      if (!canReconstructStoredHistory && status === "completed") return [];
      return [{
        id: `${planKey}-${step.seq}`,
        sequence: step.seq,
        scheduledDate: step.scheduledDate,
        plannedAmount: step.amount,
        executedAmount: step.executedAmount,
        executedDate: step.executedDate,
        status,
      }];
    }),
  });
}

function selectItem(
  items: readonly PlannerSourceItem[],
  selectedGoalId?: string | null,
): PlannerSourceItem | null {
  if (items.length === 0) return null;
  return items.find((item) => item.goal.id === selectedGoalId) ?? items[0]!;
}

export function presentPlannerOverview(
  overview: PlannerApiOverview,
  selectedGoalId?: string | null,
): PlannerViewModel {
  const selected = selectItem(overview.items, selectedGoalId);
  const nextIndex = selected === null ? -1 : nextStepIndex(selected);
  const activePlan = selected?.activePlan;
  const nextSourceStep =
    activePlan !== undefined && activePlan !== null && nextIndex >= 0
      ? activePlan.steps[nextIndex]
      : undefined;
  const dataSourceKind = toApiDataSourceKind(overview.isSampleData);
  const curve = selected === null ? null : toCurve(selected, nextIndex);
  const selectedCurrentAmount = selected === null ? 0 : currentAmount(selected);
  const planTargetAmount =
    selected === null
      ? 0
      : activePlan?.goal.targetAmount ?? selected.goal.targetAmount;
  const remainingAmount = Math.max(
    0,
    planTargetAmount - selectedCurrentAmount,
  );

  return {
    goalItems: overview.items.map((item) => {
      const targetAmount =
        item.activePlan?.goal.targetAmount ?? item.goal.targetAmount;
      const heldAmount = currentAmount(item);
      const targetDate =
        item.activePlan?.goal.targetDate ?? item.goal.targetDate ?? null;
      return {
        id: item.goal.id,
        name: item.goal.name,
        currencyCode: item.goal.currencyCode,
        targetAmountLabel: formatAmount(targetAmount, item.goal.currencyCode),
        heldAmountLabel: formatAmount(heldAmount, item.goal.currencyCode),
        targetDateLabel: targetDate ?? "미설정",
        isSelected: item.goal.id === selected?.goal.id,
        planStatusLabel:
          item.activePlan === null ? "활성 계획 없음" : "활성 계획 있음",
      };
    }),
    selectedGoal:
      selected === null
        ? null
        : {
            id: selected.goal.id,
            name: selected.goal.name,
            currencyCode: selected.goal.currencyCode,
            targetAmount: planTargetAmount,
            heldAmount: selectedCurrentAmount,
            targetDate: activePlan?.goal.targetDate ?? selected.goal.targetDate ?? null,
            targetDateLabel:
              activePlan?.goal.targetDate ?? selected.goal.targetDate ?? "미설정",
            targetAmountLabel: formatAmount(
              planTargetAmount,
              selected.goal.currencyCode,
            ),
            heldAmountLabel: formatAmount(
              selectedCurrentAmount,
              selected.goal.currencyCode,
            ),
            remainingAmountLabel:
              activePlan === undefined || activePlan === null
                ? "목표별 배정 후 확인"
                : formatAmount(remainingAmount, selected.goal.currencyCode),
            heldAmountBasisLabel:
              activePlan === undefined || activePlan === null
                ? "같은 통화의 전체 보유액이며 목표별 배정액은 아닙니다."
                : "목표 배정액과 완료 기록이 반영된 현재 확보액입니다.",
            progressPercent: progressPercent(
              selectedCurrentAmount,
              planTargetAmount,
            ),
            progressLabel:
              activePlan === undefined || activePlan === null
                ? "같은 통화 전체 보유액 기준 참고"
                : "현재 목표 확보액 기준",
          },
    plan:
      activePlan === undefined || activePlan === null
        ? null
        : {
            planSource: activePlan.planId === null ? "preview" : "active",
            id: activePlan.planId,
            version: activePlan.version,
            versionLabel:
              activePlan.version === null ? "미리보기" : `v${activePlan.version}`,
            status: activePlan.summary.status,
            statusLabel: planStatusLabel(activePlan.summary.status),
            planEndDateLabel:
              activePlan.summary.planEndDate ?? "제공되지 않음",
            totalRounds: activePlan.summary.totalRounds,
            completedRounds: activePlan.summary.completedRounds,
            scheduledRounds: activePlan.summary.scheduledRounds,
            skippedRounds: activePlan.summary.skippedRounds,
            nextActionSeq: activePlan.summary.nextActionSeq,
            estimatedCostLabel: formatCostRange(activePlan.summary.estimatedCost),
            budgetStateLabel:
              activePlan.summary.budgetState === null
                ? null
                : BUDGET_STATE_LABELS[activePlan.summary.budgetState] ??
                  displayServerText(
                    activePlan.summary.budgetState,
                    "예산 상태 세부 정보는 제공되지 않았습니다",
                  ),
            policyVersion: activePlan.calculationMeta?.policyVersion ?? null,
            calculatedAtLabel: activePlan.calculationMeta?.calculatedAt ?? null,
            rateAsOfLabel: activePlan.calculationMeta?.rateAsOf ?? null,
            disclaimer: activePlan.disclaimer,
            warnings: activePlan.warnings.map(
              (warning) =>
                WARNING_LABELS[warning] ??
                displayServerText(
                  warning,
                  "추가 확인이 필요한 계획 조건이 있습니다",
                ),
            ),
          },
    curveNodes: curve?.nodes ?? [],
    curve,
    steps: selected === null ? [] : toSteps(selected, nextIndex, curve),
    nextAction:
      activePlan?.planId === null ||
      activePlan === undefined ||
      activePlan === null ||
      nextSourceStep === undefined
        ? null
        : {
            planId: activePlan.planId,
            sequence: nextSourceStep.seq,
            scheduledDate: nextSourceStep.scheduledDate,
            amount: nextSourceStep.amount,
            amountLabel: formatAmount(nextSourceStep.amount, selected!.goal.currencyCode),
          },
    dataSource: {
      kind: dataSourceKind,
      label: getDataSourceCopy(dataSourceKind).label,
    },
    supportedActions: {
      canPreviewPlan: selected !== null && activePlan === null,
      canCreatePlan: selected !== null && activePlan === null,
      canCompleteStep: nextSourceStep !== undefined && activePlan?.planId !== null,
      canSkipStep: nextSourceStep !== undefined && activePlan?.planId !== null,
      canPreviewScenario: nextSourceStep !== undefined && activePlan?.planId !== null,
      canApplyDraft: false,
    },
    unsupportedAreas: ["서버에 없는 AI 설명 생성"],
    planAvailabilityMessage:
      activePlan === null
        ? "활성 계획이 없습니다. 미리보기를 확인한 뒤 계획을 만들 수 있습니다."
        : "서버에서 확인한 활성 계획입니다.",
    scenarioOptions: API_SCENARIO_OPTIONS,
  };
}

export function replacePlannerPlan(
  overview: PlannerApiOverview,
  goalId: string,
  plan: PlannerPlanResponse,
): PlannerApiOverview {
  return {
    ...overview,
    items: overview.items.map((item) =>
      item.goal.id === goalId ? { ...item, activePlan: plan } : item,
    ),
  };
}

function sideRows(
  before: PlannerScenarioSide,
  after: PlannerScenarioSide,
  currencyCode: string,
) {
  return [
    {
      label: "남은 목표 금액",
      before: formatAmount(before.remainingAmount, currencyCode),
      after: formatAmount(after.remainingAmount, currencyCode),
    },
    {
      label: "목표일",
      before: formatDateValue(before.targetDate),
      after: formatDateValue(after.targetDate),
    },
    {
      label: "남은 회차",
      before: formatRoundCount(before.openRounds),
      after: formatRoundCount(after.openRounds),
    },
    {
      label: "회차 금액",
      before: formatNullableAmount(before.perRoundAmount, currencyCode),
      after: formatNullableAmount(after.perRoundAmount, currencyCode),
    },
    {
      label: "회차 예산",
      before: before.roundBudgetKrw === null ? "제공되지 않음" : formatKrw(before.roundBudgetKrw),
      after: after.roundBudgetKrw === null ? "제공되지 않음" : formatKrw(after.roundBudgetKrw),
    },
    {
      label: "예상 원화 비용",
      before: formatCostRange(before.costRange) ?? "제공되지 않음",
      after: formatCostRange(after.costRange) ?? "제공되지 않음",
    },
  ];
}

function scenarioReason(code: string): string {
  const reasons: Readonly<Record<string, string>> = {
    RATE_UP: "환율 상승 조건으로 서버가 남은 계획을 다시 계산했습니다.",
    RATE_DOWN: "환율 하락 조건으로 서버가 남은 계획을 다시 계산했습니다.",
    STEP_SKIPPED: "선택한 회차를 놓친 조건으로 서버가 남은 계획을 다시 계산했습니다.",
    BUDGET_DECREASED: "줄어든 회차 예산 조건으로 서버가 남은 계획을 다시 계산했습니다.",
    TARGET_DATE_CHANGED: "변경된 목표일 조건으로 서버가 남은 계획을 다시 계산했습니다.",
    TARGET_AMOUNT_CHANGED: "변경된 목표 금액 조건으로 서버가 남은 계획을 다시 계산했습니다.",
    HOLDING_ADDED: "추가 확보 외화 조건으로 서버가 남은 계획을 다시 계산했습니다.",
  };
  return reasons[code] ?? "서버가 전달한 변경 조건으로 남은 계획을 다시 계산했습니다.";
}

function curveInputFromView(view: PlannerViewModel): PlannerCurveInput | null {
  if (view.curve === null) return null;
  return {
    currencyCode: view.curve.currencyCode,
    baselineAmount: view.curve.baselineAmount,
    currentAmount: view.curve.currentAmount,
    currentDate: view.curve.currentDate,
    targetAmount: view.curve.targetAmount,
    targetDate: view.curve.targetDate,
    dataNotice: view.curve.dataNotice,
    steps: view.steps.map((step) => ({
      id:
        view.curveNodes.find((node) => node.sequence === step.sequence)?.id ??
        `scenario-${step.sequence}`,
      sequence: step.sequence,
      scheduledDate: step.scheduledDate,
      plannedAmount: step.amount ?? 0,
      executedAmount: step.executedAmount ?? 0,
      executedDate:
        step.status === "completed"
          ? step.executedDate ?? step.scheduledDate
          : null,
      status: step.status,
    })),
  };
}

function comparisonCurves(
  view: PlannerViewModel,
  response: PlannerScenarioPreviewResponse,
): {
  readonly baseCurve: PlannerCurveViewModel | null;
  readonly alternativeCurve: PlannerCurveViewModel | null;
} {
  const baseInput = curveInputFromView(view);
  if (baseInput === null) {
    return { baseCurve: null, alternativeCurve: null };
  }
  const changes = new Map(response.changedSteps.map((step) => [step.seq, step]));
  let hasForeignPathChange = false;
  const alternativeSteps = baseInput.steps.map((step) => {
    const change = changes.get(step.sequence);
    if (change === undefined || step.status === "completed") return step;
    const scheduledDate = change.dateAfter ?? step.scheduledDate;
    const plannedAmount = change.amountAfter ?? step.plannedAmount;
    if (
      scheduledDate !== step.scheduledDate ||
      plannedAmount !== step.plannedAmount
    ) {
      hasForeignPathChange = true;
    }
    return { ...step, scheduledDate, plannedAmount };
  });
  for (const change of response.changedSteps) {
    if (
      alternativeSteps.some((step) => step.sequence === change.seq) ||
      change.dateAfter === null ||
      change.amountAfter === null
    ) {
      continue;
    }
    hasForeignPathChange = true;
    alternativeSteps.push({
      id: `scenario-${change.seq}`,
      sequence: change.seq,
      scheduledDate: change.dateAfter,
      plannedAmount: change.amountAfter,
      executedAmount: 0,
      executedDate: null,
      status: "upcoming",
    });
  }
  if (!hasForeignPathChange) {
    return { baseCurve: view.curve, alternativeCurve: null };
  }
  const alternativeInput: PlannerCurveInput = {
    ...baseInput,
    targetDate: response.after.targetDate,
    dataNotice:
      "서버가 변경 전후로 제공한 회차 날짜와 외화 금액만 비교합니다.",
    steps: alternativeSteps,
  };
  const firstBase = presentPlannerCurve(baseInput);
  const firstAlternative = presentPlannerCurve(alternativeInput);
  if (firstBase === null || firstAlternative === null) {
    return { baseCurve: firstBase, alternativeCurve: firstAlternative };
  }
  const domain = mergePlannerCurveDomains(
    firstBase.domain,
    firstAlternative.domain,
  );
  return {
    baseCurve: presentPlannerCurve(baseInput, domain),
    alternativeCurve: presentPlannerCurve(alternativeInput, domain),
  };
}

export function presentPlannerScenarioComparison(
  response: PlannerScenarioPreviewResponse,
  view: PlannerViewModel,
  option: PlannerScenarioOptionViewModel,
): PlannerScenarioComparisonViewModel {
  const currencyCode = view.selectedGoal?.currencyCode ?? "외화";
  const changedSequences = new Set(response.changedSteps.map((step) => step.seq));
  const curves = comparisonCurves(view, response);
  return {
    id: option.id,
    label: option.label,
    reason: scenarioReason(response.changeReasonCode),
    nextAction:
      "변경 전후 조건을 확인한 뒤 적용 여부를 직접 선택해 주세요.",
    draftPlanId: response.draftPlanId,
    rows: sideRows(response.before, response.after, currencyCode),
    baseCurve: curves.baseCurve,
    alternativeCurve: curves.alternativeCurve,
    changedNodeIds: (curves.alternativeCurve?.nodes ?? view.curveNodes)
      .filter(
        (node) =>
          node.status !== "completed" && changedSequences.has(node.sequence),
      )
      .map((node) => node.id),
    warnings: response.warnings.map(
      (warning) =>
        WARNING_LABELS[warning] ??
        displayServerText(
          warning,
          "추가 확인이 필요한 변경 조건이 있습니다",
        ),
    ),
  };
}

/**
 * 회차 건너뛰기 응답은 저장 가능한 draft가 아니라 재분배 영향만 담은 미리보기다.
 * 서버가 직접 제공한 전후 값만 비교하고, 누락된 기존 값이나 Curve는 만들지 않는다.
 */
export function presentPlannerSkipComparison(
  response: PlannerStepSkipResponse,
  view: PlannerViewModel,
  option: PlannerScenarioOptionViewModel,
): PlannerScenarioComparisonViewModel {
  const currencyCode = view.selectedGoal?.currencyCode ?? "외화";
  const rows = [
    {
      label: "회차 준비 금액",
      before: formatAmount(response.amountBefore, currencyCode),
      after: formatAmount(response.amountAfter, currencyCode),
    },
    {
      label: "남은 목표 금액",
      before: "기존 값 제공되지 않음",
      after: formatAmount(response.remainingAmount, currencyCode),
    },
    {
      label: "재분배할 회차",
      before: "기존 값 제공되지 않음",
      after: formatRoundCount(response.remainingRounds),
    },
    {
      label: "회차 예상 원화",
      before: "기존 값 제공되지 않음",
      after:
        response.perRoundCostKrw === null
          ? "계산 근거 제공되지 않음"
          : formatKrw(response.perRoundCostKrw),
    },
  ];
  const adjustmentNotice =
    response.adjustmentOptions.length === 0
      ? []
      : [
          `서버가 ${response.adjustmentOptions.length}개의 추가 조정 선택지를 제공했습니다.`,
        ];
  const warnings = response.exceedsBudget
    ? ["재분배 후 회차 금액이 설정한 예산 범위를 넘습니다.", ...adjustmentNotice]
    : adjustmentNotice;

  return {
    id: option.id,
    label: option.label,
    reason: `${Number.isInteger(response.seq) && response.seq > 0 ? `${response.seq}회차` : "선택한 회차"}를 건너뛴 조건으로 서버가 남은 금액의 재분배 영향을 계산했습니다.`,
    nextAction:
      "이 미리보기는 저장되지 않았습니다. 적용 가능한 변경 계획을 한 번 더 비교해 주세요.",
    draftPlanId: null,
    canRequestDraft: true,
    rows,
    baseCurve: view.curve,
    alternativeCurve: null,
    changedNodeIds: [],
    warnings,
  };
}
