import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError, type ApiResult } from "../../api/client";
import { useAdminRequest } from "./use-admin-request";

const META = { asOf: "2026-09-07T00:00:00Z" };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useAdminRequest", () => {
  it("호출 전에는 idle이고, 부르면 loading을 거쳐 결과를 담는다", async () => {
    const run = vi.fn(
      async (id: string): Promise<ApiResult<string>> => ({
        data: `data-${id}`,
        meta: META,
      }),
    );
    const { result } = renderHook(() => useAdminRequest(run, vi.fn()));

    expect(result.current.state.status).toBe("idle");

    await act(async () => {
      await result.current.send("7");
    });

    expect(result.current.state).toEqual({
      status: "success",
      result: { data: "data-7", meta: META },
    });
    expect(run).toHaveBeenCalledWith("7");
  });

  it("보내는 동안 loading 상태를 노출한다", async () => {
    const pending = deferred<ApiResult<string>>();
    const { result } = renderHook(() =>
      useAdminRequest(() => pending.promise, vi.fn()),
    );

    act(() => {
      void result.current.send();
    });
    await waitFor(() => expect(result.current.state.status).toBe("loading"));

    await act(async () => {
      pending.resolve({ data: "ok", meta: META });
      await pending.promise;
    });
    expect(result.current.state.status).toBe("success");
  });

  it("권한·세션 에러가 아니면 화면에 남긴다", async () => {
    const onAuthFailure = vi.fn();
    const { result } = renderHook(() =>
      useAdminRequest(
        () => Promise.reject(new ApiError("없습니다.", 404, "NOT_FOUND")),
        onAuthFailure,
      ),
    );

    await act(async () => {
      await result.current.send();
    });

    expect(result.current.state).toEqual({
      status: "error",
      error: {
        message: "없습니다.",
        code: "NOT_FOUND",
        field: null,
        status: 404,
      },
    });
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it("403은 화면에 에러를 남기지 않고 위로 알린다", async () => {
    const onAuthFailure = vi.fn();
    const { result } = renderHook(() =>
      useAdminRequest(
        () => Promise.reject(new ApiError("권한 없음", 403, "FORBIDDEN")),
        onAuthFailure,
      ),
    );

    await act(async () => {
      await result.current.send();
    });

    expect(onAuthFailure).toHaveBeenCalledWith("forbidden");
    expect(result.current.state.status).toBe("loading");
  });

  it("먼저 보낸 요청이 늦게 끝나도 마지막 결과만 반영한다", async () => {
    const first = deferred<ApiResult<string>>();
    const second = deferred<ApiResult<string>>();
    const run = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useAdminRequest(run, vi.fn()));

    act(() => {
      void result.current.send();
      void result.current.send();
    });

    await act(async () => {
      second.resolve({ data: "second", meta: META });
      await second.promise;
      first.resolve({ data: "first", meta: META });
      await first.promise;
    });

    expect(result.current.state).toEqual({
      status: "success",
      result: { data: "second", meta: META },
    });
  });

  it("늦게 도착한 실패도 무시한다", async () => {
    const first = deferred<ApiResult<string>>();
    const run = vi.fn().mockReturnValue(first.promise);
    const { result } = renderHook(() => useAdminRequest(run, vi.fn()));

    act(() => {
      void result.current.send();
    });
    act(() => {
      result.current.reset();
    });

    await act(async () => {
      first.reject(new ApiError("늦은 실패", 500, "INTERNAL_ERROR"));
      await first.promise.catch(() => undefined);
    });

    expect(result.current.state.status).toBe("idle");
  });
});
