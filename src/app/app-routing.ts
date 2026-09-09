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
export type PlannerRouteSource = "api" | "demo";

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
      readonly view: "tab";
    }
  | {
      readonly kind: "dashboard";
      readonly tab: "mypage";
      readonly view: "diagnosisResult";
    }
  | {
      readonly kind: "dashboard";
      readonly tab: "planner";
      readonly view: "planner";
      readonly source: PlannerRouteSource;
      readonly target: PlannerRouteTarget;
    };

/**
 * 플래너 안에서 지금 보고 있는 것.
 *
 * 단계마다 주소가 달라야 새로고침과 뒤로가기가 단계를 지키고, 특정 목표나 계획을
 * 링크로 가리킬 수 있다. 목표가 정해지지 않은 단계와 정해진 단계를 유니온으로
 * 갈라, 목표 없이 계획 상세를 가리키는 상태를 타입에서 막는다.
 */
export type PlannerRouteTarget =
  | { readonly kind: "goalSelect" }
  | {
      readonly kind: "goal";
      readonly goalId: string;
      readonly stage: PlannerGoalStage;
    }
  | {
      readonly kind: "planDetail";
      readonly goalId: string;
      readonly planId: string;
    };

/** 목표 하나를 고른 뒤의 단계. 주소 조각과 짝을 이룬다. */
export type PlannerGoalStage = "main" | "planSetup" | "history" | "edit";

const PLANNER_STAGE_SEGMENTS: Readonly<Record<PlannerGoalStage, string>> = {
  main: "",
  planSetup: "/plan-setup",
  history: "/history",
  edit: "/edit",
};


export function dashboardRoute(tab: NavTabId): AppRoute {
  return { kind: "dashboard", tab, view: "tab" };
}

type PlannerRoute = Extract<AppRoute, { readonly view: "planner" }>;

export function plannerRoute(
  source: PlannerRouteSource,
  target: PlannerRouteTarget,
): PlannerRoute {
  return { kind: "dashboard", tab: "planner", view: "planner", source, target };
}

export function plannerGoalRoute(
  source: PlannerRouteSource,
  goalId: string,
  stage: PlannerGoalStage = "main",
): PlannerRoute {
  return plannerRoute(source, { kind: "goal", goalId, stage });
}

export function plannerDetailRoute(
  source: PlannerRouteSource,
  goalId: string,
  planId: string,
): PlannerRoute {
  return plannerRoute(source, { kind: "planDetail", goalId, planId });
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
      if (route.view === "diagnosisResult") return APP_PATHS.diagnosisResult;
      if (route.view === "planner") return plannerPathname(route);
      return TAB_PATHS[route.tab];
  }
}

function plannerPathname(route: PlannerRoute): string {
  const prefix = route.source === "demo" ? "/route/demo" : APP_PATHS.planner;
  const { target } = route;
  if (target.kind === "goalSelect") return prefix;

  const goalPath = `${prefix}/goals/${encodeURIComponent(target.goalId)}`;
  return target.kind === "planDetail"
    ? `${goalPath}/plans/${encodeURIComponent(target.planId)}`
    : `${goalPath}${PLANNER_STAGE_SEGMENTS[target.stage]}`;
}

const PLANNER_PATH_PATTERN =
  /^\/route(\/demo)?(?:\/goals\/([^/]+)(?:\/(plan-setup|history|edit)|\/plans\/([^/]+))?)?$/;

/**
 * 플래너 주소를 화면 상태로 바꾼다.
 *
 * 목표 id와 계획 id는 사용자가 만든 값이 아니라 서버가 준 값이지만, 주소창은
 * 누구나 손댈 수 있다. 퍼센트 인코딩이 깨진 주소는 예외를 던지므로 `null`로
 * 돌려보내 대시보드가 흡수하게 한다.
 */
function plannerFromPath(path: string): PlannerRoute | null {
  const match = path.match(PLANNER_PATH_PATTERN);
  if (match === null) return null;

  const source: PlannerRouteSource = match[1] === undefined ? "api" : "demo";
  const rawGoalId = match[2];
  if (rawGoalId === undefined) return plannerRoute(source, { kind: "goalSelect" });

  try {
    const goalId = decodeURIComponent(rawGoalId);
    const rawPlanId = match[4];
    if (rawPlanId !== undefined) {
      return plannerDetailRoute(source, goalId, decodeURIComponent(rawPlanId));
    }
    // 정규식이 조각을 두 개로 좁혀 두었으므로 나머지는 목표 메인 화면이다.
    const stage: PlannerGoalStage =
      match[3] === "plan-setup"
        ? "planSetup"
        : match[3] === "history"
          ? "history"
          : match[3] === "edit"
            ? "edit"
            : "main";
    return plannerGoalRoute(source, goalId, stage);
  } catch {
    return null;
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

  const planner = plannerFromPath(path);
  if (planner !== null) {
    // 서버 연결 플래너는 회원 전용이다. 데모·비로그인 세션은 목표 선택으로 되돌린다.
    return planner.source === "api" && !isMemberSession
      ? plannerRoute("api", { kind: "goalSelect" })
      : planner;
  }

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
