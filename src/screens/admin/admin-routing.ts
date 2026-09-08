/**
 * 관리자 콘솔 경로 매핑.
 *
 * 사용자 앱과 셸을 공유하지 않는 임시 운영 도구이므로, 기존 탭 내비게이션이
 * 아니라 `/admin` 아래의 pathname만으로 화면을 고른다.
 */

export const ADMIN_BASE_PATH = "/admin";

export type AdminRoute =
  | { readonly kind: "users" }
  | { readonly kind: "userDetail"; readonly userId: string }
  | { readonly kind: "currencies" }
  | { readonly kind: "fxRates" }
  | { readonly kind: "aiExplain" }
  | { readonly kind: "aiExtract" }
  | { readonly kind: "aiCallLogs" };

export const ADMIN_USERS_PATH = `${ADMIN_BASE_PATH}/users`;
export const ADMIN_CURRENCIES_PATH = `${ADMIN_BASE_PATH}/currencies`;
export const ADMIN_FX_RATES_PATH = `${ADMIN_BASE_PATH}/fx-rates`;
export const ADMIN_AI_EXPLAIN_PATH = `${ADMIN_BASE_PATH}/ai/explain`;
export const ADMIN_AI_EXTRACT_PATH = `${ADMIN_BASE_PATH}/ai/extract`;
export const ADMIN_AI_CALLS_PATH = `${ADMIN_BASE_PATH}/ai/calls`;

export interface AdminNavItem {
  readonly path: string;
  readonly label: string;
  /** 현재 경로가 이 메뉴에 속하는지 판정할 때 쓰는 라우트 종류. */
  readonly kinds: readonly AdminRoute["kind"][];
}

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { path: ADMIN_USERS_PATH, label: "사용자", kinds: ["users", "userDetail"] },
  { path: ADMIN_CURRENCIES_PATH, label: "통화 마스터", kinds: ["currencies"] },
  { path: ADMIN_FX_RATES_PATH, label: "환율·갱신", kinds: ["fxRates"] },
  { path: ADMIN_AI_EXPLAIN_PATH, label: "AI 설명", kinds: ["aiExplain"] },
  { path: ADMIN_AI_EXTRACT_PATH, label: "AI 추출", kinds: ["aiExtract"] },
  { path: ADMIN_AI_CALLS_PATH, label: "AI 로그", kinds: ["aiCallLogs"] },
];

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
 * 모르는 경로는 사용자 목록으로 떨어뜨린다(운영 도구라 404 화면을 두지 않는다).
 */
export function resolveAdminRoute(pathname: string): AdminRoute {
  const segments = normalizePathname(pathname)
    .split("/")
    .filter((segment) => segment !== "");
  // segments[0] === "admin"
  const [, section, detail] = segments;

  if (section === "currencies") return { kind: "currencies" };
  if (section === "fx-rates") return { kind: "fxRates" };
  if (section === "ai") {
    if (detail === "extract") return { kind: "aiExtract" };
    if (detail === "calls") return { kind: "aiCallLogs" };
    return { kind: "aiExplain" };
  }
  if (section === "users" && detail !== undefined) {
    return { kind: "userDetail", userId: decodeURIComponent(detail) };
  }
  return { kind: "users" };
}
