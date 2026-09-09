/**
 * 관리자 콘솔 경로 매핑.
 *
 * 사용자 앱과 셸을 공유하지 않는 임시 운영 도구이므로, 기존 탭 내비게이션이
 * 아니라 `/admin` 아래의 pathname만으로 화면을 고른다.
 */

export const ADMIN_BASE_PATH = "/admin";

export type AdminRoute =
  | { readonly kind: "dashboard" }
  | { readonly kind: "users" }
  | { readonly kind: "userDetail"; readonly userId: string }
  | { readonly kind: "currencies" }
  | { readonly kind: "fxRates" }
  | { readonly kind: "fxGaps" }
  | { readonly kind: "aiExplain" }
  | { readonly kind: "aiExtract" }
  | { readonly kind: "aiCallLogs" };

/** 대시보드는 관리자 콘솔의 첫 화면이라 `/admin` 자체를 쓴다. */
export const ADMIN_DASHBOARD_PATH = ADMIN_BASE_PATH;
export const ADMIN_USERS_PATH = `${ADMIN_BASE_PATH}/users`;
export const ADMIN_CURRENCIES_PATH = `${ADMIN_BASE_PATH}/currencies`;
export const ADMIN_FX_RATES_PATH = `${ADMIN_BASE_PATH}/fx-rates`;
export const ADMIN_FX_GAPS_PATH = `${ADMIN_BASE_PATH}/fx-rates/gaps`;
export const ADMIN_AI_EXPLAIN_PATH = `${ADMIN_BASE_PATH}/ai/explain`;
export const ADMIN_AI_EXTRACT_PATH = `${ADMIN_BASE_PATH}/ai/extract`;
export const ADMIN_AI_CALLS_PATH = `${ADMIN_BASE_PATH}/ai/calls`;

export interface AdminNavItem {
  readonly path: string;
  readonly label: string;
  /** 현재 경로가 이 메뉴에 속하는지 판정할 때 쓰는 라우트 종류. */
  readonly kinds: readonly AdminRoute["kind"][];
}

/**
 * 메뉴 묶음. `label`이 없으면 묶음 이름 없이 항목만 세운다.
 *
 * 화면이 늘면서 한 줄에 늘어놓기 어려워져 2단으로 바꿨다(#93). 앞으로
 * 마스터·콘텐츠 화면이 여기에 묶음째 들어온다(#86·#87).
 */
export interface AdminNavGroup {
  readonly label?: string;
  readonly items: readonly AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  {
    items: [
      { path: ADMIN_DASHBOARD_PATH, label: "대시보드", kinds: ["dashboard"] },
      {
        path: ADMIN_USERS_PATH,
        label: "사용자",
        kinds: ["users", "userDetail"],
      },
    ],
  },
  {
    label: "마스터",
    items: [
      { path: ADMIN_CURRENCIES_PATH, label: "통화", kinds: ["currencies"] },
    ],
  },
  {
    label: "환율",
    items: [
      { path: ADMIN_FX_RATES_PATH, label: "시계열", kinds: ["fxRates"] },
      { path: ADMIN_FX_GAPS_PATH, label: "결측", kinds: ["fxGaps"] },
    ],
  },
  {
    label: "AI",
    items: [
      { path: ADMIN_AI_EXPLAIN_PATH, label: "설명", kinds: ["aiExplain"] },
      { path: ADMIN_AI_EXTRACT_PATH, label: "추출", kinds: ["aiExtract"] },
      { path: ADMIN_AI_CALLS_PATH, label: "로그", kinds: ["aiCallLogs"] },
    ],
  },
];

/** 묶음을 편 목록. 메뉴가 전부 실제 라우트로 이어지는지 볼 때 쓴다. */
export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] =
  ADMIN_NAV_GROUPS.flatMap((group) => group.items);

/** 끝 슬래시와 중복 슬래시를 지운 경로. `/admin/` 과 `/admin` 을 같게 본다. */
function normalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : collapsed;
}

export function isAdminPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return (
    normalized === ADMIN_BASE_PATH ||
    normalized.startsWith(`${ADMIN_BASE_PATH}/`)
  );
}

export function adminUserDetailPath(userId: string): string {
  return `${ADMIN_USERS_PATH}/${encodeURIComponent(userId)}`;
}

/**
 * `/admin` 아래 경로를 화면으로 바꾼다.
 * 모르는 경로는 대시보드로 떨어뜨린다(운영 도구라 404 화면을 두지 않는다).
 */
export function resolveAdminRoute(pathname: string): AdminRoute {
  const segments = normalizePathname(pathname)
    .split("/")
    .filter((segment) => segment !== "");
  // segments[0] === "admin"
  const [, section, detail] = segments;

  if (section === "currencies") return { kind: "currencies" };
  if (section === "fx-rates") {
    return detail === "gaps" ? { kind: "fxGaps" } : { kind: "fxRates" };
  }
  if (section === "ai") {
    if (detail === "extract") return { kind: "aiExtract" };
    if (detail === "calls") return { kind: "aiCallLogs" };
    return { kind: "aiExplain" };
  }
  if (section === "users") {
    return detail === undefined
      ? { kind: "users" }
      : { kind: "userDetail", userId: decodeURIComponent(detail) };
  }
  return { kind: "dashboard" };
}
