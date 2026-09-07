import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import { fetchHomeSummary } from "../../api/home";
import {
  EMPTY_HOME_SUMMARY_FIXTURE,
  HOME_SUMMARY_FIXTURE,
  SPARSE_HOME_SUMMARY_FIXTURE,
} from "../../test/api-fixtures";
import { hasHomeContent, useHomeDashboard } from "./use-home-dashboard";

vi.mock("../../api/home", () => ({
  fetchHomeSummary: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe("hasHomeContent", () => {
  it("블록이 하나라도 비어 있지 않으면 내용이 있다고 본다", () => {
    expect(hasHomeContent(HOME_SUMMARY_FIXTURE.data)).toBe(true);
    expect(hasHomeContent(SPARSE_HOME_SUMMARY_FIXTURE.data)).toBe(true);
    expect(hasHomeContent(EMPTY_HOME_SUMMARY_FIXTURE.data)).toBe(false);
  });
});

describe("useHomeDashboard", () => {
  it("요약을 조회해 준비 상태가 된다", async () => {
    const loader = vi.fn().mockResolvedValue(HOME_SUMMARY_FIXTURE);
    const { result } = renderHook(() => useHomeDashboard(loader));

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("loader를 넘기지 않으면 기본 API 함수를 쓴다", async () => {
    vi.mocked(fetchHomeSummary).mockResolvedValue(HOME_SUMMARY_FIXTURE);
    const { result } = renderHook(() => useHomeDashboard());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(fetchHomeSummary).toHaveBeenCalledTimes(1);
  });

  it("모든 블록이 비면 빈 상태가 된다", async () => {
    const { result } = renderHook(() =>
      useHomeDashboard(vi.fn().mockResolvedValue(EMPTY_HOME_SUMMARY_FIXTURE)),
    );
    await waitFor(() => expect(result.current.state.status).toBe("empty"));
  });

  it("ApiError는 서버 메시지를, 그 밖의 오류는 기본 문구를 보여준다", async () => {
    const apiHook = renderHook(() =>
      useHomeDashboard(
        vi.fn().mockRejectedValue(new ApiError("점검 중입니다.", 503, "UNAVAILABLE")),
      ),
    );
    await waitFor(() =>
      expect(apiHook.result.current.state).toEqual({
        status: "error",
        message: "점검 중입니다.",
      }),
    );

    const plainHook = renderHook(() =>
      useHomeDashboard(vi.fn().mockRejectedValue(new Error("boom"))),
    );
    await waitFor(() =>
      expect(plainHook.result.current.state).toEqual({
        status: "error",
        message: "홈 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
      }),
    );
  });

  it("reload는 다시 조회한다", async () => {
    const loader = vi.fn().mockResolvedValue(HOME_SUMMARY_FIXTURE);
    const { result } = renderHook(() => useHomeDashboard(loader));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.reload());
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  });

  it("응답이 도착하기 전에 언마운트되면 상태를 갱신하지 않는다", async () => {
    let resolveSummary!: (value: typeof HOME_SUMMARY_FIXTURE) => void;
    const success = new Promise<typeof HOME_SUMMARY_FIXTURE>((resolve) => {
      resolveSummary = resolve;
    });
    const successHook = renderHook(() =>
      useHomeDashboard(vi.fn().mockReturnValue(success)),
    );
    successHook.unmount();
    await act(async () => resolveSummary(HOME_SUMMARY_FIXTURE));
    expect(successHook.result.current.state.status).toBe("loading");

    let rejectSummary!: (reason: unknown) => void;
    const failure = new Promise<never>((_resolve, reject) => {
      rejectSummary = reject;
    });
    const failureHook = renderHook(() =>
      useHomeDashboard(vi.fn().mockReturnValue(failure)),
    );
    failureHook.unmount();
    await act(async () => {
      rejectSummary(new Error("late"));
      await failure.catch(() => undefined);
    });
    expect(failureHook.result.current.state.status).toBe("loading");
  });
});
