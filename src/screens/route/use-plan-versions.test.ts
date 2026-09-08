import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import type { PlanResponse } from "../../api/generated/divurve-api";
import type { PlanVersion } from "../../api/planner";
import {
  usePlanVersions,
  type PlanVersionDependencies,
} from "./use-plan-versions";

const VERSIONS: readonly PlanVersion[] = [
  {
    planId: "plan-2",
    version: 2,
    status: "active",
    reason: "재계산",
    planEndDate: "2026-12-31",
    createdAt: "2026-09-01T00:00:00Z",
  },
  { planId: "plan-1", version: 1, status: "superseded", supersededBy: "plan-2" },
];

const PLAN_DETAIL: PlanResponse = {
  planId: "plan-2",
  goalId: "goal-usd",
  version: 2,
  goal: {
    goalType: "deadline",
    purpose: "investment",
    currencyCode: "USD",
    targetAmount: 3_000,
    allocatedHoldingAmount: 1_260,
    remainingAmount: 1_740,
    targetDate: "2026-12-31",
  },
  summary: {
    status: "active",
    planEndDate: "2026-12-26",
    totalRounds: 1,
    completedRounds: 1,
    scheduledRounds: 0,
    skippedRounds: 0,
  },
  steps: [
    {
      seq: 1,
      scheduledDate: "2026-09-01",
      amount: 145,
      executedAmount: 145,
      status: "completed",
      nextAction: false,
    },
  ],
  warnings: [],
  disclaimer: "이 계획은 조건부 계산 결과입니다.",
};

function dependencies(
  overrides: Partial<PlanVersionDependencies> = {},
): PlanVersionDependencies {
  return {
    loadVersions: vi.fn().mockResolvedValue(VERSIONS),
    loadDetail: vi.fn().mockResolvedValue(PLAN_DETAIL),
    ...overrides,
  };
}

describe("usePlanVersions", () => {
  it("버전이 없으면 empty, 다시 불러오면 success를 표시한다", async () => {
    const loadVersions = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(VERSIONS);
    const deps = dependencies({ loadVersions });
    const { result } = renderHook(() => usePlanVersions("goal-usd", deps));

    await waitFor(() => expect(result.current.state.status).toBe("empty"));
    act(() => result.current.reload());
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: "success",
        versions: VERSIONS,
      }),
    );
    expect(loadVersions).toHaveBeenCalledWith("goal-usd");
  });

  it("목록 오류는 ApiError 메시지를, 그 외에는 복구 문구를 남긴다", async () => {
    const apiDeps = dependencies({
      loadVersions: vi.fn().mockRejectedValue(new ApiError("서버 메시지", 500)),
    });
    const { result: apiResult } = renderHook(() =>
      usePlanVersions("goal-usd", apiDeps),
    );
    await waitFor(() =>
      expect(apiResult.current.state).toEqual({
        status: "error",
        message: "서버 메시지",
      }),
    );

    const plainDeps = dependencies({
      loadVersions: vi.fn().mockRejectedValue(new Error("network")),
    });
    const { result: plainResult } = renderHook(() =>
      usePlanVersions("goal-usd", plainDeps),
    );
    await waitFor(() =>
      expect(plainResult.current.state).toEqual({
        status: "error",
        message: "계획 이력을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
      }),
    );
  });

  it("버전을 선택하면 상세를 불러오고 닫으면 idle로 돌아간다", async () => {
    const deps = dependencies();
    const { result } = renderHook(() => usePlanVersions("goal-usd", deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    act(() => result.current.selectVersion("plan-2"));
    await waitFor(() =>
      expect(result.current.detailState).toEqual({
        status: "success",
        planId: "plan-2",
        plan: PLAN_DETAIL,
      }),
    );
    expect(deps.loadDetail).toHaveBeenCalledWith("plan-2");

    act(() => result.current.clearSelection());
    await waitFor(() =>
      expect(result.current.detailState).toEqual({ status: "idle" }),
    );
  });

  it("상세 오류를 표시하고 같은 버전을 다시 선택하면 재요청한다", async () => {
    const loadDetail = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new ApiError("상세 오류", 500))
      .mockResolvedValueOnce(PLAN_DETAIL);
    const deps = dependencies({ loadDetail });
    const { result } = renderHook(() => usePlanVersions("goal-usd", deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    act(() => result.current.selectVersion("plan-1"));
    await waitFor(() =>
      expect(result.current.detailState).toEqual({
        status: "error",
        planId: "plan-1",
        message:
          "계획 상세를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
      }),
    );

    act(() => result.current.selectVersion("plan-1"));
    await waitFor(() =>
      expect(result.current.detailState).toMatchObject({
        status: "error",
        message: "상세 오류",
      }),
    );

    act(() => result.current.selectVersion("plan-1"));
    await waitFor(() =>
      expect(result.current.detailState.status).toBe("success"),
    );
    expect(loadDetail).toHaveBeenCalledTimes(3);
  });

  it("언마운트 뒤 도착한 응답은 상태를 바꾸지 않는다", async () => {
    let resolveVersions!: (value: readonly PlanVersion[]) => void;
    let resolveDetail!: (value: PlanResponse) => void;
    const deps = dependencies({
      loadVersions: vi.fn().mockReturnValue(
        new Promise<readonly PlanVersion[]>((resolve) => {
          resolveVersions = resolve;
        }),
      ),
      loadDetail: vi.fn().mockReturnValue(
        new Promise<PlanResponse>((resolve) => {
          resolveDetail = resolve;
        }),
      ),
    });
    const { result, unmount } = renderHook(() =>
      usePlanVersions("goal-usd", deps),
    );
    act(() => result.current.selectVersion("plan-2"));
    unmount();

    await act(async () => {
      resolveVersions(VERSIONS);
      resolveDetail(PLAN_DETAIL);
    });
    expect(result.current.state.status).toBe("loading");
    expect(result.current.detailState.status).toBe("loading");
  });

  it("언마운트 뒤 도착한 오류도 상태를 바꾸지 않는다", async () => {
    let rejectVersions!: (error: unknown) => void;
    let rejectDetail!: (error: unknown) => void;
    const versionsPromise = new Promise<readonly PlanVersion[]>(
      (_resolve, reject) => {
        rejectVersions = reject;
      },
    );
    const detailPromise = new Promise<PlanResponse>(
      (_resolve, reject) => {
        rejectDetail = reject;
      },
    );
    versionsPromise.catch(() => undefined);
    detailPromise.catch(() => undefined);
    const deps = dependencies({
      loadVersions: vi.fn().mockReturnValue(versionsPromise),
      loadDetail: vi.fn().mockReturnValue(detailPromise),
    });
    const { result, unmount } = renderHook(() =>
      usePlanVersions("goal-usd", deps),
    );
    act(() => result.current.selectVersion("plan-2"));
    unmount();

    await act(async () => {
      rejectVersions(new Error("late"));
      rejectDetail(new Error("late"));
    });
    expect(result.current.state.status).toBe("loading");
    expect(result.current.detailState.status).toBe("loading");
  });
});
