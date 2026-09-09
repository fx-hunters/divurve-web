import { describe, expect, it } from "vitest";
import {
  APP_PATHS,
  DIAGNOSIS_RESULT_ROUTE,
  LANDING_ROUTE,
  dashboardRoute,
  normalizePathname,
  plannerDetailRoute,
  plannerGoalRoute,
  plannerRoute,
  resolveAppRoute,
  resolvePostAuthRoute,
  toPathname,
  type AppRoute,
} from "./app-routing";

describe("normalizePathname", () => {
  it.each([
    ["/", "/"],
    ["/route/", "/route"],
    ["//mypage//diagnosis/", "/mypage/diagnosis"],
  ])("%s를 %s로 정규화한다", (pathname, expected) => {
    expect(normalizePathname(pathname)).toBe(expected);
  });
});

describe("resolveAppRoute", () => {
  it.each([
    [APP_PATHS.landing, LANDING_ROUTE],
    [APP_PATHS.login, { kind: "auth", mode: "login" }],
    [APP_PATHS.signup, { kind: "auth", mode: "signup" }],
    [APP_PATHS.dashboard, dashboardRoute("home")],
    [APP_PATHS.planner, plannerRoute("api", { kind: "goalSelect" })],
    ["/route/", plannerRoute("api", { kind: "goalSelect" })],
    ["/route/demo", plannerRoute("demo", { kind: "goalSelect" })],
    [APP_PATHS.assets, dashboardRoute("assets")],
    [APP_PATHS.range, dashboardRoute("range")],
    [APP_PATHS.mypage, dashboardRoute("mypage")],
  ] as const)("%s 경로를 해석한다", (pathname, expected) => {
    expect(resolveAppRoute(pathname, false)).toEqual(expected);
  });

  it("모르는 경로는 대시보드 홈으로 흡수한다", () => {
    expect(resolveAppRoute("/unknown", true)).toEqual(dashboardRoute("home"));
  });

  it.each([
    [
      "/route/goals/goal-usd/plans/plan-2",
      plannerDetailRoute("api", "goal-usd", "plan-2"),
    ],
    [
      "/route/demo/goals/demo%20goal/plans/demo%2Fplan",
      plannerDetailRoute("demo", "demo goal", "demo/plan"),
    ],
  ] as const)("%s 계획 상세 경로를 출처와 식별자로 해석한다", (pathname, expected) => {
    expect(resolveAppRoute(pathname, true)).toEqual(expected);
  });

  it("데모·비회원 세션은 API 계획 상세를 직접 조회하지 않는다", () => {
    expect(
      resolveAppRoute("/route/goals/goal-usd/plans/plan-2", false),
    ).toEqual(plannerRoute("api", { kind: "goalSelect" }));
    expect(
      resolveAppRoute(
        "/route/demo/goals/goal-demo/plans/plan-demo",
        false,
      ),
    ).toEqual(plannerDetailRoute("demo", "goal-demo", "plan-demo"));
  });

  it.each([
    ["/route/goals/goal-usd", plannerGoalRoute("api", "goal-usd", "main")],
    [
      "/route/goals/goal-usd/plan-setup",
      plannerGoalRoute("api", "goal-usd", "planSetup"),
    ],
    [
      "/route/goals/goal-usd/history",
      plannerGoalRoute("api", "goal-usd", "history"),
    ],
    [
      "/route/demo/goals/goal-demo/history",
      plannerGoalRoute("demo", "goal-demo", "history"),
    ],
    ["/route/goals/goal-usd/edit", plannerGoalRoute("api", "goal-usd", "edit")],
  ] as const)("%s 목표 단계 경로를 해석한다", (pathname, expected) => {
    expect(resolveAppRoute(pathname, true)).toEqual(expected);
  });

  it("모르는 단계 조각은 플래너가 아니라 대시보드 홈으로 흡수한다", () => {
    expect(resolveAppRoute("/route/goals/goal-usd/unknown", true)).toEqual(
      dashboardRoute("home"),
    );
  });

  it("잘못 인코딩된 계획 상세 경로는 대시보드 홈으로 안전하게 되돌린다", () => {
    expect(resolveAppRoute("/route/goals/%E0%A4%A/plans/plan", true)).toEqual(
      dashboardRoute("home"),
    );
  });

  it.each([
    [APP_PATHS.initialSetup, "onboarding"],
    [APP_PATHS.quickDiagnosis, "quickDiagnosis"],
    [APP_PATHS.detailedDiagnosis, "detailedDiagnosis"],
  ] as const)("회원에게 %s 진단 입력 화면을 연다", (pathname, entryMode) => {
    expect(resolveAppRoute(pathname, true)).toEqual({
      kind: "diagnosisInput",
      entryMode,
    });
  });

  it("회원의 진단 결과 경로를 마이페이지 위의 결과 화면으로 해석한다", () => {
    expect(resolveAppRoute(APP_PATHS.diagnosisResult, true)).toEqual(
      DIAGNOSIS_RESULT_ROUTE,
    );
  });

  it.each([APP_PATHS.detailedDiagnosis, APP_PATHS.diagnosisResult])(
    "회원 세션이 아니면 %s를 대시보드로 되돌린다",
    (pathname) => {
      expect(resolveAppRoute(pathname, false)).toEqual(dashboardRoute("home"));
    },
  );
});

describe("toPathname", () => {
  it.each([
    [LANDING_ROUTE, APP_PATHS.landing],
    [{ kind: "auth", mode: "login" }, APP_PATHS.login],
    [{ kind: "auth", mode: "signup" }, APP_PATHS.signup],
    [
      { kind: "diagnosisInput", entryMode: "quickDiagnosis" },
      APP_PATHS.quickDiagnosis,
    ],
    [dashboardRoute("home"), APP_PATHS.dashboard],
    [dashboardRoute("assets"), APP_PATHS.assets],
    [DIAGNOSIS_RESULT_ROUTE, APP_PATHS.diagnosisResult],
    [
      plannerDetailRoute("api", "goal usd", "plan/2"),
      "/route/goals/goal%20usd/plans/plan%2F2",
    ],
    [
      plannerDetailRoute("demo", "goal-demo", "plan-demo"),
      "/route/demo/goals/goal-demo/plans/plan-demo",
    ],
    [plannerRoute("api", { kind: "goalSelect" }), APP_PATHS.planner],
    [plannerRoute("demo", { kind: "goalSelect" }), "/route/demo"],
    [plannerGoalRoute("api", "goal-usd"), "/route/goals/goal-usd"],
    [
      plannerGoalRoute("api", "goal usd", "planSetup"),
      "/route/goals/goal%20usd/plan-setup",
    ],
    [
      plannerGoalRoute("demo", "goal-demo", "history"),
      "/route/demo/goals/goal-demo/history",
    ],
    [plannerGoalRoute("api", "goal-usd", "edit"), "/route/goals/goal-usd/edit"],
  ] as const)("%o 라우트를 %s 경로로 되돌린다", (route, expected) => {
    expect(toPathname(route as AppRoute)).toBe(expected);
  });

  it("랜딩과 대시보드 홈은 서로 다른 경로를 쓴다", () => {
    expect(toPathname(LANDING_ROUTE)).not.toBe(
      toPathname(dashboardRoute("home")),
    );
  });
});

describe("resolvePostAuthRoute", () => {
  it.each([
    [undefined, dashboardRoute("home")],
    [{ isDemo: false, onboarded: true }, dashboardRoute("home")],
    [{ isDemo: false }, dashboardRoute("home")],
    [{ isDemo: true, onboarded: false }, dashboardRoute("home")],
    [
      { isDemo: false, onboarded: false },
      { kind: "diagnosisInput", entryMode: "onboarding" },
    ],
  ] as const)("인증 결과 %o를 %o 라우트로 보낸다", (result, expected) => {
    expect(resolvePostAuthRoute(result)).toEqual(expected);
  });
});
