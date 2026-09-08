import type { ForecastBundle } from "../../api/generated/divurve-api";
import type { BadgeVariant } from "../../components/common/badge";
import type { ExplanationFacts } from "../../hooks/use-ai-explanation";
import { toPercent } from "../../lib/percent";
import {
  DEFAULT_FORECAST_PAIR,
  FORECAST_PAIRS,
  type FanChartDataPoint,
  type ForecastCurrency,
  type ForecastDriverItem,
  type ForecastEventItem,
  type ForecastPair,
  type ForecastPeriod,
  type PairForecastInfo,
} from "../../types/forecast";

/** 기여도 막대의 최대 표시 폭(px). 수치가 아니라 표현 파생값이다. */
const MAX_DRIVER_BAR_PX = 72;

/** 통화 색은 컨벤션 7.2에 따라 고정 배정하고, 그 밖의 통화는 중립색으로 둔다. */
const CURRENCY_COLORS: Readonly<Partial<Record<ForecastCurrency, string>>> = {
  USD: "var(--usd)",
  JPY: "var(--jpy)",
  EUR: "var(--eur)",
};

export function currencyColor(currencyCode: ForecastCurrency): string {
  return CURRENCY_COLORS[currencyCode] ?? "var(--text-muted)";
}

/** 통화쌍의 화면 표기(예 `USD/KRW`). 요청에 쓰는 코드(`USDKRW`)와는 다르다. */
export function toPairLabel(pair: ForecastPair): string {
  return `${pair.baseCode}/${pair.quoteCode}`;
}

/**
 * `<select>` 가 돌려준 문자열을 통화쌍으로 되돌린다. 목록에 없는 값이 오면
 * 첫 번째 쌍으로 떨어뜨린다 — 서버에 없는 코드를 실어 400 을 받는 것보다 낫다.
 */
export function toPair(code: string): ForecastPair {
  return (
    FORECAST_PAIRS.find((pair) => pair.code === code) ?? DEFAULT_FORECAST_PAIR
  );
}

/**
 * 전망 기간 라벨. "기간"만 적으면 무엇에 대한 기간인지 알 수 없다는 요구가
 * 있어 앞으로의 구간임을 문구에 넣는다.
 */
export function toPeriodLabel(period: ForecastPeriod): string {
  return `향후 ${period}일`;
}

export function toFanChartData(
  bundle: ForecastBundle,
): readonly FanChartDataPoint[] {
  const dates = [
    ...bundle.forecast.history.map((point) => point.d),
    ...bundle.forecast.band.map((point) => point.d),
    ...bundle.forecast.modelPath.map((point) => point.d),
  ].filter((date, index, allDates) => allDates.indexOf(date) === index);

  return dates.map((day) => {
    const history = bundle.forecast.history.find((point) => point.d === day);
    const band = bundle.forecast.band.find((point) => point.d === day);
    const model = bundle.forecast.modelPath.find((point) => point.d === day);
    return {
      day,
      price: history?.rate ?? null,
      projected: model?.rate ?? null,
      range80Upper: band?.p80Hi ?? null,
      range80Lower: band?.p80Lo ?? null,
      range50Upper: band?.p50Hi ?? null,
      range50Lower: band?.p50Lo ?? null,
    };
  });
}

export function toPercentileLabel(percentile5y: number): string {
  return `5년 중 ${Math.round(percentile5y * 100)}백분위`;
}

export function toRateLabel(rate: number): string {
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rate);
}

export function toImpactLabel(per1pctKrw: number): string {
  return per1pctKrw.toLocaleString("ko-KR");
}

export function toAsOfLabel(asOf: string): string {
  const parsed = new Date(asOf);
  if (Number.isNaN(parsed.getTime())) return asOf;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function directionType(direction: string): ForecastDriverItem["type"] {
  const normalized = direction.toLowerCase();
  if (normalized === "bearish") return "danger";
  if (normalized === "bullish") return "normal";
  return "muted";
}

export interface RegimeBadgeView {
  readonly label: string;
  readonly tone: BadgeVariant;
}

/**
 * 국면 코드 → 화면 어휘. 명세 §2 의 고정 매핑표(`calm`·`normal` → 정상,
 * `elevated` → 주의, `stress` → 급변)를 그대로 옮긴 것이며 임의 어휘가 아니다.
 * 모르는 코드는 배지를 그리지 않는다 — 뜻을 지어내지 않는 편이 낫다.
 */
const REGIME_BADGES: Readonly<Partial<Record<string, RegimeBadgeView>>> = {
  calm: { label: "정상", tone: "normal" },
  normal: { label: "정상", tone: "normal" },
  elevated: { label: "주의", tone: "warn" },
  stress: { label: "급변", tone: "danger" },
};

export function toRegimeBadge(
  regime: string | undefined,
): RegimeBadgeView | null {
  if (regime === undefined) return null;
  return REGIME_BADGES[regime] ?? null;
}

/** 변동성 백분위를 경고 톤으로 표시할 국면인지. 정상 국면만 평상 톤이다. */
function isRegimeWarn(regime: string): boolean {
  const badge = toRegimeBadge(regime);
  return badge !== null && badge.tone !== "normal";
}

function toDrivers(bundle: ForecastBundle): readonly ForecastDriverItem[] {
  const contributions = bundle.factors.factors.map((factor) =>
    Math.abs(factor.contributionPp),
  );
  const maxContribution = Math.max(...contributions, 0);
  return bundle.factors.factors.map((factor) => ({
    name: factor.label,
    type: directionType(factor.direction),
    barWidthPx:
      maxContribution === 0
        ? 0
        : Math.round(
            (Math.abs(factor.contributionPp) / maxContribution) *
              MAX_DRIVER_BAR_PX,
          ),
  }));
}

/** 통화쌍을 이루는 두 통화의 일정만 남긴다(예 `EURUSD` 면 EUR·USD). */
function toEvents(
  bundle: ForecastBundle,
  pair: ForecastPair,
): readonly ForecastEventItem[] {
  const currencies: readonly string[] = [pair.baseCode, pair.quoteCode];
  return bundle.events.events
    .filter((event) => currencies.includes(event.currencyCode))
    .map((event) => ({
      title: event.title,
      dateLabel: event.date,
      severity:
        event.importance.toLowerCase() === "high" ? "고변동성" : "중변동성",
    }));
}

export function toPairForecastInfo(
  bundle: ForecastBundle,
  pair: ForecastPair,
): PairForecastInfo {
  const { forecast, performance } = bundle;
  return {
    summary: {
      upperLabel: toRateLabel(forecast.interval80.hi),
      lowerLabel: toRateLabel(forecast.interval80.lo),
      impact: toImpactLabel(forecast.userImpact.per1pctKrw),
      percentile: toPercentileLabel(forecast.volatility.volPercentile5y),
      isPercentileWarn: isRegimeWarn(forecast.volatility.regime),
    },
    drivers: toDrivers(bundle),
    events: toEvents(bundle, pair),
    modelScore: {
      hitRatePct: toPercent(performance.model.hitRate),
      maePct: toPercent(performance.model.mae),
      inclusion80Pct: toPercent(performance.model.coverage80),
      randomWalkImprovementPct: toPercent(performance.rwImprovement),
    },
    uncertaintyNote: forecast.uncertaintyNote,
    asOfLabel: toAsOfLabel(bundle.asOf),
  };
}

/**
 * AI 자연어 설명(`surface: forecast_summary`)의 근거 수치.
 *
 * 서버가 준 값을 **가공하지 않고** 그대로 싣는다 — 백엔드가 문장 속 숫자를
 * 이 facts 와 대조하므로, 화면 표시용으로 반올림한 값을 보내면 대조에 걸린다.
 * 키 표기는 요청 본문 그대로 나가므로 백엔드 계약의 snake_case 를 쓴다.
 */
export function toExplanationFacts(bundle: ForecastBundle): ExplanationFacts {
  const { forecast } = bundle;
  return {
    pair_code: forecast.pairCode,
    horizon_days: forecast.horizonDays,
    band_lower: forecast.interval80.lo,
    band_upper: forecast.interval80.hi,
    vol_30d: forecast.volatility.vol30d,
    vol_percentile_5y: forecast.volatility.volPercentile5y,
    regime: forecast.volatility.regime,
  };
}
