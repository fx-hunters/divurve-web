import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLANNER_API_FIXTURE } from "../test/api-fixtures";
import { ApiError, request, requestWithMeta } from "./client";
import { fetchXrayOverview } from "./xray";
import {
  applyDraftPlan,
  completePlanStep,
  createGoalPlan,
  createPlannerGoal,
  createPlannerExecutionKey,
  fetchPlanDetail,
  fetchPlanVersions,
  fetchPlannerOverview,
  parsePlannerPlanResponse,
  previewGoalPlan,
  previewPlanScenario,
  skipPlanStep,
} from "./planner";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return { ...actual, request: vi.fn(), requestWithMeta: vi.fn() };
});
vi.mock("./xray", () => ({ fetchXrayOverview: vi.fn() }));

const firstItem = PLANNER_API_FIXTURE.items[0]!;
const activePlan = firstItem.activePlan!;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchXrayOverview).mockResolvedValue({
    data: {
      totalAssetKrw: 1,
      krwAssetKrw: 0,
      fxAssetKrw: 1,
      fxRatio: 1,
      exposure: [],
      concentration: { status: "unknown" },
      sensitivity1pct: { totalKrw: 0, byCurrency: {} },
      isSampleData: true,
    },
    meta: { asOf: "", isDemo: false },
  });
});

describe("planner API", () => {
  it.each([401, 403])("보조 X-Ray의 인증 오류 %s는 전파한다", async (status) => {
    vi.mocked(requestWithMeta).mockResolvedValue({ data: { goals: [] }, meta: { asOf: "" } });
    const error = new ApiError("authentication required", status);
    vi.mocked(fetchXrayOverview).mockRejectedValue(error);
    await expect(fetchPlannerOverview()).rejects.toBe(error);
  });

  it("목표의 명시적 출처 meta를 X-Ray 보조값보다 우선한다", async () => {
    vi.mocked(requestWithMeta).mockResolvedValue({ data: { goals: [] }, meta: { asOf: "", isSampleData: false } });
    await expect(fetchPlannerOverview()).resolves.toMatchObject({ isSampleData: false });
  });

  it("누락·음수 확보액을 정상 0원 응답으로 보정하지 않는다", () => {
    for (const allocatedHoldingAmount of [undefined, -1, Number.NaN]) {
      expect(() => parsePlannerPlanResponse({ ...activePlan,
        goal: { ...activePlan.goal, allocatedHoldingAmount },
      })).toThrow(/allocatedHoldingAmount/);
    }
    expect(() => parsePlannerPlanResponse({ ...activePlan,
      steps: [{ ...activePlan.steps[0], executedAmount: -1 }],
    })).toThrow(/executedAmount/);
  });
  it("출처 확인용 X-Ray가 실패해도 목표와 활성 계획은 유지한다", async () => {
    vi.mocked(requestWithMeta).mockResolvedValue({
      data: { goals: [firstItem.goal] }, meta: { asOf: "", isDemo: false },
    });
    vi.mocked(request).mockResolvedValue(activePlan);
    vi.mocked(fetchXrayOverview).mockRejectedValue(new ApiError("X-Ray unavailable", 503));
    await expect(fetchPlannerOverview()).resolves.toMatchObject({
      items: [{ goal: firstItem.goal, activePlan }],
      isDemo: false,
      isSampleData: undefined,
      dataSourceNotice: expect.stringContaining("출처"),
    });
  });
  it("목록·샘플 여부를 조회하고 각 목표의 활성 계획을 URL 인코딩해 조회한다", async () => {
    const encodedGoal = { ...firstItem.goal, id: "a/b" };
    vi.mocked(requestWithMeta).mockResolvedValue({
      data: { goals: [encodedGoal] },
      meta: { asOf: "", isDemo: false },
    });
    vi.mocked(request).mockResolvedValue(activePlan);

    await expect(fetchPlannerOverview()).resolves.toEqual({
      items: [{ goal: encodedGoal, activePlan }],
      isDemo: false,
      isSampleData: true,
    });
    expect(requestWithMeta).toHaveBeenCalledWith("/api/v1/goals");
    expect(request).toHaveBeenCalledWith("/api/v1/goals/a%2Fb/plans/active");
  });

  it("활성 계획의 404만 계획 없음으로 바꾸고 meta 샘플 여부를 보조로 쓴다", async () => {
    vi.mocked(requestWithMeta).mockResolvedValue({
      data: { goals: [firstItem.goal] },
      meta: { asOf: "", isDemo: true },
    });
    vi.mocked(fetchXrayOverview).mockResolvedValue({
      data: {
        totalAssetKrw: 0,
        krwAssetKrw: 0,
        fxAssetKrw: 0,
        fxRatio: 0,
        exposure: [],
        concentration: { status: "unknown" },
        sensitivity1pct: { totalKrw: 0, byCurrency: {} },
      },
      meta: { asOf: "", isSampleData: false },
    });
    vi.mocked(request).mockRejectedValue(new ApiError("없음", 404));

    await expect(fetchPlannerOverview()).resolves.toEqual({
      items: [{ goal: firstItem.goal, activePlan: null }],
      isDemo: true,
      isSampleData: false,
    });
  });

  it("활성 계획의 다른 오류는 전파한다", async () => {
    const error = new ApiError("서버 오류", 500);
    vi.mocked(requestWithMeta).mockResolvedValue({
      data: { goals: [firstItem.goal] },
      meta: { asOf: "" },
    });
    vi.mocked(request).mockRejectedValue(error);
    await expect(fetchPlannerOverview()).rejects.toBe(error);
  });

  it("goal meta에 demo 여부가 없으면 X-Ray meta를 사용한다", async () => {
    vi.mocked(requestWithMeta).mockResolvedValue({
      data: { goals: [] },
      meta: { asOf: "" },
    });
    vi.mocked(fetchXrayOverview).mockResolvedValue({
      data: {
        totalAssetKrw: 0,
        krwAssetKrw: 0,
        fxAssetKrw: 0,
        fxRatio: 0,
        exposure: [],
        concentration: { status: "unknown" },
        sensitivity1pct: { totalKrw: 0, byCurrency: {} },
      },
      meta: { asOf: "", isDemo: true },
    });
    await expect(fetchPlannerOverview()).resolves.toMatchObject({
      items: [],
      isDemo: true,
    });
  });

  it("최신 Plan 구조를 런타임 타입으로 검증한다", () => {
    expect(parsePlannerPlanResponse(activePlan)).toEqual(activePlan);
    expect(
      parsePlannerPlanResponse({ ...activePlan, calculationMeta: null })
        .calculationMeta,
    ).toBeNull();
    expect(parsePlannerPlanResponse({ ...activePlan, planId: undefined })).toMatchObject({
      planId: null,
    });
    expect(() => parsePlannerPlanResponse(null)).toThrowError(ApiError);
    expect(() => parsePlannerPlanResponse({ ...activePlan, steps: null })).toThrowError(
      /steps/,
    );
    expect(() =>
      parsePlannerPlanResponse({
        ...activePlan,
        calculationMeta: { ...activePlan.calculationMeta, quoteUnit: "one" },
      }),
    ).toThrowError(/quoteUnit/);
    expect(() =>
      parsePlannerPlanResponse({ ...activePlan, warnings: ["ok", 1] }),
    ).toThrowError(/warnings/);
    expect(() =>
      parsePlannerPlanResponse({ ...activePlan, disclaimer: 1 }),
    ).toThrowError(/disclaimer/);
    expect(() =>
      parsePlannerPlanResponse({
        ...activePlan,
        steps: [
          { ...activePlan.steps[0]!, nextAction: "yes" },
        ],
      }),
    ).toThrowError(/nextAction/);
  });

  it("서버가 제공한 누적·회차 확보 범위를 손실 없이 파싱한다", () => {
    const range = { low: 100, base: 120, high: 140 };
    const response = {
      ...activePlan,
      summary: {
        ...activePlan.summary,
        cumulativeAcquisition: range,
      },
      steps: activePlan.steps.map((step) => ({
        ...step,
        acquisition: range,
      })),
    };
    expect(parsePlannerPlanResponse(response)).toMatchObject({
      summary: { cumulativeAcquisition: range },
      steps: [{ acquisition: range }, { acquisition: range }],
    });
    expect(
      parsePlannerPlanResponse({
        ...activePlan,
        summary: { ...activePlan.summary, estimatedCost: undefined },
      }).summary.estimatedCost,
    ).toBeNull();
  });

  it("계획 버전 이력을 조회해 versions 배열만 돌려준다", async () => {
    const versions = [
      { planId: "plan-2", version: 2, status: "active" },
      { planId: "plan-1", version: 1, status: "superseded" },
    ];
    vi.mocked(request).mockResolvedValueOnce({ versions });
    await expect(fetchPlanVersions("goal/a")).resolves.toEqual(versions);
    expect(request).toHaveBeenCalledWith("/api/v1/goals/goal%2Fa/plans");
  });

  it("계획 버전 상세를 인코딩된 경로로 조회한다", async () => {
    vi.mocked(request).mockResolvedValueOnce(activePlan);
    await expect(fetchPlanDetail("plan/1")).resolves.toEqual(activePlan);
    expect(request).toHaveBeenCalledWith("/api/v1/plans/plan%2F1");
  });

  it("계획 미리보기와 생성은 저장 목표 ID와 통화만 서버에 전달한다", async () => {
    vi.mocked(request).mockResolvedValue(activePlan);
    await expect(previewGoalPlan(firstItem.goal)).resolves.toEqual(activePlan);
    await expect(createGoalPlan({ ...firstItem.goal, id: "goal/a" })).resolves.toEqual(
      activePlan,
    );
    expect(request).toHaveBeenNthCalledWith(1, "/api/v1/plans/preview", {
      method: "POST",
      body: { goalId: "goal-usd", currencyCode: "USD" },
    });
    expect(request).toHaveBeenNthCalledWith(2, "/api/v1/goals/goal%2Fa/plans", {
      method: "POST",
      body: { goalId: "goal/a", currencyCode: "USD" },
    });
  });

  it("목표 생성은 현재 서버 GoalCreateRequest 필드만 전달한다", async () => {
    const input = {
      name: "일본 여행",
      kind: "deadline" as const,
      purpose: "TRAVEL" as const,
      currencyCode: "JPY",
      targetAmount: 180_000,
      targetDate: "2027-03-01",
      recurInterval: "monthly",
      budgetAmount: 500_000,
      budgetCurrencyCode: "KRW" as const,
      budgetPeriod: "monthly",
      isSpeculative: false as const,
    };
    const goal = { ...firstItem.goal, ...input, id: "created-goal" };
    vi.mocked(request).mockResolvedValue(goal);

    await expect(createPlannerGoal(input)).resolves.toEqual(goal);
    expect(request).toHaveBeenCalledWith("/api/v1/goals", {
      method: "POST",
      body: input,
    });
  });

  it("complete·skip·scenario·apply 요청을 최신 경로와 payload로 전달한다", async () => {
    vi.mocked(request).mockResolvedValue(activePlan);
    const completeInput = {
      executedAmount: 10,
      executedRate: 1_400,
      executedDate: "2026-09-08",
      executionKey: "execution-key",
    };
    await completePlanStep("plan/a", 2, completeInput);
    await skipPlanStep("plan/a", 3);
    await previewPlanScenario("plan/a", {
      scenarioCode: "STEP_SKIPPED",
      skippedSeq: 3,
    });
    await applyDraftPlan("draft/a");

    expect(request).toHaveBeenNthCalledWith(
      1,
      "/api/v1/plans/plan%2Fa/steps/2/complete",
      { method: "POST", body: completeInput },
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/api/v1/plans/plan%2Fa/steps/3/skip",
      { method: "POST" },
    );
    expect(request).toHaveBeenNthCalledWith(
      3,
      "/api/v1/plans/plan%2Fa/scenarios/preview",
      {
        method: "POST",
        body: { scenarioCode: "STEP_SKIPPED", skippedSeq: 3 },
      },
    );
    expect(request).toHaveBeenNthCalledWith(
      4,
      "/api/v1/plans/draft%2Fa/apply",
      { method: "POST" },
    );
  });

  it("한 사용자 실행에 사용할 execution key를 주입된 UUID 생성기로 만든다", () => {
    expect(createPlannerExecutionKey(() => "stable-key")).toBe("stable-key");
  });

  it("UUID 생성기를 주입하지 않으면 브라우저 UUID를 사용한다", () => {
    const uuid = "00000000-0000-4000-8000-000000000000";
    const spy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(uuid);
    expect(createPlannerExecutionKey()).toBe(uuid);
    spy.mockRestore();
  });
});
