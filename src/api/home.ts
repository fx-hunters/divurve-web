import { apiPath, requestWithMeta, type ApiResult } from "./client";
import type {
  ForecastResponse,
  HomeSummaryResponse,
} from "./generated/divurve-api";

/**
 * 백엔드가 지원하는 통화쌍. `ForecastController.getForecast()`의 `pair_code`
 * 파라미터가 받는 값과 같아야 한다. 임의로 값을 늘리지 않는다(AGENTS.md §4).
 */
export const HOME_MARKET_PAIR_CODES = ["USDKRW", "USDJPY", "EURUSD"] as const;

export type HomeMarketPairCode = (typeof HOME_MARKET_PAIR_CODES)[number];

export function fetchHomeSummary(): Promise<ApiResult<HomeSummaryResponse>> {
  return requestWithMeta<HomeSummaryResponse>("/api/v1/home/summary");
}

/**
 * 홈의 '오늘의 시장' 카드가 통화쌍을 바꿨을 때 쓰는 조회.
 *
 * `/api/v1/home/summary`는 통화쌍 파라미터를 받지 않고(백엔드 `HomeController`는
 * 현재 사용자만 인자로 받는다) 서버가 고른 통화쌍 하나만 돌려준다. 그래서
 * 사용자가 고른 통화쌍의 현재 환율·80% 범위·regime은 `/api/v1/forecast`에서
 * 따로 받는다. 지평(`horizon_days`)은 서버 기본값 30을 그대로 쓴다.
 */
export function fetchHomeMarketSnapshot(
  pairCode: HomeMarketPairCode,
): Promise<ApiResult<ForecastResponse>> {
  return requestWithMeta<ForecastResponse>(
    apiPath("/api/v1/forecast", { pairCode }),
  );
}
