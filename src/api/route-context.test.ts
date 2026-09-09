import { beforeEach, describe, expect, it, vi } from "vitest";
import { request, requestWithMeta } from "./client";
import {
  fetchRouteContext,
  fetchRouteContextWithMeta,
  parseRouteContext,
} from "./route-context";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return { ...actual, request: vi.fn(), requestWithMeta: vi.fn() };
});

/** 백엔드 `RouteContextResponse`를 언래핑·camelCase 변환한 형태 그대로. */
const FULL_CONTEXT = {
  asOf: "2026-09-09T00:00:00Z",
  diagnosis: {
    status: "done",
    grade: "B",
    score: 72,
    concentrationThreshold: 0.4,
  },
  portfolio: {
    totalAssetKrw: 120_000_000,
    fxAssetKrw: 30_000_000,
    fxRatio: 0.25,
    exposure: { USD: 0.7, JPY: 0.3, BROKEN: "0.1" },
  },
  forecast: {
    pairCode: "USD/KRW",
    baseRate: 1_380.5,
    interval80: { lo: 1_340.2, hi: 1_420.8 },
    vol30d: 0.08,
    baseDate: "2026-09-08",
  },
  stress: { lastRunId: "run-1", totalEffectKrw: -1_200_000 },
  regime: "normal",
};

describe("parseRouteContext", () => {
  beforeEach(() => {
    vi.mocked(request).mockReset();
    vi.mocked(requestWithMeta).mockReset();
  });

  it("모든 블록을 그대로 옮기고 숫자가 아닌 비중은 버린다", () => {
    expect(parseRouteContext(FULL_CONTEXT)).toEqual({
      asOf: "2026-09-09T00:00:00Z",
      diagnosis: {
        status: "done",
        grade: "B",
        score: 72,
        concentrationThreshold: 0.4,
      },
      portfolio: {
        totalAssetKrw: 120_000_000,
        fxAssetKrw: 30_000_000,
        fxRatio: 0.25,
        exposure: { USD: 0.7, JPY: 0.3 },
      },
      forecast: {
        pairCode: "USD/KRW",
        baseRate: 1_380.5,
        interval80: { lo: 1_340.2, hi: 1_420.8 },
        vol30d: 0.08,
        baseDate: "2026-09-08",
      },
      stress: { lastRunId: "run-1", totalEffectKrw: -1_200_000 },
      regime: "normal",
    });
  });

  it("키가 없는 블록은 null로 두고 값을 지어내지 않는다", () => {
    // NON_NULL 직렬화라 값이 정해지지 않은 필드는 키 자체가 오지 않는다.
    expect(parseRouteContext({})).toEqual({
      asOf: null,
      diagnosis: null,
      portfolio: null,
      forecast: null,
      stress: null,
      regime: null,
    });
  });

  it("블록만 있고 값이 비었거나 형식이 어긋나면 항목별로 null이 된다", () => {
    const parsed = parseRouteContext({
      asOf: 42,
      diagnosis: {},
      portfolio: { fxRatio: Number.NaN },
      forecast: { pairCode: "USD/KRW", interval80: null },
      stress: {},
      regime: null,
    });

    expect(parsed.asOf).toBeNull();
    expect(parsed.diagnosis).toEqual({
      status: null,
      grade: null,
      score: null,
      concentrationThreshold: null,
    });
    expect(parsed.portfolio).toEqual({
      totalAssetKrw: null,
      fxAssetKrw: null,
      fxRatio: null,
      exposure: {},
    });
    expect(parsed.forecast).toEqual({
      pairCode: "USD/KRW",
      baseRate: null,
      interval80: null,
      vol30d: null,
      baseDate: null,
    });
    expect(parsed.stress).toEqual({ lastRunId: null, totalEffectKrw: null });
  });

  it("객체가 아닌 응답도 빈 컨텍스트로 받는다", () => {
    expect(parseRouteContext(null).regime).toBeNull();
    expect(parseRouteContext(["nope"]).portfolio).toBeNull();
  });
});

describe("fetchRouteContext", () => {
  beforeEach(() => {
    vi.mocked(request).mockReset();
    vi.mocked(requestWithMeta).mockReset();
  });

  it("컨텍스트 엔드포인트를 호출한다", async () => {
    vi.mocked(request).mockResolvedValue(FULL_CONTEXT);

    const context = await fetchRouteContext();

    expect(request).toHaveBeenCalledWith("/api/v1/route/context");
    expect(context.regime).toBe("normal");
  });

  it("메타까지 필요한 호출은 기준 시각을 함께 돌려준다", async () => {
    vi.mocked(requestWithMeta).mockResolvedValue({
      data: FULL_CONTEXT,
      meta: { asOf: "2026-09-09T00:00:00Z" },
    });

    const result = await fetchRouteContextWithMeta();

    expect(requestWithMeta).toHaveBeenCalledWith("/api/v1/route/context");
    expect(result.meta.asOf).toBe("2026-09-09T00:00:00Z");
    expect(result.data.forecast?.baseRate).toBe(1_380.5);
  });
});
