import type { PlannerApiOverview } from "../../api/planner";
import type {
  PlannerCostRange,
  PlannerPlanResponse,
  PlannerScenarioPreviewResponse,
  PlannerScenarioSide,
} from "../../api/planner-contract";
import {
  getDataSourceCopy,
  toApiDataSourceKind,
} from "../../components/common/data-source-badge";
import type {
  PlannerCurveNodeViewModel,
  PlannerCurveViewModel,
  PlannerNodeStatus,
  PlannerSourceItem,
  PlannerScenarioComparisonViewModel,
  PlannerScenarioOptionViewModel,
  PlannerStepViewModel,
  PlannerViewModel,
} from "./planner-api-types";

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
  return `${numberFormatter.format(value)} ${currencyCode}`;
}

function formatKrw(value: number): string {
  return `${krwFormatter.format(value)}원`;
}

function formatCostRange(range: PlannerCostRange | null): string | null {
  if (range === null) return null;
  return `${formatKrw(range.lowKrw)} ~ ${formatKrw(range.highKrw)}`;
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

function statusLabel(status: PlannerNodeStatus): string {
  switch (status) {
    case "completed":
      return "완료";
    case "next":
      return "다음 회차";
    case "upcoming":
      return "예정";
    case "skipped":
      return "건너뜀";
    case "destination":
      return "목표 도착";
  }
}

function planStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
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
      return status;
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

function nodeStatus(status: string, isNext: boolean): PlannerNodeStatus {
  if (status === "completed") return "completed";
  if (status === "skipped") return "skipped";
  return isNext ? "next" : "upcoming";
}

function toSteps(
  item: PlannerSourceItem,
  nextIndex: number,
): readonly PlannerStepViewModel[] {
  const plan = item.activePlan;
  if (plan === null) return [];
  return plan.steps.map((step, index) => {
    const status = nodeStatus(step.status, index === nextIndex);
    return {
      sequence: step.seq,
      scheduledDate: step.scheduledDate,
      amount: step.amount,
      amountLabel: formatAmount(step.amount, item.goal.currencyCode),
      budgetLabel: step.budgetKrw === null ? null : formatKrw(step.budgetKrw),
      estimatedCostLabel: formatCostRange(step.estimatedCost),
      executedAmount: step.executedAmount > 0 ? step.executedAmount : null,
      status,
      statusLabel: statusLabel(status),
      sequenceLabel: `${step.seq}회차`,
    };
  });
}

function toCurveNodes(
  item: PlannerSourceItem,
  nextIndex: number,
): readonly PlannerCurveNodeViewModel[] {
  const plan = item.activePlan;
  if (plan === null) return [];
  const count = plan.steps.length;
  const planKey = plan.planId ?? `preview-${item.goal.id}`;
  return plan.steps.map((step, index) => {
    const status = nodeStatus(step.status, index === nextIndex);
    return {
      id: `${planKey}-${step.seq}`,
      sequence: step.seq,
      x: ((index + 1) / (count + 1)) * 88,
      y: index % 2 === 0 ? 65 : 35,
      status,
      statusLabel: statusLabel(status),
      roundLabel: `${step.seq}회차`,
    };
  });
}

function toCurve(
  item: PlannerSourceItem,
  nextIndex: number,
): PlannerCurveViewModel | null {
  const plan = item.activePlan;
  if (plan === null) return null;
  const nodes = toCurveNodes(item, nextIndex);
  const planKey = plan.planId ?? `preview-${item.goal.id}`;
  const destination = {
    id: `${planKey}-destination`,
    x: 96,
    y: 24,
    status: "destination" as const,
    statusLabel: statusLabel("destination"),
    label: "목표",
    targetAmountLabel: formatAmount(
      item.goal.targetAmount,
      item.goal.currencyCode,
    ),
    targetDateLabel: item.goal.targetDate ?? "미설정",
  };
  const points = ["2 78", ...nodes.map((node) => `${node.x} ${node.y}`), `${destination.x} ${destination.y}`];
  return {
    viewBox: "0 0 100 100",
    accessibleLabel:
      "환율 차트가 아닌, 서버가 제공한 계획 회차의 진행 경로입니다.",
    path: `M ${points.join(" L ")}`,
    nodes,
    destination,
  };
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

  return {
    goalItems: overview.items.map((item) => ({
      id: item.goal.id,
      name: item.goal.name,
      currencyCode: item.goal.currencyCode,
      targetAmountLabel: formatAmount(item.goal.targetAmount, item.goal.currencyCode),
      heldAmountLabel: formatAmount(item.goal.heldAmount, item.goal.currencyCode),
      targetDateLabel: item.goal.targetDate ?? "미설정",
      isSelected: item.goal.id === selected?.goal.id,
    })),
    selectedGoal:
      selected === null
        ? null
        : {
            id: selected.goal.id,
            name: selected.goal.name,
            currencyCode: selected.goal.currencyCode,
            targetAmount: selected.goal.targetAmount,
            heldAmount: selected.goal.heldAmount,
            targetDate: selected.goal.targetDate ?? null,
            targetDateLabel: selected.goal.targetDate ?? "미설정",
            targetAmountLabel: formatAmount(
              selected.goal.targetAmount,
              selected.goal.currencyCode,
            ),
            heldAmountLabel: formatAmount(
              selected.goal.heldAmount,
              selected.goal.currencyCode,
            ),
            progressPercent: progressPercent(
              selected.goal.heldAmount,
              selected.goal.targetAmount,
            ),
            progressLabel: "외화 확보 진행",
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
                  activePlan.summary.budgetState,
            policyVersion:
              activePlan.calculationMeta?.policyVersion ?? "제공되지 않음",
            disclaimer: activePlan.disclaimer,
            warnings: activePlan.warnings.map(
              (warning) => WARNING_LABELS[warning] ?? warning,
            ),
          },
    curveNodes: selected === null ? [] : toCurveNodes(selected, nextIndex),
    curve: selected === null ? null : toCurve(selected, nextIndex),
    steps: selected === null ? [] : toSteps(selected, nextIndex),
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
      before: before.targetDate,
      after: after.targetDate,
    },
    {
      label: "남은 회차",
      before: `${before.openRounds}회`,
      after: `${after.openRounds}회`,
    },
    {
      label: "회차 금액",
      before: formatNullableAmount(before.perRoundAmount, currencyCode),
      after: formatNullableAmount(after.perRoundAmount, currencyCode),
    },
  ];
}

function alternativeCurve(
  view: PlannerViewModel,
  response: PlannerScenarioPreviewResponse,
): PlannerCurveViewModel | null {
  if (view.curve === null) return null;
  const changedSequences = new Set(response.changedSteps.map((step) => step.seq));
  const nodes = view.curve.nodes.map((node, index) => ({
    ...node,
    y: changedSequences.has(node.sequence)
      ? index % 2 === 0
        ? Math.max(18, node.y - 14)
        : Math.min(82, node.y + 14)
      : node.y,
  }));
  const destination = view.curve.destination;
  const points = [
    "2 78",
    ...nodes.map((node) => `${node.x} ${node.y}`),
    ...(destination === null ? [] : [`${destination.x} ${destination.y}`]),
  ];
  return {
    ...view.curve,
    accessibleLabel:
      "현재 계획에서 변경된 회차로 갈라지는 서버 대체 계획 경로입니다.",
    path: `M ${points.join(" L ")}`,
    nodes,
  };
}

export function presentPlannerScenarioComparison(
  response: PlannerScenarioPreviewResponse,
  view: PlannerViewModel,
  option: PlannerScenarioOptionViewModel,
): PlannerScenarioComparisonViewModel {
  const currencyCode = view.selectedGoal?.currencyCode ?? "외화";
  const changedSequences = new Set(response.changedSteps.map((step) => step.seq));
  return {
    id: option.id,
    label: option.label,
    reason: `서버 변경 사유 코드: ${response.changeReasonCode}`,
    nextAction:
      "변경 전후 조건을 확인한 뒤 적용 여부를 직접 선택해 주세요.",
    draftPlanId: response.draftPlanId,
    rows: sideRows(response.before, response.after, currencyCode),
    alternativeCurve: alternativeCurve(view, response),
    changedNodeIds: view.curveNodes
      .filter((node) => changedSequences.has(node.sequence))
      .map((node) => node.id),
    warnings: response.warnings,
  };
}
