/**
 * 사용자 앱의 단일 경로 해석기.
 *
 * 화면 하나가 URL 하나에 대응하도록, pathname ↔ 화면 상태 변환을 여기서만 한다.
 * 경로 해석이 여러 곳에 흩어지면 대시보드 홈과 랜딩이 같은 `/`를 쓰는 식의
 * 충돌을 알아채기 어렵다.
 *
 * `/admin` 아래는 `root.tsx`가 먼저 갈라내므로 여기서 다루지 않는다.
 */
import type { AuthSuccessResult } from "../types/auth";
import type { InitialSetupEntryMode } from "../types/diagnosis";
import type { NavTabId } from "../types/navigation";

export type AuthRouteMode = "login" | "signup";

/** 화면별 정식 경로. 링크·리다이렉트는 모두 이 값을 참조한다. */
export const APP_PATHS = {
  landing: "/",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  planner: "/route",
  assets: "/xray",
  range: "/forecast",
  mypage: "/mypage",
  initialSetup: "/initial-setup",
  quickDiagnosis: "/diagnosis/quick",
  detailedDiagnosis: "/diagnosis/detail",
  diagnosisResult: "/mypage/diagnosis",
} as const;

const TAB_PATHS: Readonly<Record<NavTabId, string>> = {
  home: APP_PATHS.dashboard,
  planner: APP_PATHS.planner,
  assets: APP_PATHS.assets,
  range: APP_PATHS.range,
  mypage: APP_PATHS.mypage,
};

const TAB_BY_PATH: Readonly<Partial<Record<string, NavTabId>>> = {
  [APP_PATHS.dashboard]: "home",
  [APP_PATHS.planner]: "planner",
  [APP_PATHS.assets]: "assets",
  [APP_PATHS.range]: "range",
  [APP_PATHS.mypage]: "mypage",
};

const DIAGNOSIS_INPUT_PATHS: Readonly<Record<InitialSetupEntryMode, string>> = {
  onboarding: APP_PATHS.initialSetup,
  quickDiagnosis: APP_PATHS.quickDiagnosis,
  detailedDiagnosis: APP_PATHS.detailedDiagnosis,
};

const DIAGNOSIS_ENTRY_BY_PATH: Readonly<
  Partial<Record<string, InitialSetupEntryMode>>
> = {
  [APP_PATHS.initialSetup]: "onboarding",
  [APP_PATHS.quickDiagnosis]: "quickDiagnosis",
  [APP_PATHS.detailedDiagnosis]: "detailedDiagnosis",
};

export type AppRoute =
  | { readonly kind: "landing" }
  | { readonly kind: "auth"; readonly mode: AuthRouteMode }
  | {
      readonly kind: "diagnosisInput";
      readonly entryMode: InitialSetupEntryMode;
    }
  | {
      readonly kind: "dashboard";
      readonly tab: NavTabId;
      /** 마이페이지 탭 안에서 진단 결과를 펼친 상태만 별도 경로를 가진다. */
      readonly view: "tab" | "diagnosisResult";
    };

export function dashboardRoute(tab: NavTabId): AppRoute {
  return { kind: "dashboard", tab, view: "tab" };
}

export const LANDING_ROUTE: AppRoute = { kind: "landing" };

export const DIAGNOSIS_RESULT_ROUTE: AppRoute = {
  kind: "dashboard",
  tab: "mypage",
  view: "diagnosisResult",
};

/** 끝 슬래시와 중복 슬래시를 지운 경로. `/route/`와 `/route`를 같게 본다. */
export function normalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : collapsed;
}

export function toPathname(route: AppRoute): string {
  switch (route.kind) {
    case "landing":
      return APP_PATHS.landing;
    case "auth":
      return route.mode === "signup" ? APP_PATHS.signup : APP_PATHS.login;
    case "diagnosisInput":
      return DIAGNOSIS_INPUT_PATHS[route.entryMode];
    case "dashboard":
      return route.view === "diagnosisResult"
        ? APP_PATHS.diagnosisResult
        : TAB_PATHS[route.tab];
  }
}

/**
 * 주소를 화면으로 바꾼다.
 *
 * 진단 흐름은 회원 계정 전용이라, 데모·비로그인 세션이 그 경로로 들어오면
 * 대시보드로 되돌린다. 호출부는 돌려받은 라우트의 `toPathname()`으로
 * 주소창을 맞춰서 URL과 화면이 어긋난 채 남지 않게 한다.
 */
export function resolveAppRoute(
  pathname: string,
  isMemberSession: boolean,
): AppRoute {
  const path = normalizePathname(pathname);

  if (path === APP_PATHS.landing) return LANDING_ROUTE;
  if (path === APP_PATHS.login) return { kind: "auth", mode: "login" };
  if (path === APP_PATHS.signup) return { kind: "auth", mode: "signup" };

  const entryMode = DIAGNOSIS_ENTRY_BY_PATH[path];
  if (entryMode !== undefined) {
    return isMemberSession
      ? { kind: "diagnosisInput", entryMode }
      : dashboardRoute("home");
  }

  if (path === APP_PATHS.diagnosisResult) {
    return isMemberSession ? DIAGNOSIS_RESULT_ROUTE : dashboardRoute("home");
  }

  // 모르는 경로는 대시보드로 흡수한다(별도 404 화면을 두지 않는다).
  return dashboardRoute(TAB_BY_PATH[path] ?? "home");
}

/** 인증 직후 갈 화면. 온보딩이 남은 회원만 초기 설정으로 보낸다. */
export function resolvePostAuthRoute(
  result: AuthSuccessResult | void,
): AppRoute {
  if (result?.isDemo === true) return dashboardRoute("home");

  return result?.onboarded === false
    ? { kind: "diagnosisInput", entryMode: "onboarding" }
    : dashboardRoute("home");
}
