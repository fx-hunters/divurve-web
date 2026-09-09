/**
 * 카드가 요청 상태를 읽는 공통 도구.
 *
 * 대시보드는 카드마다 따로 부른다 — 하나가 실패해도 나머지는 그대로 선다.
 * 그래서 카드마다 같은 모양으로 상태를 꺼내게 된다.
 */
import type { AdminAuthFailure, AdminErrorInfo } from "../../admin-errors";
import type { AdminRequestState } from "../../use-admin-request";

/** 카드가 공통으로 받는 props. 401·403을 위로 알리는 통로다. */
export interface AdminCardProps {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
}

/** 집계만 필요할 때 쓰는 페이지. 한 건만 받아 `totalElements`를 읽는다. */
export const COUNT_ONLY_PAGE = { page: 0, size: 1 } as const;

export function errorOf<T>(
  state: AdminRequestState<T>,
): AdminErrorInfo | undefined {
  return state.status === "error" ? state.error : undefined;
}

/** `idle`도 로딩으로 본다 — 카드는 들어오자마자 스스로 부른다. */
export function isLoadingOf<T>(state: AdminRequestState<T>): boolean {
  return state.status === "loading" || state.status === "idle";
}

/** 성공했을 때만 값을 꺼낸다. 그 밖에는 null. */
export function dataOf<T>(state: AdminRequestState<T>): T | null {
  return state.status === "success" ? state.result.data : null;
}
