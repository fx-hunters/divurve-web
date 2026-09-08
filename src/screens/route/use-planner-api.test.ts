import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import type {
  StepCompleteResponse,
  StepSkipResponse,
} from "../../api/generated/divurve-api";
import type { PlannerApiOverview } from "../../api/planner";
import { usePlannerApi, type PlannerApiDependencies } from "./use-planner-api";

const overview = (): PlannerApiOverview => ({ items: [{ goal: { id: "goal", name: "목표", kind: "deadline", purpose: "travel", currencyCode: "USD", targetAmount: 100, isSpeculative: false, status: "active", heldAmount: 10 }, activePlan: null }] });
const completeResult: StepCompleteResponse = { seq: 1, status: "completed", executedAmount: 10, executedRate: 1400, executedDate: "2026-09-08", remainingAmount: 90, nextActionSeq: 2, alreadyApplied: false };
/** 백엔드 `StepSkipResponse` 그대로. `applied` 는 항상 false 다(명세 §21-9). */
const skipResult: StepSkipResponse = { seq: 1, applied: false, amountBefore: 1_153.84, amountAfter: 1_176.47, remainingAmount: 20_000, remainingRounds: 17, perRoundCostKrw: 1_579_000, exceedsBudget: false, adjustmentOptions: [] };

function dependencies(overrides: Partial<PlannerApiDependencies> = {}): PlannerApiDependencies {
  return { load: vi.fn().mockResolvedValue(overview()), complete: vi.fn().mockResolvedValue(completeResult), skip: vi.fn().mockResolvedValue(skipResult), ...overrides };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe("usePlannerApi", () => {
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
    expect(deps.complete).toHaveBeenCalledWith("plan", 1, { executedAmount: 10, executedRate: 1400 });
    expect(result.current.actionState).toMatchObject({ status: "success" });
    const firstReload = result.current.reload;
    act(() => result.current.reload());
    await waitFor(() => expect(load).toHaveBeenCalledTimes(3));
    expect(result.current.actionState).toEqual({ status: "idle" });
    expect(result.current.reload).toBe(firstReload);
  });

  it("완료 실패는 재조회하지 않고 서버 오류 메시지를 보존한다", async () => {
    const load = vi.fn().mockResolvedValue(overview());
    const deps = dependencies({ load, complete: vi.fn().mockRejectedValue(new ApiError("완료 실패", 400)) });
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    await act(async () => result.current.complete("plan", 1, 10, 1400));
    expect(load).toHaveBeenCalledTimes(1);
    expect(result.current.actionState).toEqual({ status: "error", message: "완료 실패" });
  });

  it("진행 중에는 중복 완료와 건너뛰기를 막고, 건너뛰기는 미리보기라 재조회하지 않는다", async () => {
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
    expect(deps.skip).toHaveBeenCalledWith("plan", 1);
    // 서버에 저장된 것이 없으므로 재조회하지 않는다 (명세 §15·§21-9)
    expect(load).toHaveBeenCalledTimes(2);
    expect(result.current.actionState).toMatchObject({
      status: "success",
      message:
        "1회차를 건너뛰었을 때의 변경안입니다. 아직 계획에 반영되지 않았습니다. " +
        "남은 17회차가 회차당 1,153.84 → 1,176.47 로 바뀝니다.",
    });
  });

  it("재분배된 금액이 예산을 넘으면 그 사실을 문구에 붙인다", async () => {
    const deps = dependencies({
      skip: vi.fn().mockResolvedValue({ ...skipResult, exceedsBudget: true }),
    });
    const { result } = renderHook(() => usePlannerApi(deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    await act(async () => result.current.skip("plan", 1));
    expect(result.current.actionState).toMatchObject({
      status: "success",
      message: expect.stringContaining("재분배된 금액이 입력한 예산을 넘습니다."),
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
});
