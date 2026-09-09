/**
 * `GET /api/v1/route/context` 응답을 플래너 상단 문구로 옮긴다.
 *
 * 계산은 하지 않는다(AGENTS.md §1). 서버가 준 값을 포매팅만 하고, 없는 값은
 * 지어내지 않고 항목 자체를 빼서 "없다"는 사실을 그대로 남긴다.
 */
import type { RouteContextData } from "../../api/route-context";

export interface PlannerContextFact {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface PlannerContextViewModel {
  readonly facts: readonly PlannerContextFact[];
  /** 기준 시각. 서버가 주지 않으면 null이다. */
  readonly asOfLabel: string | null;
}

const percentFormatter = new Intl.NumberFormat("ko-KR", {
  style: "percent",
  maximumFractionDigits: 1,
});

const rateFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 2,
});

/** 시장 국면 문구. 모르는 코드는 원문 그대로 노출한다 — 조용히 삼키지 않는다. */
const REGIME_LABELS: Readonly<Record<string, string | undefined>> = {
  low: "낮은 변동",
  normal: "보통 변동",
  high: "높은 변동",
  extreme: "매우 높은 변동",
};

function fact(
  id: string,
  label: string,
  value: string | null,
): PlannerContextFact | null {
  return value === null ? null : { id, label, value };
}

function diagnosisValue(context: RouteContextData): string | null {
  const grade = context.diagnosis?.grade;
  return typeof grade === "string" ? grade : null;
}

function fxRatioValue(context: RouteContextData): string | null {
  const ratio = context.portfolio?.fxRatio;
  return typeof ratio === "number" ? percentFormatter.format(ratio) : null;
}

/**
 * 기준 환율과 80% 구간.
 *
 * 계획 계산이 쓴 환율과 같은 전제라, 화면의 숫자와 계획의 숫자를 대조할 수 있는
 * 유일한 값이다. 구간이 없으면 기준 환율만 적는다.
 */
function baseRateValue(context: RouteContextData): string | null {
  const forecast = context.forecast;
  if (forecast === null || typeof forecast.baseRate !== "number") return null;

  const base = rateFormatter.format(forecast.baseRate);
  const { lo, hi } = forecast.interval80 ?? { lo: null, hi: null };
  return typeof lo === "number" && typeof hi === "number"
    ? `${base} (80% 구간 ${rateFormatter.format(lo)}~${rateFormatter.format(hi)})`
    : base;
}

function regimeValue(context: RouteContextData): string | null {
  const regime = context.regime;
  if (regime === null) return null;
  return REGIME_LABELS[regime] ?? regime;
}

export function presentPlannerContext(
  context: RouteContextData,
): PlannerContextViewModel {
  const pairCode = context.forecast?.pairCode;
  const facts = [
    fact("diagnosis", "진단 등급", diagnosisValue(context)),
    fact("fxRatio", "외화 비중", fxRatioValue(context)),
    fact(
      "baseRate",
      typeof pairCode === "string" ? `${pairCode} 기준 환율` : "기준 환율",
      baseRateValue(context),
    ),
    fact("regime", "시장 국면", regimeValue(context)),
  ].filter((item): item is PlannerContextFact => item !== null);

  return { facts, asOfLabel: context.forecast?.baseDate ?? context.asOf };
}
