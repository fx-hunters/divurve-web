import type { PlannerApiOverview } from "../../api/planner";
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

const percentFormatter = new Intl.NumberFormat("ko-KR", {
  style: "percent",
  maximumFractionDigits: 1,
});

function formatAmount(value: number, currencyCode: string): string {
  return `${numberFormatter.format(value)} ${currencyCode}`;
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

function nextStepIndex(item: PlannerSourceItem): number {
  if (item.activePlan === null || !item.activePlan.isActive) return -1;
  return item.activePlan.steps.findIndex(
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
  return plan.steps.map((step, index) => ({
    sequence: step.seq,
    scheduledDate: step.scheduledDate,
    amount: step.amount,
    amountLabel: formatAmount(step.amount, item.goal.currencyCode),
    executedAmount: step.executedAmount ?? null,
    status: nodeStatus(step.status, index === nextIndex),
    statusLabel: statusLabel(nodeStatus(step.status, index === nextIndex)),
    sequenceLabel: `${step.seq}회차`,
  }));
}

function toCurveNodes(
  item: PlannerSourceItem,
  nextIndex: number,
): readonly PlannerCurveNodeViewModel[] {
  const plan = item.activePlan;
  if (plan === null) return [];
  const count = plan.steps.length;
  return plan.steps.map((step, index) => ({
    id: `${plan.id}-${step.seq}`,
    sequence: step.seq,
    x: ((index + 1) / (count + 1)) * 100,
    y: nodeStatus(step.status, index === nextIndex) === "completed" ? 70 : 30,
    status: nodeStatus(step.status, index === nextIndex),
    statusLabel: statusLabel(nodeStatus(step.status, index === nextIndex)),
    roundLabel: `${step.seq}회차`,
  }));
}

function toCurve(
  item: PlannerSourceItem,
  nextIndex: number,
): PlannerCurveViewModel | null {
  const plan = item.activePlan;
  if (plan === null) return null;
  const nodes = toCurveNodes(item, nextIndex);
  const destination = {
    id: `${plan.id}-destination`,
    x: 100,
    y: 20,
    status: "destination" as const,
    statusLabel: statusLabel("destination"),
    label: "목표",
    targetAmountLabel: formatAmount(
      item.goal.targetAmount,
      item.goal.currencyCode,
    ),
    targetDateLabel: item.goal.targetDate ?? "미설정",
  };
  const points = [...nodes, destination].map((node) => `${node.x} ${node.y}`);
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

  return {
    goalItems: overview.items.map((item) => ({
      id: item.goal.id,
      name: item.goal.name,
      currencyCode: item.goal.currencyCode,
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
      selected?.activePlan === null || selected === null
        ? null
        : {
            id: selected.activePlan.id,
            version: selected.activePlan.version,
            reason: selected.activePlan.reason,
            safeRatio: selected.activePlan.safeRatio,
            safeRatioLabel: percentFormatter.format(selected.activePlan.safeRatio),
            splitCount: selected.activePlan.splitCount,
            isActive: selected.activePlan.isActive,
          },
    curveNodes: selected === null ? [] : toCurveNodes(selected, nextIndex),
    curve: selected === null ? null : toCurve(selected, nextIndex),
    steps: selected === null ? [] : toSteps(selected, nextIndex),
    nextAction:
      selected?.activePlan === null || selected === null || nextSourceStep === undefined
        ? null
        : {
            planId: selected.activePlan.id,
            sequence: nextSourceStep.seq,
            scheduledDate: nextSourceStep.scheduledDate,
            amount: nextSourceStep.amount,
            amountLabel: formatAmount(nextSourceStep.amount, selected.goal.currencyCode),
          },
    dataSource: { kind: "server", label: "서버 응답" },
    supportedActions: {
      canCompleteStep: nextSourceStep !== undefined,
      canSkipStep: nextSourceStep !== undefined,
    },
    unsupportedAreas: ["목표 및 계획 생성·재계산", "대체 시나리오"],
  };
}
