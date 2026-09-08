/**
 * 환율 전망 화면의 선택지·표시 타입.
 *
 * 통화쌍과 전망 지평은 **백엔드가 받는 값이 곧 선택지**다. 그래서 두 목록을
 * `as const` 배열 하나로 두고 타입을 거기서 파생시킨다 — 선택지를 넓힐 때
 * 배열에 값 한 줄을 더하면 타입·화면·요청이 함께 따라온다.
 */

/**
 * 전망 화면이 다루는 통화쌍. 백엔드 `ForecastController` 가 받는 세 쌍이다
 * (`USDKRW` · `USDJPY` · `EURUSD`). 요청에는 `code` 를 그대로 싣는다.
 *
 * 새 통화쌍은 백엔드가 먼저 지원해야 한다. 지원이 확인되면 이 배열에 한 줄
 * 더하는 것으로 끝난다.
 */
export const FORECAST_PAIRS = [
  { code: "USDKRW", baseCode: "USD", quoteCode: "KRW" },
  { code: "USDJPY", baseCode: "USD", quoteCode: "JPY" },
  { code: "EURUSD", baseCode: "EUR", quoteCode: "USD" },
] as const;

export type ForecastPair = (typeof FORECAST_PAIRS)[number];
export type ForecastPairCode = ForecastPair["code"];
export type ForecastCurrency =
  | ForecastPair["baseCode"]
  | ForecastPair["quoteCode"];

/** 화면이 처음 보여 주는 통화쌍. */
export const DEFAULT_FORECAST_PAIR: ForecastPair = FORECAST_PAIRS[0];

/**
 * 전망 지평(일). 백엔드 `ForecastService.ALLOWED_HORIZON_DAYS` 와 같은 목록이며
 * 그 밖의 값은 400(`VALIDATION_FAILED`) 이다. 백엔드가 여섯 값을 모두 받도록
 * 넓힌 뒤(fx-hunters/divurve-api#121) 이 배열도 함께 넓혔다.
 *
 * 순서가 곧 화면에 늘어놓는 순서다. 새 지평은 백엔드가 먼저 받아야 한다.
 */
export const FORECAST_HORIZON_DAYS = [7, 14, 30, 60, 90, 180] as const;

/** 선택된 전망 기간. 값 자체가 서버에 보내는 `horizon_days` 다. */
export type ForecastPeriod = (typeof FORECAST_HORIZON_DAYS)[number];

/**
 * 화면이 처음 보여 주는 전망 기간.
 *
 * 목록의 첫 값(7일)이 아니라 30일이다 — 가장 짧은 구간을 첫 화면에 두면 팬
 * 차트의 폭이 거의 보이지 않는다. 목록 가운데의 기본값에서 양쪽으로 좁히거나
 * 넓히게 둔다.
 */
export const DEFAULT_FORECAST_PERIOD: ForecastPeriod = 30;

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
  /** 서버의 mae는 금액이 아니라 비율이라 % 로 표시한다. */
  readonly maePct: number;
  readonly inclusion80Pct: number;
  readonly randomWalkImprovementPct: number;
}

export interface PairForecastInfo {
  readonly summary: ForecastRangeSummary;
  readonly drivers: readonly ForecastDriverItem[];
  readonly events: readonly ForecastEventItem[];
  /**
   * 모델 성적표. 검증할 과거 관측이 부족한 지평에서는 서버가 성적표만 거절할
   * 수 있어(§ `api/forecast.ts`) `null` 을 허용한다. 그때도 팬 차트는 그린다.
   */
  readonly modelScore: ModelPerformanceScore | null;
  readonly uncertaintyNote: string;
  readonly asOfLabel: string;
}
