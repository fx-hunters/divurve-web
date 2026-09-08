import { apiPath, request, requestWithMeta } from "./client";
import type {
  EventsResponse,
  FactorsResponse,
  ForecastBundle,
  ForecastResponse,
  ModelPerformanceResponse,
} from "./generated/divurve-api";

/**
 * 전망 화면이 쓰는 네 응답을 한 번에 모은다.
 *
 * `pairCode` 는 명세 표기(`USDKRW`)를 그대로 보낸다. `horizonDays` 는 백엔드
 * `ForecastService.ALLOWED_HORIZON_DAYS` 에 있는 값이어야 하며, 그 밖의 값은
 * 400 이다 — 선택지는 `types/forecast.ts` 의 `FORECAST_HORIZON_DAYS` 가 쥔다.
 */
export async function fetchForecastBundle(
  pairCode: string,
  horizonDays: number,
): Promise<ForecastBundle> {
  // /forecast만 인증이 필요하고 나머지 셋은 공개 엔드포인트다.
  const publicRequest = { requiresAuth: false } as const;
  const [forecast, factors, performance, events] = await Promise.all([
    requestWithMeta<ForecastResponse>(
      apiPath("/api/v1/forecast", { pairCode, horizonDays }),
    ),
    request<FactorsResponse>(
      apiPath("/api/v1/forecast/factors", { pairCode }),
      publicRequest,
    ),
    request<ModelPerformanceResponse>(
      apiPath("/api/v1/forecast/model-performance", {
        pairCode,
        horizonDays,
      }),
      publicRequest,
    ),
    request<EventsResponse>("/api/v1/events", publicRequest),
  ]);

  return {
    forecast: forecast.data,
    factors,
    performance,
    events,
    asOf: forecast.meta.asOf,
  };
}
