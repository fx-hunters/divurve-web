export type ForecastCurrency = "USD" | "JPY" | "EUR";
export type ForecastPeriod = "30D" | "90D";

export interface FanChartDataPoint {
  readonly day: string;
  readonly price: number | null;
  readonly projected: number | null;
  readonly range80Upper: number | null;
  readonly range80Lower: number | null;
  readonly range50Upper: number | null;
  readonly range50Lower: number | null;
}

export interface ForecastRangeSummary {
  /** 환율은 자릿수가 통화마다 달라 표시 문자열로 굳혀서 넘긴다. */
  readonly upperLabel: string;
  readonly lowerLabel: string;
  /** 서버가 준 1% 변동 시 자산 영향액의 표시 문자열. */
  readonly impact: string;
  readonly percentile: string;
  readonly isPercentileWarn: boolean;
}

export interface ForecastDriverItem {
  readonly name: string;
  readonly type: "danger" | "muted" | "normal";
  readonly barWidthPx: number;
}

export interface ForecastEventItem {
  readonly title: string;
  readonly dateLabel: string;
  readonly severity: "고변동성" | "중변동성";
}

export interface ModelPerformanceScore {
  readonly hitRatePct: number;
  /** 서버의 mae는 금액이 아니라 비율이라 % 로 표시한다. */
  readonly maePct: number;
  readonly inclusion80Pct: number;
  readonly randomWalkImprovementPct: number;
}

export interface CurrencyForecastInfo {
  readonly summary: ForecastRangeSummary;
  readonly drivers: readonly ForecastDriverItem[];
  readonly events: readonly ForecastEventItem[];
  readonly modelScore: ModelPerformanceScore;
  readonly uncertaintyNote: string;
  readonly asOfLabel: string;
}
