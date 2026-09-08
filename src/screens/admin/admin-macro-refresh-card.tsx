/**
 * 2-4(b). FRED 거시지표 수동 갱신.
 *
 * 연동 점검용이다. 서버가 결과를 저장하지 않으므로 이 카드에는 서버 기준
 * "마지막 갱신"이 없다 — 그 사실을 감추지 않고 그대로 적는다.
 */
import { useState } from "react";
import { refreshAdminMacro, type AdminMacroSeries } from "../../api/admin";
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

const DEFAULT_SERIES_IDS = "DGS10";

const SERIES_COLUMNS: readonly AdminColumn<AdminMacroSeries>[] = [
  { key: "seriesId" },
  { key: "value" },
  { key: "asOf" },
  { key: "source" },
  { key: "fetchedAt", render: (series) => formatAdminDateTime(series.fetchedAt) },
  {
    key: "failureReason",
    render: (series) =>
      series.failureReason === null ? (
        formatAdminValue(null)
      ) : (
        <strong className="admin-reject-reason">{series.failureReason}</strong>
      ),
  },
];

/** 쉼표로 구분한 입력을 시리즈 id 목록으로 만든다. */
export function parseSeriesIds(input: string): readonly string[] {
  return input
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");
}

export function AdminMacroRefreshCard({
  onAuthFailure,
  statusState,
  onRefreshed,
}: AdminRefreshCardProps) {
  const [seriesIdsInput, setSeriesIdsInput] = useState(DEFAULT_SERIES_IDS);
  const macroRefresh = useAdminRequest(refreshAdminMacro, onAuthFailure);

  const seriesIds = parseSeriesIds(seriesIdsInput);

  const handleRefresh = async () => {
    await macroRefresh.send(seriesIds);
    onRefreshed();
  };

  return (
    <AdminSection
      title="FRED 거시지표 수동 갱신"
      description="POST /api/v1/admin/macro/refresh — 연동 점검용입니다. 결과를 저장하지 않습니다."
    >
      <AdminLastRefreshLine
        state={statusState}
        selectValue={(status) => status.macro.lastRefreshedAt}
        unavailableLabel="갱신 결과를 저장하지 않아 서버에 남는 기록이 없습니다."
      />

      <div className="admin-toolbar">
        <label className="admin-field">
          <span>series_ids (쉼표 구분)</span>
          <input
            type="text"
            value={seriesIdsInput}
            onChange={(event) => setSeriesIdsInput(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="admin-button admin-button--primary"
          disabled={
            seriesIds.length === 0 || macroRefresh.state.status === "loading"
          }
          onClick={() => void handleRefresh()}
        >
          거시지표 갱신
        </button>
      </div>

      {macroRefresh.state.status === "loading" && (
        <AdminLoadingPanel label="거시지표를 갱신하는 중입니다." />
      )}
      {macroRefresh.state.status === "error" && (
        <AdminErrorPanel error={macroRefresh.state.error} />
      )}
      {macroRefresh.state.status === "success" && (
        <div className="admin-panel admin-panel--result">
          <dl className="admin-kv admin-kv--inline">
            <div className="admin-kv__pair">
              <dt>refreshedAt</dt>
              <dd>
                {formatAdminDateTime(macroRefresh.state.result.data.refreshedAt)}
              </dd>
            </div>
            <div className="admin-kv__pair">
              <dt>elapsedMs</dt>
              <dd>
                {formatAdminValue(macroRefresh.state.result.data.elapsedMs)}
              </dd>
            </div>
            <div className="admin-kv__pair">
              <dt>evictedCaches</dt>
              <dd>
                {macroRefresh.state.result.data.evictedCaches.length === 0
                  ? "-"
                  : macroRefresh.state.result.data.evictedCaches.join(", ")}
              </dd>
            </div>
          </dl>

          <AdminTable
            columns={SERIES_COLUMNS}
            rows={macroRefresh.state.result.data.series}
            getRowKey={(series, index) => `${series.seriesId}-${index}`}
            getRowTone={(series) =>
              series.failureReason === null ? "default" : "danger"
            }
            emptyLabel="조회된 시리즈가 없습니다."
          />
          <AdminRawPanel title="응답 원문" value={macroRefresh.state.result} />
        </div>
      )}
    </AdminSection>
  );
}
