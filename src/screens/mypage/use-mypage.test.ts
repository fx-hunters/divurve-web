import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import {
  MY_PAGE_API_FIXTURE,
  MY_PAGE_SETTINGS_FIXTURE,
} from "../../test/api-fixtures";
import { useMyPage, type MyPageDependencies } from "./use-mypage";

function makeDependencies(
  overrides: Partial<MyPageDependencies> = {},
): MyPageDependencies {
  return {
    load: vi.fn().mockResolvedValue(MY_PAGE_API_FIXTURE),
    saveSettings: vi.fn().mockResolvedValue(MY_PAGE_SETTINGS_FIXTURE),
    ...overrides,
  };
}

describe("useMyPage", () => {
  it("ApiError가 아닌 조회 실패에는 기본 안내 문구를 쓴다", async () => {
    const { result } = renderHook(() =>
      useMyPage(
        makeDependencies({ load: vi.fn().mockRejectedValue(new Error("boom")) }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe("error"));
    expect(result.current.state).toMatchObject({
      message: "마이페이지 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
    });
  });

  it("ApiError 저장 실패에는 서버 메시지를 그대로 쓴다", async () => {
    const { result } = renderHook(() =>
      useMyPage(
        makeDependencies({
          saveSettings: vi
            .fn()
            .mockRejectedValue(new ApiError("설정 API 오류", 500, "SERVER")),
        }),
      ),
    );
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    act(() => result.current.saveSettings({ fxDiscountRatio: 0.5 }));

    await waitFor(() =>
      expect(result.current.saveState).toEqual({
        status: "error",
        message: "설정 API 오류",
      }),
    );
  });

  it("ApiError가 아닌 저장 실패에는 기본 안내 문구를 쓴다", async () => {
    const { result } = renderHook(() =>
      useMyPage(
        makeDependencies({
          saveSettings: vi.fn().mockRejectedValue(new Error("boom")),
        }),
      ),
    );
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    act(() => result.current.saveSettings({ notifyStepDue: false }));

    await waitFor(() =>
      expect(result.current.saveState).toEqual({
        status: "error",
        message: "설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      }),
    );
  });

  it("저장 도중 재조회가 시작되면 늦게 도착한 설정으로 덮어쓰지 않는다", async () => {
    let resolveSave!: (value: typeof MY_PAGE_SETTINGS_FIXTURE) => void;
    const savePromise = new Promise<typeof MY_PAGE_SETTINGS_FIXTURE>(
      (resolve) => {
        resolveSave = resolve;
      },
    );
    let resolveReload!: (value: typeof MY_PAGE_API_FIXTURE) => void;
    const reloadPromise = new Promise<typeof MY_PAGE_API_FIXTURE>((resolve) => {
      resolveReload = resolve;
    });
    const load = vi
      .fn()
      .mockResolvedValueOnce(MY_PAGE_API_FIXTURE)
      .mockReturnValueOnce(reloadPromise);
    const dependencies = makeDependencies({
      load,
      saveSettings: vi.fn().mockReturnValue(savePromise),
    });

    const { result } = renderHook(() => useMyPage(dependencies));
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    act(() => result.current.saveSettings({ fxDiscountRatio: 0.5 }));
    act(() => result.current.reload());
    expect(result.current.state.status).toBe("loading");

    await act(async () => {
      resolveSave({ ...MY_PAGE_SETTINGS_FIXTURE, effectiveSpreadRatio: 0.009 });
      await savePromise;
    });
    expect(result.current.state.status).toBe("loading");

    await act(async () => {
      resolveReload(MY_PAGE_API_FIXTURE);
      await reloadPromise;
    });
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(result.current.state).toMatchObject({
      data: { settings: { effectiveSpreadLabel: "0.20%" } },
    });
  });
});
