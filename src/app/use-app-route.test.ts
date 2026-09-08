import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readApiSession } from "../api/session";
import {
  APP_PATHS,
  DIAGNOSIS_RESULT_ROUTE,
  LANDING_ROUTE,
  dashboardRoute,
} from "./app-routing";
import { useAppRoute } from "./use-app-route";

vi.mock("../api/session", () => ({ readApiSession: vi.fn() }));

const MEMBER_SESSION = {
  accessToken: "access",
  refreshToken: "refresh",
  expiresIn: 1800,
  isDemo: false,
  onboarded: true,
};

beforeEach(() => {
  vi.mocked(readApiSession).mockReturnValue(null);
  window.history.replaceState(null, "", APP_PATHS.landing);
});

describe("useAppRoute", () => {
  it("현재 주소를 라우트로 해석한다", () => {
    window.history.replaceState(null, "", APP_PATHS.dashboard);
    const { result } = renderHook(() => useAppRoute());

    expect(result.current.route).toEqual(dashboardRoute("home"));
  });

  it("이동 시 히스토리에 항목을 남기고 같은 경로는 다시 쌓지 않는다", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => useAppRoute());

    act(() => result.current.navigate(dashboardRoute("planner")));
    expect(window.location.pathname).toBe(APP_PATHS.planner);
    expect(pushState).toHaveBeenCalledOnce();

    act(() => result.current.navigate(dashboardRoute("planner")));
    expect(pushState).toHaveBeenCalledOnce();

    pushState.mockRestore();
  });

  it("replace는 히스토리 항목을 늘리지 않고 주소만 갈아끼운다", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => useAppRoute());

    act(() => result.current.replace(dashboardRoute("mypage")));
    expect(window.location.pathname).toBe(APP_PATHS.mypage);
    expect(result.current.route).toEqual(dashboardRoute("mypage"));
    expect(pushState).not.toHaveBeenCalled();

    pushState.mockRestore();
  });

  it("뒤로가기로 랜딩에 돌아오면 랜딩 라우트로 되돌아간다", () => {
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const { result, unmount } = renderHook(() => useAppRoute());

    act(() => result.current.navigate(dashboardRoute("home")));
    expect(result.current.route).toEqual(dashboardRoute("home"));

    window.history.replaceState(null, "", APP_PATHS.landing);
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(result.current.route).toEqual(LANDING_ROUTE);

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      "popstate",
      expect.any(Function),
    );
    removeEventListener.mockRestore();
  });

  it("회원이 아닌 세션이 진단 경로로 들어오면 주소까지 대시보드로 맞춘다", () => {
    window.history.replaceState(null, "", APP_PATHS.quickDiagnosis);
    const { result } = renderHook(() => useAppRoute());

    expect(result.current.route).toEqual(dashboardRoute("home"));
    expect(window.location.pathname).toBe(APP_PATHS.dashboard);
  });

  it("끝 슬래시가 붙은 별칭 경로를 정식 경로로 정리한다", () => {
    window.history.replaceState(null, "", "/route/");
    const { result } = renderHook(() => useAppRoute());

    expect(result.current.route).toEqual(dashboardRoute("planner"));
    expect(window.location.pathname).toBe(APP_PATHS.planner);
  });

  it("회원 세션이면 진단 결과 경로를 그대로 유지한다", () => {
    vi.mocked(readApiSession).mockReturnValue(MEMBER_SESSION);
    window.history.replaceState(null, "", APP_PATHS.diagnosisResult);
    const { result } = renderHook(() => useAppRoute());

    expect(result.current.route).toEqual(DIAGNOSIS_RESULT_ROUTE);
    expect(window.location.pathname).toBe(APP_PATHS.diagnosisResult);
  });
});
