/**
 * 2-4(a). ECOS 환율 수동 갱신.
 *
 * 버튼을 누른 그 순간에만 호출하고, 응답을 그대로 결과 패널에 남긴다.
 * 소요시간·반영 건수는 서버가 준 것만 보여주고 여기서 재지 않는다.
 *
 * 실패 신호는 조용히 넘기지 않는다 — `has_failure`·`failure_reason`은 물론
 * `total_upserted=0`도 붉게 세운다.
 */
import { useState } from "react";
import { refreshAdminFxRates, type AdminFxRefreshPair } from "../../api/admin";
import { formatAdminDateTime } from "./admin-datetime";
import { AdminLastRefreshLine } from "./admin-last-refresh-line";
import {
  AdminErrorPanel,
  AdminLoadingPanel,
  AdminRawPanel,
  AdminSection,
} from "./admin-panels";
import type { AdminRefreshCardProps } from "./admin-refresh-card-props";
import { AdminTable, type AdminColumn } from "./admin-table";
import { formatAdminValue } from "./admin-value";
import { useAdminRequest } from "./use-admin-request";

/** ECOS 정정 반영을 위해 서버가 거슬러 올라가는 기본 달력일 수. */
export const DEFAULT_LOOKBACK_DAYS = 14;

const PAIR_COLUMNS: readonly AdminColumn<AdminFxRefreshPair>[] = [
  { key: "pairCode" },
  { key: "upserted" },
  { key: "firstDate" },
  { key: "lastDate" },
  {
    key: "failureReason",
    render: (pair) =>
      pair.failureReason === null ? (
        formatAdminValue(null)
      ) : (
        <strong className="admin-reject-reason">{pair.failureReason}</strong>
      ),
  },
];

export function AdminFxRefreshCard({
  onAuthFailure,
  statusState,
  onRefreshed,
}: AdminRefreshCardProps) {
  const [lookbackDays, setLookbackDays] = useState(String(DEFAULT_LOOKBACK_DAYS));
  const fxRefresh = useAdminRequest(refreshAdminFxRates, onAuthFailure);

  // 갱신이 끝나면 마지막 갱신 시각을 다시 읽는다. 부분 실패여도 반영된 행이
  // 있을 수 있으므로 성공·실패를 가리지 않는다.
  const handleRefresh = async () => {
    await fxRefresh.send(Number(lookbackDays) || DEFAULT_LOOKBACK_DAYS);
    onRefreshed();
  };

  return (
    <AdminSection
      title="ECOS 환율 수동 갱신"
      description="POST /api/v1/admin/fx-rates/refresh — 캐시를 비우고 ECOS를 다시 조회해 fx_rates에 반영합니다. 대상 통화쌍은 서버가 정합니다."
    >
      <AdminLastRefreshLine
        state={statusState}
        selectValue={(status) => status.fx.lastFetchedAt}
        unavailableLabel="적재된 환율이 없습니다."
      />

      <div className="admin-toolbar">
        <label className="admin-field">
          <span>lookback_days</span>
          <input
            type="number"
            min={1}
            value={lookbackDays}
            onChange={(event) => setLookbackDays(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="admin-button admin-button--primary"
          disabled={fxRefresh.state.status === "loading"}
          onClick={() => void handleRefresh()}
        >
          환율 갱신
        </button>
      </div>

      {fxRefresh.state.status === "loading" && (
        <AdminLoadingPanel label="환율을 갱신하는 중입니다." />
      )}
      {fxRefresh.state.status === "error" && (
        <AdminErrorPanel error={fxRefresh.state.error} />
      )}
      {fxRefresh.state.status === "success" && (
        <div className="admin-panel admin-panel--result">
          {fxRefresh.state.result.data.hasFailure === true && (
            <p className="admin-panel admin-panel--danger" role="alert">
              has_failure=true — 실패한 통화쌍이 있습니다. 아래 failureReason을
              확인하세요.
            </p>
          )}
          {fxRefresh.state.result.data.totalUpserted === 0 && (
            <p className="admin-panel admin-panel--warn" role="alert">
              total_upserted=0 — 반영된 행이 없습니다. 연동이 살아 있는지
              확인하세요.
            </p>
          )}

          <dl className="admin-kv admin-kv--inline">
            <div className="admin-kv__pair">
              <dt>totalUpserted</dt>
              <dd>
                {formatAdminValue(fxRefresh.state.result.data.totalUpserted)}
              </dd>
            </div>
            <div className="admin-kv__pair">
              <dt>refreshedAt</dt>
              <dd>
                {formatAdminDateTime(fxRefresh.state.result.data.refreshedAt)}
              </dd>
            </div>
            <div className="admin-kv__pair">
              <dt>elapsedMs</dt>
              <dd>{formatAdminValue(fxRefresh.state.result.data.elapsedMs)}</dd>
            </div>
            <div className="admin-kv__pair">
              <dt>evictedCaches</dt>
              <dd>
                {fxRefresh.state.result.data.evictedCaches.length === 0
                  ? "-"
                  : fxRefresh.state.result.data.evictedCaches.join(", ")}
              </dd>
            </div>
          </dl>

          <AdminTable
            columns={PAIR_COLUMNS}
            rows={fxRefresh.state.result.data.pairs}
            getRowKey={(pair, index) => `${pair.pairCode}-${index}`}
            getRowTone={(pair) =>
              pair.failureReason === null ? "default" : "danger"
            }
            emptyLabel="갱신된 통화쌍이 없습니다."
          />
          <AdminRawPanel title="응답 원문" value={fxRefresh.state.result} />
        </div>
      )}
    </AdminSection>
  );
}
