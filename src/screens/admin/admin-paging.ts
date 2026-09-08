/**
 * 관리자 콘솔 목록의 페이지 이동 판정.
 *
 * 화면에 어떤 수치를 만들어 내지 않는다 — 다음 페이지 버튼을 열어 둘지만
 * 정한다. 페이징 형태가 같은 목록(사용자·AI 호출 로그)이 이 함수를 공유한다.
 */

/** 판정에 쓰는 부분만 받는다. 목록 행의 타입은 상관하지 않는다. */
export interface AdminPageShape {
  readonly items: readonly unknown[];
  readonly totalPages: number | null;
}

/**
 * `totalPages`를 서버가 주면 그 값만 믿는다. 주지 않을 때만, 이번 페이지가
 * 가득 찼는지로 버튼을 열어 둔다.
 */
export function hasAdminNextPage(
  page: AdminPageShape,
  currentPage: number,
  size: number,
): boolean {
  if (page.totalPages !== null) return currentPage + 1 < page.totalPages;
  return page.items.length >= size;
}
