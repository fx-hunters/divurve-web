import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import { fetchForecastBundle } from "../../api/forecast";
import {
  EMPTY_FORECAST_API_FIXTURE,
  FORECAST_API_FIXTURE,
} from "../../test/api-fixtures";
import { horizonDaysOf, useForecast } from "./use-forecast";

vi.mock("../../api/forecast", () => ({
  fetchForecastBundle: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => vi.clearAllMocks());

describe("horizonDaysOf", () => {
  it("기간 토글을 서버가 받는 일수로 바꾼다", () => {
    expect(horizonDaysOf("30D")).toBe(30);
    expect(horizonDaysOf("90D")).toBe(90);
  });
});

describe("useForecast", () => {
  it("기본 통화와 기간으로 조회해 성공 상태가 된다", async () => {
    const loader = vi.fn().mockResolvedValue(FORECAST_API_FIXTURE);
    const { result } = renderHook(() => useForecast(loader));

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(loader).toHaveBeenCalledWith("USD_KRW", 30);
  });

  it("통화와 기간을 바꾸면 해당 조건으로 다시 조회한다", async () => {
    const loader = vi.fn().mockResolvedValue(FORECAST_API_FIXTURE);
    const { result } = renderHook(() => useForecast(loader));
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    act(() => result.current.setCurrency("JPY"));
    act(() => result.current.setPeriod("90D"));
    await waitFor(() =>
      expect(loader).toHaveBeenLastCalledWith("JPY_KRW", 90),
    );
  });

  it("loader를 넘기지 않으면 기본 API 함수를 쓴다", async () => {
    vi.mocked(fetchForecastBundle).mockResolvedValue(FORECAST_API_FIXTURE);
    const { result } = renderHook(() => useForecast());
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(fetchForecastBundle).toHaveBeenCalledWith("USD_KRW", 30);
  });

  it("history·band·modelPath가 모두 비면 빈 상태가 된다", async () => {
    const loader = vi.fn().mockResolvedValue(EMPTY_FORECAST_API_FIXTURE);
    const { result } = renderHook(() => useForecast(loader));
    await waitFor(() => expect(result.current.state.status).toBe("empty"));
  });

  it.each([
    ["history", { ...EMPTY_FORECAST_API_FIXTURE.forecast, history: [{ d: "d", rate: 1 }] }],
    ["band", { ...EMPTY_FORECAST_API_FIXTURE.forecast, band: FORECAST_API_FIXTURE.forecast.band }],
    ["modelPath", { ...EMPTY_FORECAST_API_FIXTURE.forecast, modelPath: [{ d: "d", rate: 1 }] }],
  ])("%s 하나만 있어도 성공 상태다", async (_label, forecast) => {
    const loader = vi
      .fn()
      .mockResolvedValue({ ...EMPTY_FORECAST_API_FIXTURE, forecast });
    const { result } = renderHook(() => useForecast(loader));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
  });

  it("ApiError는 서버 메시지를, 그 밖의 오류는 기본 문구를 보여준다", async () => {
    const apiHook = renderHook(() =>
      useForecast(
        vi.fn().mockRejectedValue(new ApiError("서버 점검 중입니다.", 503, "UNAVAILABLE")),
      ),
    );
    await waitFor(() =>
      expect(apiHook.result.current.state).toEqual({
        status: "error",
        message: "서버 점검 중입니다.",
      }),
    );

    const plainHook = renderHook(() =>
      useForecast(vi.fn().mockRejectedValue(new Error("boom"))),
    );
    await waitFor(() =>
      expect(plainHook.result.current.state).toEqual({
        status: "error",
        message:
          "환율 범위 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
      }),
    );
  });

  it("reload는 같은 조건으로 다시 조회한다", async () => {
    const loader = vi.fn().mockResolvedValue(FORECAST_API_FIXTURE);
    const { result } = renderHook(() => useForecast(loader));
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    act(() => result.current.reload());
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  });

  it("응답이 도착하기 전에 언마운트되면 상태를 갱신하지 않는다", async () => {
    const success = deferred<typeof FORECAST_API_FIXTURE>();
    const successHook = renderHook(() =>
      useForecast(vi.fn().mockReturnValue(success.promise)),
    );
    successHook.unmount();
    await act(async () => success.resolve(FORECAST_API_FIXTURE));
    expect(successHook.result.current.state.status).toBe("loading");

    const failure = deferred<never>();
    const failureHook = renderHook(() =>
      useForecast(vi.fn().mockReturnValue(failure.promise)),
    );
    failureHook.unmount();
    await act(async () => {
      failure.reject(new Error("late"));
      await failure.promise.catch(() => undefined);
    });
    expect(failureHook.result.current.state.status).toBe("loading");
  });
});
