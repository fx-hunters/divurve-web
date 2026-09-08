/**
 * 서버 계획 응답(`PlanResponse`)을 화면 ViewModel로 옮긴다.
 *
 * 계산은 하지 않는다(AGENTS.md §1). 회차 수·다음 회차·비용 범위·예산 상태는
 * 전부 `summary` 가 준 값을 그대로 쓰고, 여기서는 표시 문구만 만든다.
 */
import type {
  PlanBudgetState,
  PlanCostRange,
  PlanResponse,
  PlanStatusCode,
} from "../../api/generated/divurve-api";
import type { PlannerApiOverview } from "../../api/planner";
import type {
  PlannerCurveNodeViewModel,
  PlannerCurveViewModel,
  PlannerNodeStatus,
  PlannerPlanSummaryViewModel,
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

/** 값이 없을 때 쓰는 문구. 숫자를 지어내지 않고 없다는 사실을 그대로 적는다. */
const UNSET_LABEL = "미설정";
const NO_SERVER_VALUE_LABEL = "서버 값 없음";

/** 백엔드 `PlanStatus` 문구. 리터럴 유니온이라 누락은 컴파일 에러가 된다. */
const PLAN_STATUS_LABELS: Readonly<Record<PlanStatusCode, string>> = {
  draft: "계산됨",
  active: "적용 중",
  needs_review: "재검토 필요",
  completed: "완료",
  paused: "일시 정지",
  superseded: "대체됨",
};

/**
 * 백엔드 `BudgetState` 문구 (명세 §9.6).
 *
 * `COVERED_IN_RANGE` 는 목표 달성을 뜻하지 않으므로 문구도 "현재 환율 범위
 * 안에서"라는 조건을 지운 채 쓰지 않는다.
 */
const BUDGET_STATE_LABELS: Readonly<Record<PlanBudgetState, string>> = {
  COVERED_IN_RANGE: "현재 환율 범위에서 예산으로 감당됩니다",
  RANGE_SENSITIVE: "환율 범위에 따라 예산 조정이 필요할 수 있습니다",
  CONSTRAINT_ADJUSTMENT_REQUIRED: "금액·날짜·예산 중 하나를 조정해야 합니다",
  BUDGET_NOT_PROVIDED: "예산을 입력하지 않아 가능 여부를 판정하지 않았습니다",
};

/**
 * 서버 경고 코드 문구 (명세 §20).
 *
 * 모르는 코드는 `codeLabel()` 이 원문 그대로 노출한다 — 조용히 삼키면 경고가
 * 영구히 꺼진 줄도 모르게 된다(점검 리포트).
 */
const WARNING_LABELS: Readonly<Record<string, string | undefined>> = {
  BUDGET_SHORTFALL: "예산이 계획 비용에 미치지 못합니다",
  TARGET_ALREADY_MET: "이미 목표 금액을 확보했습니다",
  FORECAST_UNAVAILABLE: "환율 구간을 얻지 못해 기준 환율만 사용했습니다",
};

function codeLabel(
  labels: Readonly<Record<string, string | undefined>>,
  code: string,
): string {
  return labels[code] ?? code;
}

function formatAmount(value: number, currencyCode: string): string {
  return `${numberFormatter.format(value)} ${currencyCode}`;
}

function formatCostRange(range: PlanCostRange | undefined): string {
  if (range === undefined) return NO_SERVER_VALUE_LABEL;
  return `${krwFormatter.format(range.lowKrw)} ~ ${krwFormatter.format(
    range.highKrw,
  )}원 (기준 ${krwFormatter.format(range.baseKrw)}원)`;
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

/**
 * 다음 행동 회차의 배열 인덱스. 판정은 서버의 `summary.nextActionSeq` 가 한다
 * (명세 §11.3) — 프론트가 회차 상태를 훑어 고르지 않는다.
 */
function nextStepIndex(item: PlannerSourceItem): number {
  const plan = item.activePlan;
  if (plan === null || plan.summary.nextActionSeq === undefined) return -1;
  return plan.steps.findIndex(
    (step) => step.seq === plan.summary.nextActionSeq,
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
    executedAmount: step.executedAmount,
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
  // 노드 id는 목표 id로 만든다. 미리보기 응답에는 planId가 없어 계획 id를 쓰면
  // `undefined-1` 같은 키가 생긴다(점검 리포트 H2).
  return plan.steps.map((step, index) => ({
    id: `${item.goal.id}-${step.seq}`,
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
  if (item.activePlan === null) return null;
  const nodes = toCurveNodes(item, nextIndex);
  const destination = {
    id: `${item.goal.id}-destination`,
    x: 100,
    y: 20,
    status: "destination" as const,
    statusLabel: statusLabel("destination"),
    label: "목표",
    targetAmountLabel: formatAmount(
      item.goal.targetAmount,
      item.goal.currencyCode,
    ),
    targetDateLabel: item.goal.targetDate ?? UNSET_LABEL,
  };
  const points = [...nodes, destination].map((node) => `${node.x} ${node.y}`);
  return { path: `M ${points.join(" L ")}`, nodes, destination };
}

function toPlanSummary(plan: PlanResponse): PlannerPlanSummaryViewModel {
  const { summary } = plan;
  return {
    planId: plan.planId ?? null,
    version: plan.version ?? null,
    versionLabel: plan.version === undefined ? "저장 전" : `v${plan.version}`,
    status: summary.status,
    statusLabel: PLAN_STATUS_LABELS[summary.status],
    totalRounds: summary.totalRounds,
    completedRounds: summary.completedRounds,
    scheduledRounds: summary.scheduledRounds,
    skippedRounds: summary.skippedRounds,
    nextActionSeq: summary.nextActionSeq ?? null,
    planEndDateLabel: summary.planEndDate ?? UNSET_LABEL,
    estimatedCostLabel: formatCostRange(summary.estimatedCost),
    budgetStateLabel:
      summary.budgetState === undefined
        ? NO_SERVER_VALUE_LABEL
        : BUDGET_STATE_LABELS[summary.budgetState],
    warnings: plan.warnings.map((code) => codeLabel(WARNING_LABELS, code)),
    disclaimer: plan.disclaimer,
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
  const activePlan = selected?.activePlan ?? null;
  const nextSourceStep = nextIndex < 0 ? undefined : activePlan?.steps[nextIndex];
  // 회차를 기록·건너뛰기하려면 계획 id가 필요하다. 저장 전 계획에는 없다.
  const actionPlanId = activePlan?.planId;
  const nextAction =
    nextSourceStep === undefined || actionPlanId === undefined || selected === null
      ? null
      : {
          planId: actionPlanId,
          sequence: nextSourceStep.seq,
          scheduledDate: nextSourceStep.scheduledDate,
          amount: nextSourceStep.amount,
          amountLabel: formatAmount(
            nextSourceStep.amount,
            selected.goal.currencyCode,
          ),
        };

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
            targetDateLabel: selected.goal.targetDate ?? UNSET_LABEL,
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
    plan: activePlan === null ? null : toPlanSummary(activePlan),
    curveNodes: selected === null ? [] : toCurveNodes(selected, nextIndex),
    curve: selected === null ? null : toCurve(selected, nextIndex),
    steps: selected === null ? [] : toSteps(selected, nextIndex),
    nextAction,
    dataSource: { kind: "server", label: "서버 응답" },
    supportedActions: {
      canCompleteStep: nextAction !== null,
      canSkipStep: nextAction !== null,
    },
    unsupportedAreas: [
      "목표 및 계획 생성·재계산",
      "대체 시나리오",
      "회차 건너뛰기 적용",
    ],
  };
}
