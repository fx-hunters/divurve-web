/**
 * 2-4. 수동 갱신.
 *
 * 버튼을 누른 그 순간에만 호출하고, 응답을 그대로 결과 패널에 남긴다.
 * 소요시간·반영 건수는 서버가 준 것만 보여주고 여기서 재지 않는다.
 *
 * 실패 신호는 조용히 넘기지 않는다 — `has_failure`·`failure_reason`은 물론
 * `total_upserted=0`도 붉게 세운다.
 */
import { useState } from "react";
import {
  refreshAdminFxRates,
  refreshAdminMacro,
  type AdminFxRefreshPair,
  type AdminMacroSeries,
} from "../../api/admin";
import type { AdminAuthFailure } from "./admin-errors";
import {
  AdminErrorPanel,
  AdminLoadingPanel,
  AdminRawPanel,
  AdminSection,
} from "./admin-panels";
import { AdminTable, type AdminColumn } from "./admin-table";
import { formatAdminValue } from "./admin-value";
import { useAdminRequest } from "./use-admin-request";

/** ECOS 정정 반영을 위해 서버가 거슬러 올라가는 기본 달력일 수. */
export const DEFAULT_LOOKBACK_DAYS = 14;

const DEFAULT_SERIES_IDS = "DGS10";

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

const SERIES_COLUMNS: readonly AdminColumn<AdminMacroSeries>[] = [
  { key: "seriesId" },
  { key: "value" },
  { key: "asOf" },
  { key: "source" },
  { key: "fetchedAt" },
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

interface AdminRefreshPanelProps {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
}

export function AdminRefreshPanel({ onAuthFailure }: AdminRefreshPanelProps) {
  const [lookbackDays, setLookbackDays] = useState(String(DEFAULT_LOOKBACK_DAYS));
  const [seriesIdsInput, setSeriesIdsInput] = useState(DEFAULT_SERIES_IDS);
  const fxRefresh = useAdminRequest(refreshAdminFxRates, onAuthFailure);
  const macroRefresh = useAdminRequest(refreshAdminMacro, onAuthFailure);

  const seriesIds = parseSeriesIds(seriesIdsInput);

  return (
    <>
      <AdminSection
        title="ECOS 환율 수동 갱신"
        description="POST /api/v1/admin/fx-rates/refresh — 캐시를 비우고 ECOS를 다시 조회해 fx_rates에 반영합니다. 대상 통화쌍은 서버가 정합니다."
      >
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
            onClick={() =>
              void fxRefresh.send(
                Number(lookbackDays) || DEFAULT_LOOKBACK_DAYS,
              )
            }
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
                has_failure=true — 실패한 통화쌍이 있습니다. 아래
                failureReason을 확인하세요.
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
                  {formatAdminValue(fxRefresh.state.result.data.refreshedAt)}
                </dd>
              </div>
              <div className="admin-kv__pair">
                <dt>elapsedMs</dt>
                <dd>
                  {formatAdminValue(fxRefresh.state.result.data.elapsedMs)}
                </dd>
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

      <AdminSection
        title="FRED 거시지표 수동 갱신"
        description="POST /api/v1/admin/macro/refresh — 연동 점검용입니다. 결과를 저장하지 않습니다."
      >
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
            onClick={() => void macroRefresh.send(seriesIds)}
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
                  {formatAdminValue(macroRefresh.state.result.data.refreshedAt)}
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
    </>
  );
}
