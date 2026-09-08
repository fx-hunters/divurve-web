import { ApiError, apiPath, request, requestWithMeta } from "./client";
import type {
  EventsResponse,
  FactorsResponse,
  ForecastBundle,
  ForecastResponse,
  ModelPerformanceResponse,
} from "./generated/divurve-api";

/**
 * 전망 화면이 실제로 받는 묶음.
 *
 * 모델 성적표만 없을 수 있다는 점이 생성 타입과 다르다 — 아래 `fetchForecastBundle`
 * 주석 참고. 나머지 셋은 화면의 뼈대라 하나라도 실패하면 화면 전체가 실패다.
 */
export interface ForecastBundleView
  extends Omit<ForecastBundle, "performance"> {
  readonly performance: ModelPerformanceResponse | null;
}

/**
 * 전망 화면이 쓰는 네 응답을 한 번에 모은다.
 *
 * `pairCode` 는 명세 표기(`USDKRW`)를 그대로 보낸다. `horizonDays` 는 백엔드
 * `ForecastService.ALLOWED_HORIZON_DAYS` 에 있는 값이어야 하며, 그 밖의 값은
 * 400 이다 — 선택지는 `types/forecast.ts` 의 `FORECAST_HORIZON_DAYS` 가 쥔다.
 *
 * 모델 성적표는 **없어도 되는 곁가지**로 다룬다. 성적표는 지평만큼의 과거
 * 관측을 겹치지 않게 잘라 검증한 결과라, 긴 지평에서는 검증할 관측이 모자라
 * 서버가 이 엔드포인트만 거절할 수 있다. 그때 묶음 전체를 실패로 만들면 팬
 * 차트까지 사라지므로, 성적표 실패는 `null` 로 삼키고 화면이 그 카드만 빈
 * 상태로 그리게 한다. 나머지 셋의 실패는 그대로 위로 던진다.
 */
export async function fetchForecastBundle(
  pairCode: string,
  horizonDays: number,
): Promise<ForecastBundleView> {
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
    ).catch((error: unknown) => {
      // 서버가 성적표를 거절한 경우만 삼킨다. 네트워크·파싱 오류는 던진다.
      if (error instanceof ApiError) return null;
      throw error;
    }),
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
