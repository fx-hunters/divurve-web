import { apiPath, request, requestWithMeta } from "./client";
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

export async function fetchXrayBundle(
  currencyCode?: string,
): Promise<XrayBundle> {
  const [overview, attribution, fit, scenarios] = await Promise.all([
    requestWithMeta<XrayResponse>("/api/v1/xray"),
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
