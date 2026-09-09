/**
 * 운영 현황 대시보드 (이슈 #84).
 *
 * 카드마다 따로 부른다 — 하나가 실패해도 나머지는 그대로 선다. 한 번에 묶어
 * 부르면 AI 집계가 죽었을 때 환율 상태까지 못 보게 된다.
 *
 * 가입자 지표와 추이 차트는 백엔드 신규 API 가 필요해 #94 로 갈랐다.
 */
import { useCallback, useEffect } from "react";
import {
  fetchAdminAiCalls,
  fetchAdminRefreshStatus,
  type AdminAiCallPage,
  type AdminRefreshStatus,
} from "../../../api/admin";
import {
  fetchAdminFxGaps,
  type AdminFxCoverage,
} from "../../../api/admin-fx-gaps";
import { formatAdminDateTime } from "../admin-datetime";
import type { AdminAuthFailure, AdminErrorInfo } from "../admin-errors";
import { formatAdminValue } from "../admin-value";
import { useAdminRequest, type AdminRequestState } from "../use-admin-request";
import {
  formatFailureRate,
  toGapDigest,
  toGapTone,
  toRefreshDigest,
} from "./admin-dashboard-presenter";
import { AdminMetricCard } from "./admin-metric-card";

interface AdminDashboardScreenProps {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
}

/** 집계만 필요하므로 한 건만 받아 `totalElements` 를 읽는다. */
const COUNT_ONLY_PAGE = { page: 0, size: 1 } as const;

function errorOf<T>(state: AdminRequestState<T>): AdminErrorInfo | undefined {
  return state.status === "error" ? state.error : undefined;
}

function isLoadingOf<T>(state: AdminRequestState<T>): boolean {
  return state.status === "loading" || state.status === "idle";
}

/** AI 호출 카드. 총 건수와 실패 건수를 각각 서버에서 센다. */
function AiCallCard({
  onAuthFailure,
}: {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
}) {
  const total = useAdminRequest<[], AdminAiCallPage>(
    useCallback(() => fetchAdminAiCalls(COUNT_ONLY_PAGE), []),
    onAuthFailure,
  );
  const failed = useAdminRequest<[], AdminAiCallPage>(
    useCallback(
      () => fetchAdminAiCalls({ ...COUNT_ONLY_PAGE, outcome: "error" }),
      [],
    ),
    onAuthFailure,
  );

  const { send: sendTotal } = total;
  const { send: sendFailed } = failed;
  useEffect(() => {
    void sendTotal();
    void sendFailed();
  }, [sendTotal, sendFailed]);

  const totalCount =
    total.state.status === "success"
      ? total.state.result.data.totalElements
      : null;
  const failedCount =
    failed.state.status === "success"
      ? failed.state.result.data.totalElements
      : null;

  return (
    <AdminMetricCard
      title="AI 호출"
      headline={`${formatAdminValue(totalCount)}건`}
      tone={failedCount !== null && failedCount > 0 ? "warn" : "neutral"}
      isLoading={isLoadingOf(total.state)}
      error={errorOf(total.state)}
    >
      <dl className="admin-kv admin-kv--inline">
        <div className="admin-kv__pair">
          <dt>실패</dt>
          <dd>{formatAdminValue(failedCount)}건</dd>
        </div>
        <div className="admin-kv__pair">
          <dt>실패 비율</dt>
          <dd>{formatFailureRate(failedCount, totalCount)}</dd>
        </div>
      </dl>
    </AdminMetricCard>
  );
}

/** 환율·거시 수집이 언제 돌았는지. */
function RefreshCard({
  onAuthFailure,
}: {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
}) {
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

/** 환율 결측. 자세한 구간은 결측 화면(#85)에서 본다. */
function GapCard({
  onAuthFailure,
}: {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
}) {
  const coverage = useAdminRequest<[], AdminFxCoverage>(
    useCallback(() => fetchAdminFxGaps(), []),
    onAuthFailure,
  );
  const { send } = coverage;
  useEffect(() => {
    void send();
  }, [send]);

  const digest =
    coverage.state.status === "success"
      ? toGapDigest(coverage.state.result.data)
      : null;
  const tone = digest === null ? "neutral" : toGapTone(digest);

  return (
    <AdminMetricCard
      title="환율 결측"
      headline={
        digest === null ? "-" : `결측 ${digest.missingBusinessDays}영업일`
      }
      tone={tone === "warn" ? "warn" : tone === "ok" ? "ok" : "neutral"}
      isLoading={isLoadingOf(coverage.state)}
      error={errorOf(coverage.state)}
    >
      {digest !== null && (
        <dl className="admin-kv admin-kv--inline">
          <div className="admin-kv__pair">
            <dt>통화쌍</dt>
            <dd>
              {digest.incompletePairs.length} / {digest.totalPairs} 미완전
            </dd>
          </div>
        </dl>
      )}
      {digest !== null && digest.incompletePairs.length > 0 && (
        <p className="admin-empty">
          {digest.incompletePairs
            .map((pair) => formatAdminValue(pair.pairCode))
            .join(", ")}
        </p>
      )}
    </AdminMetricCard>
  );
}

export function AdminDashboardScreen({
  onAuthFailure,
}: AdminDashboardScreenProps) {
  return (
    <section className="admin-section">
      <h1 className="admin-section__title">운영 현황</h1>
      <div className="admin-metric-grid">
        <AiCallCard onAuthFailure={onAuthFailure} />
        <RefreshCard onAuthFailure={onAuthFailure} />
        <GapCard onAuthFailure={onAuthFailure} />
      </div>
    </section>
  );
}
