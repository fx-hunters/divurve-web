import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, request, requestWithMeta } from "./client";
import { fetchForecastBundle } from "./forecast";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return {
    ...actual,
    request: vi.fn(),
    requestWithMeta: vi.fn(),
  };
});

const MODEL_PERFORMANCE_PATH = "/api/v1/forecast/model-performance";

function mockForecastMeta() {
  vi.mocked(requestWithMeta).mockImplementation(async (path) => ({
    data: { path },
    meta: { asOf: "2026-09-08T00:00:00Z" },
  }));
}

beforeEach(() => vi.clearAllMocks());

describe("fetchForecastBundle 성적표 경계", () => {
  it("서버가 성적표만 거절하면 성적표를 null로 두고 나머지는 그대로 준다", async () => {
    mockForecastMeta();
    vi.mocked(request).mockImplementation(async (path) => {
      if (path.startsWith(MODEL_PERFORMANCE_PATH)) {
        throw new ApiError(
          "검증할 과거 관측이 부족합니다.",
          400,
          "VALIDATION_FAILED",
          "horizon_days",
        );
      }
      return { path };
    });

    const bundle = await fetchForecastBundle("USDKRW", 180);

    expect(bundle.performance).toBeNull();
    expect(bundle.forecast).toEqual({
      path: "/api/v1/forecast?pair_code=USDKRW&horizon_days=180",
    });
    expect(bundle.factors).toEqual({
      path: "/api/v1/forecast/factors?pair_code=USDKRW",
    });
    expect(bundle.events).toEqual({ path: "/api/v1/events" });
  });

  it("성적표가 ApiError가 아닌 이유로 실패하면 삼키지 않고 던진다", async () => {
    mockForecastMeta();
    vi.mocked(request).mockImplementation(async (path) => {
      if (path.startsWith(MODEL_PERFORMANCE_PATH)) {
        throw new TypeError("Failed to fetch");
      }
      return { path };
    });

    await expect(fetchForecastBundle("USDKRW", 180)).rejects.toThrow(
      "Failed to fetch",
    );
  });
});
