/**
 * 수집 상태 카드 (이슈 #84).
 *
 * `GET /admin/fx-rates/status` 는 백엔드에 아직 없다(백엔드 이슈 #128). 404 를
 * 붉은 에러가 아니라 "준비 중" 으로 떨어뜨리는 처리는 `AdminMetricCard` 가 한다.
 */
import { useEffect } from "react";
import {
  fetchAdminRefreshStatus,
  type AdminRefreshStatus,
} from "../../../../api/admin";
import { formatAdminDateTime } from "../../admin-datetime";
import { formatAdminValue } from "../../admin-value";
import { useAdminRequest } from "../../use-admin-request";
import { toRefreshDigest } from "../admin-dashboard-presenter";
import { AdminMetricCard } from "../admin-metric-card";
import { errorOf, isLoadingOf, type AdminCardProps } from "./card-state";

/** 환율·거시 수집이 언제 돌았는지. */
export function RefreshCard({ onAuthFailure }: AdminCardProps) {
  const status = useAdminRequest<[], AdminRefreshStatus>(
    fetchAdminRefreshStatus,
    onAuthFailure,
  );
  const { send } = status;
  useEffect(() => {
    void send();
  }, [send]);

  const digest =
    status.state.status === "success"
      ? toRefreshDigest(status.state.result.data)
      : null;

  return (
    <AdminMetricCard
      title="수집 상태"
      headline={
        digest === null
          ? "-"
          : formatAdminDateTime(digest.fxLastFetchedAt)
      }
      tone={
        digest !== null && digest.pairsWithoutFetch.length > 0 ? "warn" : "ok"
      }
      isLoading={isLoadingOf(status.state)}
      error={errorOf(status.state)}
    >
      {digest !== null && (
        <dl className="admin-kv admin-kv--inline">
          <div className="admin-kv__pair">
            <dt>최신 고시일</dt>
            <dd>{formatAdminValue(digest.fxLastQuoteDate)}</dd>
          </div>
          <div className="admin-kv__pair">
            <dt>통화쌍</dt>
            <dd>{digest.pairCount}개</dd>
          </div>
          <div className="admin-kv__pair">
            <dt>거시지표</dt>
            <dd>{formatAdminDateTime(digest.macroLastRefreshedAt)}</dd>
          </div>
        </dl>
      )}
      {digest !== null && digest.pairsWithoutFetch.length > 0 && (
        <p className="admin-panel admin-panel--warn">
          한 번도 받지 못한 통화쌍: {digest.pairsWithoutFetch.join(", ")}
        </p>
      )}
    </AdminMetricCard>
  );
}
