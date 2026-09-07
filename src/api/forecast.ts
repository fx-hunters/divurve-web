import { apiPath, request, requestWithMeta } from "./client";
import type {
  EventsResponse,
  FactorsResponse,
  ForecastBundle,
  ForecastResponse,
  ModelPerformanceResponse,
} from "./generated/divurve-api";

export async function fetchForecastBundle(
  pairCode: string,
  horizon: number,
): Promise<ForecastBundle> {
  // /forecast만 인증이 필요하고 나머지 셋은 공개 엔드포인트다.
  const publicRequest = { requiresAuth: false } as const;
  const [forecast, factors, performance, events] = await Promise.all([
    requestWithMeta<ForecastResponse>(
      apiPath("/api/v1/forecast", { pairCode, horizonDays: horizon }),
    ),
    request<FactorsResponse>(
      apiPath("/api/v1/forecast/factors", { pairCode }),
      publicRequest,
    ),
    request<ModelPerformanceResponse>(
      apiPath("/api/v1/forecast/model-performance", {
        pairCode,
        horizonDays: horizon,
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
