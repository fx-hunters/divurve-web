import { apiPath, request, requestWithMeta } from "./client";
import type { ApiResult } from "./client";
import type {
  AttributionResponse,
  FitPreviewRequest,
  FitPreviewResponse,
  FitResponse,
  StressRunRequest,
  StressRunResponse,
  StressScenarioListResponse,
  XrayBundle,
  XrayResponse,
} from "./generated/divurve-api";

export interface XrayOverviewResponse extends XrayResponse {
  /** 배포 계약은 샘플 여부를 X-Ray 본문에 제공한다. */
  readonly isSampleData?: boolean;
}

export interface XrayApiBundle extends Omit<XrayBundle, "overview"> {
  readonly overview: XrayOverviewResponse;
  /** `isDemo`와 별개인, 현재 계정 자산의 샘플 여부. */
  readonly isSampleData?: boolean;
}

/** X-Ray 개요만 조회한다. 기준 시각이 필요하므로 meta까지 함께 돌려준다. */
export function fetchXrayOverview(): Promise<ApiResult<XrayOverviewResponse>> {
  return requestWithMeta<XrayOverviewResponse>("/api/v1/xray");
}

export async function fetchXrayBundle(
  currencyCode?: string,
): Promise<XrayApiBundle> {
  const [overview, attribution, fit, scenarios] = await Promise.all([
    fetchXrayOverview(),
    request<AttributionResponse>(
      apiPath("/api/v1/xray/attribution", { currencyCode }),
    ),
    request<FitResponse>("/api/v1/fit"),
    request<StressScenarioListResponse>("/api/v1/stress/scenarios"),
  ]);
  return {
    overview: overview.data,
    attribution,
    fit,
    scenarios,
    asOf: overview.meta.asOf,
    isSampleData: overview.data.isSampleData ?? overview.meta.isSampleData,
  };
}

export function runStressScenario(
  input: StressRunRequest,
): Promise<StressRunResponse> {
  return request<StressRunResponse>("/api/v1/stress/runs", {
    method: "POST",
    body: input,
  });
}

export function previewFitAdjustment(
  input: FitPreviewRequest,
): Promise<FitPreviewResponse> {
  return request<FitPreviewResponse>("/api/v1/fit/preview", {
    method: "POST",
    body: input,
  });
}
