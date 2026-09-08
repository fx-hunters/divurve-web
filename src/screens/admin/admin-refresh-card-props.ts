/**
 * 갱신 카드가 공통으로 받는 props.
 *
 * 마지막 갱신 시각은 두 카드가 한 응답을 나눠 보므로, 조회는 부모가 한 번만
 * 하고 결과와 재조회 트리거만 내려준다.
 */
import type { AdminRefreshStatus } from "../../api/admin";
import type { AdminAuthFailure } from "./admin-errors";
import type { AdminRequestState } from "./use-admin-request";

export interface AdminRefreshCardProps {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
  readonly statusState: AdminRequestState<AdminRefreshStatus>;
  /** 갱신을 마친 뒤 마지막 갱신 시각을 다시 읽도록 알린다. */
  readonly onRefreshed: () => void;
}
