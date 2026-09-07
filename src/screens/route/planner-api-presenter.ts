import type { PlannerApiOverview } from "../../api/planner";
import type { PlannerCostRange } from "../../api/planner-contract";
import {
  getDataSourceCopy,
  toApiDataSourceKind,
} from "../../components/common/data-source-badge";
import type {
  PlannerCurveNodeViewModel,
  PlannerCurveViewModel,
  PlannerNodeStatus,
  PlannerSourceItem,
  PlannerStepViewModel,
  PlannerViewModel,
} from "./planner-api-types";

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
  return { path: `M ${points.join(" L ")}`, nodes, destination };
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
            id: activePlan.planId,
            version: activePlan.version,
            versionLabel:
              activePlan.version === null ? "미리보기" : `v${activePlan.version}`,
            status: activePlan.summary.status,
            statusLabel: planStatusLabel(activePlan.summary.status),
            planEndDateLabel: activePlan.summary.planEndDate,
            totalRounds: activePlan.summary.totalRounds,
            completedRounds: activePlan.summary.completedRounds,
            scheduledRounds: activePlan.summary.scheduledRounds,
            skippedRounds: activePlan.summary.skippedRounds,
            estimatedCostLabel: formatCostRange(activePlan.summary.estimatedCost),
            policyVersion: activePlan.calculationMeta.policyVersion,
            disclaimer: activePlan.disclaimer,
            warnings: activePlan.warnings,
            isPreview: activePlan.planId === null,
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
  };
}
