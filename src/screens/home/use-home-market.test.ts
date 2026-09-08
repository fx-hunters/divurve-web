import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiResult } from "../../api/client";
import type { ForecastResponse } from "../../api/generated/divurve-api";
import { fetchHomeMarketSnapshot } from "../../api/home";
import { FORECAST_API_FIXTURE } from "../../test/api-fixtures";
import { useHomeMarket } from "./use-home-market";

vi.mock("../../api/home", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/home")>();
  return { ...actual, fetchHomeMarketSnapshot: vi.fn() };
});

const FORECAST_RESULT: ApiResult<ForecastResponse> = {
  data: FORECAST_API_FIXTURE.forecast,
  meta: { asOf: FORECAST_API_FIXTURE.asOf },
};

beforeEach(() => vi.clearAllMocks());

describe("useHomeMarket", () => {
  it("첫 렌더에서는 홈 요약 값을 쓰고 조회하지 않는다", () => {
    const loader = vi.fn().mockResolvedValue(FORECAST_RESULT);
    const { result } = renderHook(() => useHomeMarket("USDKRW", loader));

    expect(result.current.state).toEqual({ status: "summary" });
    expect(result.current.pairCode).toBe("USDKRW");
    expect(loader).not.toHaveBeenCalled();
  });

  it("통화쌍을 고르면 그 통화쌍으로 다시 조회한다", async () => {
    const loader = vi.fn().mockResolvedValue(FORECAST_RESULT);
    const { result } = renderHook(() => useHomeMarket("USDKRW", loader));

    act(() => result.current.selectPairCode("USDJPY"));

    expect(result.current.pairCode).toBe("USDJPY");
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(loader).toHaveBeenCalledWith("USDJPY");
  });

  it("loader를 넘기지 않으면 기본 API 함수를 쓴다", async () => {
    vi.mocked(fetchHomeMarketSnapshot).mockResolvedValue(FORECAST_RESULT);
    const { result } = renderHook(() => useHomeMarket("USDKRW"));

    act(() => result.current.selectPairCode("EURUSD"));

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(fetchHomeMarketSnapshot).toHaveBeenCalledWith("EURUSD");
  });

  it("reload는 같은 통화쌍으로 한 번 더 조회한다", async () => {
    const loader = vi.fn().mockResolvedValue(FORECAST_RESULT);
    const { result } = renderHook(() => useHomeMarket("USDKRW", loader));

    act(() => result.current.selectPairCode("USDJPY"));
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(1));

    act(() => result.current.reload());
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    expect(loader).toHaveBeenLastCalledWith("USDJPY");
  });

  it("ApiError는 서버 메시지를, 그 밖의 오류는 기본 문구를 보여준다", async () => {
    const apiHook = renderHook(() =>
      useHomeMarket(
        "USDKRW",
        vi.fn().mockRejectedValue(new ApiError("점검 중입니다.", 503, "UNAVAILABLE")),
      ),
    );
    act(() => apiHook.result.current.selectPairCode("USDJPY"));
    await waitFor(() =>
      expect(apiHook.result.current.state).toEqual({
        status: "error",
        message: "점검 중입니다.",
      }),
    );

    const plainHook = renderHook(() =>
      useHomeMarket("USDKRW", vi.fn().mockRejectedValue(new Error("boom"))),
    );
    act(() => plainHook.result.current.selectPairCode("USDJPY"));
    await waitFor(() =>
      expect(plainHook.result.current.state).toEqual({
        status: "error",
        message: "시세를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
      }),
    );
  });

  it("응답이 도착하기 전에 언마운트되면 상태를 갱신하지 않는다", async () => {
    let resolveMarket!: (value: ApiResult<ForecastResponse>) => void;
    const success = new Promise<ApiResult<ForecastResponse>>((resolve) => {
      resolveMarket = resolve;
    });
    const successHook = renderHook(() =>
      useHomeMarket("USDKRW", vi.fn().mockReturnValue(success)),
    );
    act(() => successHook.result.current.selectPairCode("USDJPY"));
    successHook.unmount();
    await act(async () => resolveMarket(FORECAST_RESULT));
    expect(successHook.result.current.state.status).toBe("loading");

    let rejectMarket!: (reason: unknown) => void;
    const failure = new Promise<never>((_resolve, reject) => {
      rejectMarket = reject;
    });
    const failureHook = renderHook(() =>
      useHomeMarket("USDKRW", vi.fn().mockReturnValue(failure)),
    );
    act(() => failureHook.result.current.selectPairCode("USDJPY"));
    failureHook.unmount();
    await act(async () => {
      rejectMarket(new Error("late"));
      await failure.catch(() => undefined);
    });
    expect(failureHook.result.current.state.status).toBe("loading");
  });
});
