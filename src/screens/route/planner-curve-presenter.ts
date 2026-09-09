import type {
  PlannerCurveNodeViewModel,
  PlannerCurveViewModel,
  PlannerStepNodeStatus,
} from "./planner-api-types";

const VIEWBOX = "0 0 1000 440";
const LEFT = 92;
const RIGHT = 960;
const TOP = 42;
const BOTTOM = 354;
const DAY_MILLISECONDS = 86_400_000;

const amountFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
});

export interface PlannerCurveStepInput {
  readonly id: string;
  readonly sequence: number;
  readonly scheduledDate: string;
  readonly plannedAmount: number;
  readonly executedAmount: number;
  readonly executedDate: string | null;
  readonly status: PlannerStepNodeStatus;
}

export interface PlannerCurveInput {
  readonly currencyCode: string;
  /** 과거 완료 구간을 누적하기 시작할 때의 확인된 금액. */
  readonly baselineAmount: number;
  /** 완료 기록이 이미 반영된 현재 확보액. */
  readonly currentAmount: number;
  readonly currentDate: string | null;
  readonly targetAmount: number | null;
  readonly targetDate: string | null;
  readonly steps: readonly PlannerCurveStepInput[];
  readonly dataNotice?: string | null;
}

export interface PlannerCurveDomain {
  readonly minDate: number;
  readonly maxDate: number;
  readonly maxAmount: number;
}

interface AmountPoint {
  readonly id: string;
  readonly sequence: number;
  readonly date: string;
  readonly epoch: number;
  readonly cumulativeAmount: number;
  readonly roundAmount: number;
  readonly status: PlannerStepNodeStatus;
}

function formatAmount(value: number, currencyCode: string): string {
  return `${amountFormatter.format(value)} ${currencyCode}`;
}

export function normalizePlannerDate(value: string | null): string | null {
  if (value === null) return null;
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const epoch = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(epoch)) return null;
  return new Date(epoch).toISOString().slice(0, 10) === date ? date : null;
}

function toEpoch(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function formatDate(date: string): string {
  return dateFormatter.format(new Date(toEpoch(date)));
}

function safeAmount(value: number, issues: string[]): number {
  if (Number.isFinite(value) && value >= 0) return value;
  issues.push("일부 금액 값이 올바르지 않아 해당 증가분을 경로에서 제외했습니다.");
  return 0;
}

function actionLabel(status: PlannerStepNodeStatus): string {
  switch (status) {
    case "completed":
      return "완료한 확보 기록 확인";
    case "next":
      return "이번 회차 준비 내용 확인";
    case "upcoming":
      return "예정된 준비 금액 확인";
    case "skipped":
      return "건너뛴 회차 확인";
  }
}

function statusLabel(status: PlannerStepNodeStatus): string {
  switch (status) {
    case "completed":
      return "완료";
    case "next":
      return "다음 행동";
    case "upcoming":
      return "예정";
    case "skipped":
      return "건너뜀";
  }
}

function uniqueMessages(messages: readonly string[]): string | null {
  const unique = [...new Set(messages.filter((message) => message.length > 0))];
  return unique.length === 0 ? null : unique.join(" ");
}

function pathFrom(
  points: readonly { readonly x: number; readonly y: number }[],
): string | null {
  if (points.length < 2) return null;
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function curvePoints(input: PlannerCurveInput, issues: string[]): readonly AmountPoint[] {
  let completedCumulative = safeAmount(input.baselineAmount, issues);
  let plannedCumulative = safeAmount(input.currentAmount, issues);
  return [...input.steps]
    .sort((a, b) => a.sequence - b.sequence)
    .flatMap((step) => {
      const date = normalizePlannerDate(
        step.status === "completed"
          ? step.executedDate ?? step.scheduledDate
          : step.scheduledDate,
      );
      const plannedAmount = safeAmount(step.plannedAmount, issues);
      const isCompleted = step.status === "completed";
      const roundAmount = isCompleted
        ? safeAmount(step.executedAmount, issues)
        : step.status === "skipped"
          ? 0
          : plannedAmount;
      if (isCompleted) {
        completedCumulative += roundAmount;
      } else {
        plannedCumulative += roundAmount;
      }
      if (date === null) {
        issues.push("날짜를 확인할 수 없는 회차는 경로에서 제외했습니다.");
        return [];
      }
      return [
        {
          id: step.id,
          sequence: step.sequence,
          date,
          epoch: toEpoch(date),
          cumulativeAmount: isCompleted
            ? completedCumulative
            : plannedCumulative,
          roundAmount,
          status: step.status,
        },
      ];
    });
}

/**
 * API 또는 데모 adapter가 제공한 날짜·금액만 좌표로 옮긴다.
 * 직선 보간을 사용하며 목표 금액에 맞추기 위한 회차나 증가분을 만들지 않는다.
 */
export function presentPlannerCurve(
  input: PlannerCurveInput,
  domainOverride?: PlannerCurveDomain,
): PlannerCurveViewModel | null {
  const issues: string[] = input.dataNotice === undefined || input.dataNotice === null
    ? []
    : [input.dataNotice];
  const points = curvePoints(input, issues);
  const completedPoints = points.filter((point) => point.status === "completed");
  const currentDate =
    normalizePlannerDate(input.currentDate) ??
    completedPoints[completedPoints.length - 1]?.date ??
    null;
  const baselineAmount = safeAmount(input.baselineAmount, issues);
  const currentAmount = safeAmount(input.currentAmount, issues);
  const targetDate = normalizePlannerDate(input.targetDate);
  const targetAmount =
    input.targetAmount !== null &&
    Number.isFinite(input.targetAmount) &&
    input.targetAmount >= 0
      ? input.targetAmount
      : null;
  if (input.targetDate !== null && targetDate === null) {
    issues.push("목표 날짜를 확인할 수 없어 목표 기준점을 표시하지 않았습니다.");
  }
  if (input.targetAmount !== null && targetAmount === null) {
    issues.push("목표 금액을 확인할 수 없어 목표 금액선을 표시하지 않았습니다.");
  }

  const dateEpochs = [
    ...points.map((point) => point.epoch),
    ...(currentDate === null ? [] : [toEpoch(currentDate)]),
    ...(targetDate === null ? [] : [toEpoch(targetDate)]),
  ];
  if (dateEpochs.length === 0) return null;
  let minDate = Math.min(...dateEpochs);
  let maxDate = Math.max(...dateEpochs);
  if (minDate === maxDate) {
    minDate -= DAY_MILLISECONDS;
    maxDate += DAY_MILLISECONDS;
  }
  const amounts = [
    0,
    currentAmount,
    ...points.map((point) => point.cumulativeAmount),
    ...(targetAmount === null ? [] : [targetAmount]),
  ];
  let maxAmount = Math.max(...amounts, 1);
  if (domainOverride !== undefined) {
    minDate = domainOverride.minDate;
    maxDate = domainOverride.maxDate;
    maxAmount = domainOverride.maxAmount;
  }
  const x = (epoch: number) =>
    LEFT + ((epoch - minDate) / (maxDate - minDate)) * (RIGHT - LEFT);
  const y = (amount: number) =>
    BOTTOM - (amount / maxAmount) * (BOTTOM - TOP);
  const currentPoint =
    currentDate === null
      ? null
      : {
          x: x(toEpoch(currentDate)),
          y: y(currentAmount),
          date: currentDate,
          dateLabel: formatDate(currentDate),
          amount: currentAmount,
          amountLabel: formatAmount(currentAmount, input.currencyCode),
        };
  const nodes: readonly PlannerCurveNodeViewModel[] = points.map((point) => ({
    id: point.id,
    sequence: point.sequence,
    x: x(point.epoch),
    y: y(point.cumulativeAmount),
    status: point.status,
    statusLabel: statusLabel(point.status),
    roundLabel: `${point.sequence}회차`,
    date: point.date,
    dateLabel: formatDate(point.date),
    cumulativeAmount: point.cumulativeAmount,
    cumulativeAmountLabel: formatAmount(
      point.cumulativeAmount,
      input.currencyCode,
    ),
    roundAmount: point.roundAmount,
    roundAmountLabel: formatAmount(point.roundAmount, input.currencyCode),
    actionLabel: actionLabel(point.status),
  }));
  const actualCoordinates = [
    ...nodes
      .filter((node) => node.status === "completed")
      .sort((a, b) => toEpoch(a.date) - toEpoch(b.date)),
    ...(currentPoint === null ? [] : [currentPoint]),
  ].filter(
    (point, index, list) =>
      index === 0 ||
      point.x !== list[index - 1]!.x ||
      point.y !== list[index - 1]!.y,
  );
  const futureNodes = nodes
    .filter((node) => node.status !== "completed")
    .sort((a, b) => toEpoch(a.date) - toEpoch(b.date));
  const plannedCoordinates =
    currentPoint === null
      ? futureNodes
      : [
          currentPoint,
          ...futureNodes.filter((node) => {
            const isFuture = toEpoch(node.date) >= toEpoch(currentPoint.date);
            if (!isFuture) {
              issues.push(
                "이미 지난 예정 회차는 날짜 위치만 표시하고 현재 지점과 연결하지 않았습니다.",
              );
            }
            return isFuture;
          }),
        ];
  const actualPath = pathFrom(actualCoordinates);
  const plannedPath = pathFrom(plannedCoordinates);
  const fallbackPath = pathFrom(
    [...nodes].sort((a, b) => toEpoch(a.date) - toEpoch(b.date)),
  );
  const destination =
    targetDate === null || targetAmount === null
      ? null
      : {
          id: "planner-target",
          x: x(toEpoch(targetDate)),
          y: y(targetAmount),
          status: "destination" as const,
          statusLabel: "목표 기준",
          label: "목표 기준",
          targetAmountLabel: formatAmount(targetAmount, input.currencyCode),
          targetDateLabel: formatDate(targetDate),
        };
  const tickValues = [0, maxAmount / 2, maxAmount];

  return {
    viewBox: VIEWBOX,
    accessibleLabel:
      "가로축은 날짜, 세로축은 누적 확보 외화 금액입니다. 실선은 확인된 값, 점선은 계획대로 준비했을 때의 금액입니다.",
    path: plannedPath ?? actualPath ?? fallbackPath ?? "",
    actualPath,
    plannedPath,
    nodes,
    destination,
    currentPoint,
    targetLineY: targetAmount === null ? null : y(targetAmount),
    yTicks: tickValues.map((value) => ({
      y: y(value),
      label: formatAmount(value, input.currencyCode),
    })),
    xStartLabel: formatDate(new Date(minDate).toISOString().slice(0, 10)),
    xEndLabel: formatDate(new Date(maxDate).toISOString().slice(0, 10)),
    dataNotice: uniqueMessages(issues),
    currencyCode: input.currencyCode,
    baselineAmount,
    currentAmount,
    targetAmount,
    targetDate,
    currentDate,
    domain: { minDate, maxDate, maxAmount },
  };
}

export function mergePlannerCurveDomains(
  first: PlannerCurveDomain,
  second: PlannerCurveDomain,
): PlannerCurveDomain {
  return {
    minDate: Math.min(first.minDate, second.minDate),
    maxDate: Math.max(first.maxDate, second.maxDate),
    maxAmount: Math.max(first.maxAmount, second.maxAmount),
  };
}
