import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import {
  fetchXrayBundle,
  previewFitAdjustment,
  runStressScenario,
} from "../../api/xray";
import {
  FIT_PREVIEW_FIXTURE,
  NOT_MEASURED_XRAY_API_FIXTURE,
  STRESS_RUN_FIXTURE,
  XRAY_API_FIXTURE,
} from "../../test/api-fixtures";
import { toErrorMessage, useXRay, type XRayDependencies } from "./use-xray";

vi.mock("../../api/xray", () => ({
  fetchXrayBundle: vi.fn(),
  runStressScenario: vi.fn(),
  previewFitAdjustment: vi.fn(),
}));

function makeDependencies(
  overrides: Partial<XRayDependencies> = {},
): XRayDependencies {
  return {
    loadBundle: vi.fn().mockResolvedValue(XRAY_API_FIXTURE),
    runScenario: vi.fn().mockResolvedValue(STRESS_RUN_FIXTURE),
    previewAdjustment: vi.fn().mockResolvedValue(FIT_PREVIEW_FIXTURE),
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("toErrorMessage", () => {
  it("ApiError는 서버 메시지를, 그 밖의 오류는 기본 문구를 쓴다", () => {
    expect(
      toErrorMessage(new ApiError("점검 중입니다.", 503, "UNAVAILABLE"), "기본"),
    ).toBe("점검 중입니다.");
    expect(toErrorMessage(new Error("boom"), "기본")).toBe("기본");
  });
});

describe("useXRay", () => {
  it("묶음을 조회해 성공 상태가 되고 뷰 데이터를 만든다", async () => {
    const { result } = renderHook(() => useXRay(makeDependencies()));

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(result.current.data?.fxRatioPct).toBe(40);
    expect(result.current.activeTab).toBe("exposure");
  });

  it("의존성을 넘기지 않으면 기본 API 함수를 쓴다", async () => {
    vi.mocked(fetchXrayBundle).mockResolvedValue(XRAY_API_FIXTURE);
    const { result } = renderHook(() => useXRay());
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(fetchXrayBundle).toHaveBeenCalledTimes(1);
    expect(runStressScenario).not.toHaveBeenCalled();
    expect(previewFitAdjustment).not.toHaveBeenCalled();
  });

  it("총 자산이 0이면 빈 상태가 되고 뷰 데이터는 없다", async () => {
    const dependencies = makeDependencies({
      loadBundle: vi.fn().mockResolvedValue({
        ...NOT_MEASURED_XRAY_API_FIXTURE,
        overview: { ...NOT_MEASURED_XRAY_API_FIXTURE.overview, totalAssetKrw: 0 },
      }),
    });
    const { result } = renderHook(() => useXRay(dependencies));
    await waitFor(() => expect(result.current.state.status).toBe("empty"));
    expect(result.current.data).toBeNull();
  });

  it("조회에 실패하면 메시지를 담고 reload로 다시 조회한다", async () => {
    const loadBundle = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("점검 중입니다.", 503, "UNAVAILABLE"))
      .mockResolvedValue(XRAY_API_FIXTURE);
    const { result } = renderHook(() => useXRay(makeDependencies({ loadBundle })));

    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: "error",
        message: "점검 중입니다.",
      }),
    );

    act(() => result.current.reload());
    await waitFor(() => expect(result.current.state.status).toBe("success"));
  });

  it("알 수 없는 오류에는 기본 문구를 쓴다", async () => {
    const { result } = renderHook(() =>
      useXRay(makeDependencies({ loadBundle: vi.fn().mockRejectedValue(new Error("x")) })),
    );
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: "error",
        message: "내 자산 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
      }),
    );
  });

  it("탭을 바꾼다", async () => {
    const { result } = renderHook(() => useXRay(makeDependencies()));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    act(() => result.current.setActiveTab("fitness"));
    expect(result.current.activeTab).toBe("fitness");
  });

  it("시나리오를 고르면 서버에 실행을 요청하고 결과를 담는다", async () => {
    const runScenario = vi.fn().mockResolvedValue(STRESS_RUN_FIXTURE);
    const { result } = renderHook(() => useXRay(makeDependencies({ runScenario })));
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    act(() => result.current.selectScenario("equity_down_krw_weak"));
    expect(result.current.selectedScenarioCode).toBe("equity_down_krw_weak");

    await waitFor(() => expect(result.current.runState.status).toBe("done"));
    expect(runScenario).toHaveBeenCalledWith({
      scenarioCode: "equity_down_krw_weak",
    });
    expect(result.current.runResult?.totalEffectKrw).toBe(-520_000);
  });

  it("시나리오 실행이 실패하면 메시지를 담고 결과는 비운다", async () => {
    const runScenario = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useXRay(makeDependencies({ runScenario })));
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    act(() => result.current.selectScenario("equity_down_krw_weak"));
    await waitFor(() =>
      expect(result.current.runState).toEqual({
        status: "error",
        message: "시나리오를 계산하지 못했습니다. 잠시 후 다시 확인해 주세요.",
      }),
    );
    expect(result.current.runResult).toBeNull();
  });

  it("비중 조정 결과를 요청하고 결과를 담는다", async () => {
    const previewAdjustment = vi.fn().mockResolvedValue(FIT_PREVIEW_FIXTURE);
    const { result } = renderHook(() =>
      useXRay(makeDependencies({ previewAdjustment })),
    );
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    act(() =>
      result.current.previewAdjustment({ currencyCode: "EUR", deltaShare: 0.1 }),
    );
    await waitFor(() => expect(result.current.previewState.status).toBe("done"));
    expect(previewAdjustment).toHaveBeenCalledWith({
      currencyCode: "EUR",
      deltaShare: 0.1,
    });
  });

  it("비중 조정 요청이 실패하면 메시지를 담는다", async () => {
    const previewAdjustment = vi
      .fn()
      .mockRejectedValue(new ApiError("계산 불가", 400, "VALIDATION"));
    const { result } = renderHook(() =>
      useXRay(makeDependencies({ previewAdjustment })),
    );
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    act(() =>
      result.current.previewAdjustment({ currencyCode: "EUR", deltaShare: 0.1 }),
    );
    await waitFor(() =>
      expect(result.current.previewState).toEqual({
        status: "error",
        message: "계산 불가",
      }),
    );
  });

  it("응답이 도착하기 전에 언마운트되면 상태를 갱신하지 않는다", async () => {
    let resolveBundle!: (value: typeof XRAY_API_FIXTURE) => void;
    const success = new Promise<typeof XRAY_API_FIXTURE>((resolve) => {
      resolveBundle = resolve;
    });
    const successHook = renderHook(() =>
      useXRay(makeDependencies({ loadBundle: vi.fn().mockReturnValue(success) })),
    );
    successHook.unmount();
    await act(async () => resolveBundle(XRAY_API_FIXTURE));
    expect(successHook.result.current.state.status).toBe("loading");

    let rejectBundle!: (reason: unknown) => void;
    const failure = new Promise<never>((_resolve, reject) => {
      rejectBundle = reject;
    });
    const failureHook = renderHook(() =>
      useXRay(makeDependencies({ loadBundle: vi.fn().mockReturnValue(failure) })),
    );
    failureHook.unmount();
    await act(async () => {
      rejectBundle(new Error("late"));
      await failure.catch(() => undefined);
    });
    expect(failureHook.result.current.state.status).toBe("loading");
  });
});
