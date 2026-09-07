import type { ForecastBundle } from "../../api/generated/divurve-api";
import type {
  CurrencyForecastInfo,
  FanChartDataPoint,
  ForecastCurrency,
  ForecastDriverItem,
  ForecastEventItem,
} from "../../types/forecast";

/** 기여도 막대의 최대 표시 폭(px). 수치가 아니라 표현 파생값이다. */
const MAX_DRIVER_BAR_PX = 72;

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

/** 비율(0~1)을 소수 첫째 자리까지의 퍼센트 수치로 바꾼다. 표시 단위 변환이다. */
export function toPercent(ratio: number): number {
  return Math.round(ratio * 1000) / 10;
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

function toEvents(
  bundle: ForecastBundle,
  currency: ForecastCurrency,
): readonly ForecastEventItem[] {
  return bundle.events.events
    .filter((event) => event.currencyCode === currency)
    .map((event) => ({
      title: event.title,
      dateLabel: event.date,
      severity:
        event.importance.toLowerCase() === "high" ? "고변동성" : "중변동성",
    }));
}

export function toCurrencyForecastInfo(
  bundle: ForecastBundle,
  currency: ForecastCurrency,
): CurrencyForecastInfo {
  const { forecast, performance } = bundle;
  return {
    summary: {
      upperLabel: toRateLabel(forecast.interval80.hi),
      lowerLabel: toRateLabel(forecast.interval80.lo),
      impact: toImpactLabel(forecast.userImpact.per1pctKrw),
      percentile: toPercentileLabel(forecast.volatility.volPercentile5y),
      isPercentileWarn:
        forecast.volatility.regime === "high" ||
        forecast.volatility.regime === "extreme",
    },
    drivers: toDrivers(bundle),
    events: toEvents(bundle, currency),
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
