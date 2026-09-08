import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import type { PlannerApiOverview } from "../../api/planner";
import type {
  PlannerPlanResponse,
  PlannerScenarioPreviewResponse,
} from "../../api/planner-contract";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import {
  getPlannerToday,
  replaceActivePlanState,
  usePlannerApi,
  type PlannerApiDependencies,
} from "./use-planner-api";

const overview = (): PlannerApiOverview => ({ items: [{ goal: { id: "goal", name: "목표", kind: "deadline", purpose: "travel", currencyCode: "USD", targetAmount: 100, isSpeculative: false, status: "active", heldAmount: 10 }, activePlan: null }] });
const completeResult = { seq: 1, status: "completed", executedAmount: 10, executedRate: 1400, executedDate: "2026-09-08", remainingAmount: 90, nextActionSeq: 2, alreadyApplied: false };
const skipResult = { seq: 1, applied: false as const, amountBefore: 10, amountAfter: 12, remainingAmount: 90, remainingRounds: 3, perRoundCostKrw: 16_800, exceedsBudget: false, adjustmentOptions: [] };
const planResult: PlannerPlanResponse = PLANNER_API_FIXTURE.items[0]!.activePlan!;
const scenarioResult: PlannerScenarioPreviewResponse = {
  basePlanId: "plan",
  baseVersion: 1,
  draftPlanId: "draft",
  draftVersion: 2,
  changeReasonCode: "RATE_UP",
  priorityConstraint: "budget",
  before: { remainingAmount: 90, targetDate: "2026-12-01", totalRounds: 3, openRounds: 2, perRoundAmount: 45, roundBudgetKrw: null, costRange: null },
  after: { remainingAmount: 90, targetDate: "2026-12-01", totalRounds: 4, openRounds: 3, perRoundAmount: 30, roundBudgetKrw: null, costRange: null },
  changedSteps: [],
  keptConstraints: [],
  brokenConstraints: [],
  budgetState: "within_budget",
  adjustmentOptions: [],
  warnings: [],
};

function dependencies(overrides: Partial<PlannerApiDependencies> = {}): PlannerApiDependencies {
  return { load: vi.fn().mockResolvedValue(overview()), complete: vi.fn().mockResolvedValue(completeResult), skip: vi.fn().mockResolvedValue(skipResult), preview: vi.fn().mockResolvedValue(planResult), create: vi.fn().mockResolvedValue(planResult), createGoal: vi.fn().mockResolvedValue(overview().items[0]!.goal), previewScenario: vi.fn().mockResolvedValue(scenarioResult), apply: vi.fn().mockResolvedValue(planResult), createExecutionKey: vi.fn(() => "stable-key"), getToday: vi.fn(() => "2026-09-08"), ...overrides };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe("usePlannerApi", () => {
  it("기본 실행일은 현재 날짜의 ISO 일자를 사용한다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T23:30:00Z"));
    expect(getPlannerToday()).toBe("2026-09-08");
    vi.useRealTimers();
  });

  it("활성 계획 교체는 성공 상태에서만 선택 목표에 적용한다", () => {
    expect(replaceActivePlanState({ status: "loading" }, "goal", planResult)).toEqual({
      status: "loading",
    });
    const state = { status: "success" as const, data: overview() };
    expect(replaceActivePlanState(state, "other", planResult)).toEqual(state);
  });
  it("목표가 없으면 empty, 재시도하면 최신 성공 상태를 표시한다", async () => {
    const load = vi.fn().mockResolvedValueOnce({ items: [] }).mockResolvedValueOnce(overview());
    const deps = dependencies({ load });
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("empty"));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("ApiError 메시지를 보존하고 일반 조회 오류에는 복구 메시지를 둔다", async () => {
    const apiDeps = dependencies({ load: vi.fn().mockRejectedValue(new ApiError("서버 메시지", 500)) });
    const { result: apiResult } = renderHook(() => usePlannerApi(apiDeps));
    await waitFor(() => expect(apiResult.current.state).toEqual({ status: "error", message: "서버 메시지" }));
    const networkDeps = dependencies({ load: vi.fn().mockRejectedValue(new Error("network")) });
    const { result: networkResult } = renderHook(() => usePlannerApi(networkDeps));
    await waitFor(() => expect(networkResult.current.state.status).toBe("error"));
    expect(networkResult.current.state).toMatchObject({ message: "플래너 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요." });
  });

  it("유효하지 않은 완료 입력은 API 호출 없이 명확한 오류를 표시한다", async () => {
    const deps = dependencies();
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    await act(async () => result.current.complete("plan", 1, 0, Number.NaN));
    expect(deps.complete).not.toHaveBeenCalled();
    expect(result.current.actionState).toEqual({ status: "error", message: "실행 외화 금액은 0보다 큰 유한한 값이어야 합니다." });
    await act(async () => result.current.complete("plan", 1, 1, Number.NaN));
    expect(deps.complete).not.toHaveBeenCalled();
    expect(result.current.actionState).toEqual({ status: "error", message: "실행 환율은 0보다 큰 유한한 값이어야 합니다." });
  });

  it("완료 성공 후 최신 개요를 다시 불러온다", async () => {
    const load = vi.fn().mockResolvedValue(overview());
    const deps = dependencies({ load });
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    await act(async () => result.current.complete("plan", 1, 10, 1400));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(deps.complete).toHaveBeenCalledWith("plan", 1, {
      executedAmount: 10,
      executedRate: 1400,
      executedDate: "2026-09-08",
      executionKey: "stable-key",
    });
    expect(result.current.actionState).toMatchObject({ status: "success" });
    const firstReload = result.current.reload;
    act(() => result.current.reload());
    await waitFor(() => expect(load).toHaveBeenCalledTimes(3));
    expect(result.current.actionState).toEqual({ status: "idle" });
    expect(result.current.reload).toBe(firstReload);
  });

  it("완료 실패는 재조회하지 않고 같은 입력 재시도에 execution key를 유지한다", async () => {
    const load = vi.fn().mockResolvedValue(overview());
    const complete = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("완료 실패", 400))
      .mockResolvedValueOnce(completeResult);
    const createExecutionKey = vi.fn(() => "retry-key");
    const deps = dependencies({ load, complete, createExecutionKey });
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    await act(async () => result.current.complete("plan", 1, 10, 1400));
    expect(load).toHaveBeenCalledTimes(1);
    expect(result.current.actionState).toEqual({ status: "error", message: "완료 실패" });
    await act(async () => result.current.complete("plan", 1, 10, 1400));
    expect(createExecutionKey).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenLastCalledWith(
      "plan",
      1,
      expect.objectContaining({ executionKey: "retry-key" }),
    );
  });

  it("진행 중에는 중복 완료와 건너뛰기를 막고, 건너뛰기는 미리보기만 표시한다", async () => {
    const pending = deferred<typeof completeResult>();
    const load = vi.fn().mockResolvedValue(overview());
    const deps = dependencies({ load, complete: vi.fn().mockReturnValue(pending.promise) });
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    act(() => { void result.current.complete("plan", 1, 10, 1400); void result.current.complete("plan", 1, 10, 1400); void result.current.skip("plan", 1); });
    expect(deps.complete).toHaveBeenCalledTimes(1);
    expect(deps.skip).not.toHaveBeenCalled();
    await act(async () => pending.resolve(completeResult));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    await act(async () => result.current.skip("plan", 1));
    expect(load).toHaveBeenCalledTimes(2);
    expect(deps.skip).toHaveBeenCalledWith("plan", 1);
    expect(result.current.actionState).toMatchObject({
      status: "success",
      message: expect.stringContaining("아직 계획에는 적용되지 않았습니다"),
    });
  });

  it("진행 중에는 중복 건너뛰기를 막는다", async () => {
    const pending = deferred<typeof skipResult>();
    const deps = dependencies({ skip: vi.fn().mockReturnValue(pending.promise) });
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    act(() => { void result.current.skip("plan", 1); void result.current.skip("plan", 1); });
    expect(deps.skip).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(skipResult));
  });

  it("언마운트 뒤에 완료된 조회는 상태를 갱신하지 않는다", async () => {
    const pending = deferred<PlannerApiOverview>();
    const deps = dependencies({ load: () => pending.promise });
    const { unmount } = renderHook(() => usePlannerApi(deps));
    unmount();
    await act(async () => pending.resolve(overview()));
  });

  it("언마운트 뒤에 실패한 조회도 상태를 갱신하지 않는다", async () => {
    let reject!: (reason: unknown) => void;
    const pending = new Promise<PlannerApiOverview>((_resolve, rejectPromise) => {
      reject = rejectPromise;
    });
    const deps = dependencies({ load: () => pending });
    const { unmount } = renderHook(() => usePlannerApi(deps));
    unmount();
    await act(async () => reject(new Error("late failure")));
  });

  it("건너뛰기 실패를 표시하고 재조회하지 않는다", async () => {
    const load = vi.fn().mockResolvedValue(overview());
    const deps = dependencies({ load, skip: vi.fn().mockRejectedValue(new Error("skip")) });
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    await act(async () => result.current.skip("plan", 1));
    expect(load).toHaveBeenCalledTimes(1);
    expect(result.current.actionState).toMatchObject({ status: "error" });
    act(() => result.current.reload());
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(result.current.actionState).toEqual({ status: "idle" });
  });

  it("계획 미리보기는 저장하지 않고 transient plan을 제공한다", async () => {
    const deps = dependencies();
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    const goal = overview().items[0]!.goal;
    await act(async () => {
      expect(await result.current.preview(goal)).toBe(true);
    });
    expect(deps.preview).toHaveBeenCalledWith(goal);
    expect(deps.create).not.toHaveBeenCalled();
    expect(result.current.planPreview).toEqual({ goalId: "goal", plan: planResult });
    expect(result.current.actionState).toMatchObject({
      status: "success",
      message: expect.stringContaining("저장되지 않은"),
    });
    act(() => result.current.clearTransient());
    expect(result.current.planPreview).toBeNull();
    expect(result.current.scenarioPreview).toBeNull();
    expect(result.current.actionState).toEqual({ status: "idle" });
  });

  it("계획 생성 성공은 최신 활성 계획 재조회가 끝난 뒤 확정한다", async () => {
    const refreshed: PlannerApiOverview = {
      items: [{ ...overview().items[0]!, activePlan: planResult }],
    };
    const load = vi.fn().mockResolvedValueOnce(overview()).mockResolvedValue(refreshed);
    const deps = dependencies({ load });
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    const goal = overview().items[0]!.goal;
    await act(async () => {
      expect(await result.current.create(goal)).toBe(true);
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(result.current.state).toMatchObject({
        status: "success",
        data: { items: [{ activePlan: planResult }] },
      }),
    );
    expect(result.current.actionState).toMatchObject({
      status: "success",
      message: expect.stringContaining("최신 활성 계획을 확인했습니다"),
    });
  });

  it("목표 생성은 중복 요청을 막고 서버 재조회 뒤 결과를 반환한다", async () => {
    const pending = deferred<ReturnType<typeof overview>["items"][number]["goal"]>();
    const createGoal = vi.fn().mockReturnValue(pending.promise);
    const load = vi.fn().mockResolvedValue(overview());
    const deps = dependencies({ createGoal, load });
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    const input = {
      name: "여행",
      kind: "deadline" as const,
      purpose: "TRAVEL" as const,
      currencyCode: "USD",
      targetAmount: 100,
      targetDate: "2027-01-01",
      recurInterval: "monthly",
      budgetAmount: 0,
      budgetCurrencyCode: "KRW" as const,
      budgetPeriod: null,
      isSpeculative: false as const,
    };

    act(() => {
      void result.current.createGoal(input);
      void result.current.createGoal(input);
    });
    expect(createGoal).toHaveBeenCalledOnce();
    await act(async () => pending.resolve(overview().items[0]!.goal));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(result.current.actionState).toMatchObject({
      status: "success",
      message: expect.stringContaining("서버에서 다시 확인"),
    });
  });

  it("목표 생성 실패를 표시하고 재조회하지 않는다", async () => {
    const load = vi.fn().mockResolvedValue(overview());
    const deps = dependencies({
      load,
      createGoal: vi.fn().mockRejectedValue(new ApiError("목표 생성 실패", 400)),
    });
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    await act(async () => {
      expect(
        await result.current.createGoal({
          name: "여행",
          kind: "deadline",
          purpose: "TRAVEL",
          currencyCode: "USD",
          targetAmount: 100,
          targetDate: "2027-01-01",
          recurInterval: null,
          budgetAmount: 0,
          budgetCurrencyCode: "KRW",
          budgetPeriod: null,
          isSpeculative: false,
        }),
      ).toBeNull();
    });

    expect(load).toHaveBeenCalledOnce();
    expect(result.current.actionState).toEqual({
      status: "error",
      message: "목표 생성 실패",
    });
  });

  it("계획 생성 뒤 활성 계획을 재조회하지 못하면 preview를 유지한다", async () => {
    const load = vi.fn().mockResolvedValue(overview());
    const deps = dependencies({ load });
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    const goal = overview().items[0]!.goal;

    await act(async () => {
      expect(await result.current.preview(goal)).toBe(true);
      expect(await result.current.create(goal)).toBe(false);
    });

    expect(load).toHaveBeenCalledTimes(2);
    expect(result.current.planPreview).toEqual({ goalId: "goal", plan: planResult });
    expect(result.current.actionState).toEqual({
      status: "error",
      message:
        "계획 생성 후 활성 계획을 확인하지 못했습니다. 다시 확인해 주세요.",
    });
  });

  it("scenario preview와 사용자 승인 apply를 분리하고 성공 뒤 재조회한다", async () => {
    const load = vi.fn().mockResolvedValue(overview());
    const deps = dependencies({ load });
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    await act(async () => {
      expect(
        await result.current.previewScenario("plan", { scenarioCode: "RATE_UP" }),
      ).toBe(true);
    });
    expect(result.current.scenarioPreview).toBe(scenarioResult);
    expect(deps.apply).not.toHaveBeenCalled();
    await act(async () => {
      expect(await result.current.apply("goal", "draft")).toBe(true);
    });
    expect(deps.apply).toHaveBeenCalledWith("draft");
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(result.current.scenarioPreview).toBeNull();
  });

  it("preview·create·scenario·apply 실패와 진행 중 중복 요청을 보존한다", async () => {
    const pending = deferred<PlannerPlanResponse>();
    const preview = vi.fn().mockReturnValue(pending.promise);
    const deps = dependencies({ preview });
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    const goal = overview().items[0]!.goal;
    act(() => {
      void result.current.preview(goal);
      void result.current.preview(goal);
      void result.current.create(goal);
      void result.current.previewScenario("plan", { scenarioCode: "RATE_UP" });
      void result.current.apply("goal", "draft");
    });
    expect(preview).toHaveBeenCalledOnce();
    expect(deps.create).not.toHaveBeenCalled();
    expect(deps.previewScenario).not.toHaveBeenCalled();
    expect(deps.apply).not.toHaveBeenCalled();
    await act(async () => pending.resolve(planResult));

    for (const [method, invoke] of [
      ["preview", () => result.current.preview(goal)],
      ["create", () => result.current.create(goal)],
      ["previewScenario", () => result.current.previewScenario("plan", { scenarioCode: "RATE_DOWN" })],
      ["apply", () => result.current.apply("goal", "draft")],
    ] as const) {
      const failing = vi.fn().mockRejectedValue(new ApiError(`${method} 실패`, 500));
      const failureDeps = dependencies({ [method]: failing });
      const hook = renderHook(() => usePlannerApi(failureDeps));
      await waitFor(() => expect(hook.result.current.state.status).toBe("success"));
      const call =
        method === "preview"
          ? () => hook.result.current.preview(goal)
          : method === "create"
            ? () => hook.result.current.create(goal)
            : method === "previewScenario"
              ? () => hook.result.current.previewScenario("plan", { scenarioCode: "RATE_DOWN" })
              : () => hook.result.current.apply("goal", "draft");
      await act(async () => expect(await call()).toBe(false));
      expect(hook.result.current.actionState).toEqual({
        status: "error",
        message: `${method} 실패`,
      });
      hook.unmount();
      void invoke;
    }
  });
});
