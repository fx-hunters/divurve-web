import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, request, requestWithMeta } from "./client";
import { fetchHomeSummary } from "./home";
import { fetchForecastBundle } from "./forecast";
import {
  fetchXrayBundle,
  previewFitAdjustment,
  runStressScenario,
} from "./xray";
import { fetchMyPageBundle, updateSettings } from "./mypage";
import {
  completePlanStep,
  fetchPlannerOverview,
  skipPlanStep,
} from "./planner";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return {
    ...actual,
    request: vi.fn(),
    requestWithMeta: vi.fn(),
  };
});

beforeEach(() => vi.clearAllMocks());

describe("screen API modules", () => {
  it("홈 요약을 메타와 함께 조회한다", async () => {
    const result = { data: { notice: { message: "ok" } }, meta: { asOf: "t" } };
    vi.mocked(requestWithMeta).mockResolvedValue(result);
    await expect(fetchHomeSummary()).resolves.toEqual(result);
    expect(requestWithMeta).toHaveBeenCalledWith("/api/v1/home/summary");
  });

  it("인증이 필요한 forecast와 공개 API 셋을 한 번에 조회한다", async () => {
    vi.mocked(request).mockImplementation(async (path) => ({ path }));
    vi.mocked(requestWithMeta).mockImplementation(async (path) => ({
      data: { path },
      meta: { asOf: "2026-09-06T22:14:01Z" },
    }));
    const result = await fetchForecastBundle("USD_KRW", 30);
    expect(result.forecast).toEqual({
      path: "/api/v1/forecast?pair_code=USD_KRW&horizon_days=30",
    });
    expect(result.asOf).toBe("2026-09-06T22:14:01Z");
    expect(result.factors).toEqual({ path: "/api/v1/forecast/factors?pair_code=USD_KRW" });
    expect(result.performance).toEqual({ path: "/api/v1/forecast/model-performance?pair_code=USD_KRW&horizon_days=30" });
    expect(result.events).toEqual({ path: "/api/v1/events" });
    // forecast만 인증 요청이므로 공개 request는 셋뿐이다.
    expect(request).toHaveBeenCalledTimes(3);
    expect(request).toHaveBeenCalledWith(expect.any(String), { requiresAuth: false });
  });

  it("X-Ray 묶음 조회와 두 계산 요청을 전달한다", async () => {
    vi.mocked(request).mockImplementation(async (path) => ({ path }));
    vi.mocked(requestWithMeta).mockImplementation(async (path) => ({
      data: { path },
      meta: { asOf: "2026-09-06T22:32:19Z" },
    }));
    const result = await fetchXrayBundle("USD");
    expect(result.overview).toEqual({ path: "/api/v1/xray" });
    expect(result.asOf).toBe("2026-09-06T22:32:19Z");
    expect(result.attribution).toEqual({
      path: "/api/v1/xray/attribution?currency_code=USD",
    });
    expect(result.fit).toEqual({ path: "/api/v1/fit" });
    expect(result.scenarios).toEqual({ path: "/api/v1/stress/scenarios" });

    await runStressScenario({ scenarioCode: "equity_down_krw_weak" });
    expect(request).toHaveBeenCalledWith("/api/v1/stress/runs", {
      method: "POST",
      body: { scenarioCode: "equity_down_krw_weak" },
    });

    await previewFitAdjustment({ currencyCode: "EUR", deltaShare: 0.1 });
    expect(request).toHaveBeenCalledWith("/api/v1/fit/preview", {
      method: "POST",
      body: { currencyCode: "EUR", deltaShare: 0.1 },
    });
  });

  it("마이페이지 묶음과 설정 저장을 처리한다", async () => {
    vi.mocked(request).mockImplementation(async (path) => {
      if (path === "/api/v1/me") return { userId: "u" };
      if (path === "/api/v1/me/settings") return { explainLevel: "simple" };
      if (path === "/api/v1/me/risk-profile") return { riskType: "balanced" };
      return { notifications: [] };
    });
    const result = await fetchMyPageBundle();
    expect(result.profile).toEqual({ userId: "u" });
    expect(result.riskProfile).toEqual({ riskType: "balanced" });

    await updateSettings({ explainLevel: "detailed" });
    expect(request).toHaveBeenLastCalledWith("/api/v1/me/settings", {
      method: "PUT",
      body: { explainLevel: "detailed" },
    });
  });

  it("성향 정보의 404만 미진단 상태로 바꾼다", async () => {
    vi.mocked(request).mockImplementation(async (path) => {
      if (path === "/api/v1/me/risk-profile") {
        throw new ApiError("없음", 404, "NOT_FOUND");
      }
      if (path === "/api/v1/notifications") return { notifications: [] };
      return {};
    });
    await expect(fetchMyPageBundle()).resolves.toMatchObject({ riskProfile: null });

    vi.mocked(request).mockImplementation(async (path) => {
      if (path === "/api/v1/me/risk-profile") throw new Error("network");
      return {};
    });
    await expect(fetchMyPageBundle()).rejects.toThrow("network");
  });

  it("목표별 활성 계획을 조회하고 404는 계획 없음으로 처리한다", async () => {
    vi.mocked(request).mockImplementation(async (path) => {
      if (path === "/api/v1/goals") {
        return { goals: [{ id: "goal one", name: "목표 1" }, { id: "g2", name: "목표 2" }] };
      }
      if (path.includes("goal%20one")) return { id: "p1" };
      throw new ApiError("없음", 404, "NOT_FOUND");
    });
    const result = await fetchPlannerOverview();
    expect(result.items[0]?.activePlan).toEqual({ id: "p1" });
    expect(result.items[1]?.activePlan).toBeNull();

    vi.mocked(request).mockImplementation(async (path) => {
      if (path === "/api/v1/goals") return { goals: [{ id: "g1" }] };
      throw new Error("network");
    });
    await expect(fetchPlannerOverview()).rejects.toThrow("network");
  });

  it("회차 완료와 건너뛰기 요청을 전달한다", async () => {
    vi.mocked(request).mockResolvedValue({ status: "ok" });
    await completePlanStep("plan id", 2, { executedAmount: 100, executedRate: 1400 });
    expect(request).toHaveBeenCalledWith(
      "/api/v1/plans/plan%20id/steps/2/complete",
      {
        method: "POST",
        body: { executedAmount: 100, executedRate: 1400 },
      },
    );
    await skipPlanStep("p", 3);
    expect(request).toHaveBeenLastCalledWith("/api/v1/plans/p/steps/3/skip", {
      method: "POST",
    });
  });
});
