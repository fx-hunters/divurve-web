import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getTabFromPathname,
  NAV_PATHS,
  useTabNavigation,
} from "./use-tab-navigation";

describe("getTabFromPathname", () => {
  it.each([
    ["/route", "planner"],
    ["/route/", "planner"],
    ["/xray", "assets"],
    ["/forecast", "range"],
    ["/mypage", "mypage"],
    ["/mypage/diagnosis", "mypage"],
    ["/connectivity", "connectivity"],
    ["/", "home"],
    ["/unknown", "home"],
  ] as const)("%s 경로를 %s 탭으로 해석한다", (pathname, tab) => {
    expect(getTabFromPathname(pathname)).toBe(tab);
  });
});

describe("useTabNavigation", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", NAV_PATHS.home);
  });

  it("탭 이동 시 URL과 활성 탭을 함께 변경하고 같은 경로는 다시 추가하지 않는다", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => useTabNavigation());

    act(() => result.current.navigate("planner"));
    expect(result.current.activeTab).toBe("planner");
    expect(window.location.pathname).toBe("/route");
    expect(pushState).toHaveBeenCalledOnce();

    act(() => result.current.navigate("planner"));
    expect(pushState).toHaveBeenCalledOnce();

    pushState.mockRestore();
  });

  it("브라우저 popstate와 현재 경로를 동기화하고 언마운트 시 구독을 해제한다", () => {
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const { result, unmount } = renderHook(() => useTabNavigation());

    window.history.replaceState(null, "", "/mypage");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(result.current.activeTab).toBe("mypage");

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      "popstate",
      expect.any(Function),
    );
    removeEventListener.mockRestore();
  });
});
