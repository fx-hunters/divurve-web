/**
 * AI 호출 카드 (이슈 #84).
 *
 * 대시보드 화면이 커져 카드마다 파일로 갈랐다(#99~#102). 카드는 자기 데이터를
 * 스스로 부른다 — 하나가 실패해도 나머지는 그대로 선다.
 */
import { useCallback, useEffect } from "react";
import { fetchAdminAiCalls, type AdminAiCallPage } from "../../../../api/admin";
import { formatAdminValue } from "../../admin-value";
import { useAdminRequest } from "../../use-admin-request";
import {
  formatFailureRate,
  isAllFallback,
} from "../admin-dashboard-presenter";
import { AdminMetricCard } from "../admin-metric-card";
import {
  COUNT_ONLY_PAGE,
  errorOf,
  isLoadingOf,
  type AdminCardProps,
} from "./card-state";

/**
 * AI 호출 카드. 총 건수·실패·템플릿 대체를 각각 서버에서 센다.
 *
 * `fallback`을 함께 세는 이유 — 실 API 가 꺼져 있으면 모든 서술이 템플릿으로
 * 나가고 `error`는 0이다. 실패 건수만 보면 "정상"으로 읽히지만 LLM 은 한 번도
 * 불리지 않았다. 둘을 나란히 두어야 그 사실이 드러난다.
 */
export function AiCallCard({ onAuthFailure }: AdminCardProps) {
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
  const fallback = useAdminRequest<[], AdminAiCallPage>(
    useCallback(
      () => fetchAdminAiCalls({ ...COUNT_ONLY_PAGE, outcome: "fallback" }),
      [],
    ),
    onAuthFailure,
  );

  const { send: sendTotal } = total;
  const { send: sendFailed } = failed;
  const { send: sendFallback } = fallback;
  useEffect(() => {
    void sendTotal();
    void sendFailed();
    void sendFallback();
  }, [sendTotal, sendFailed, sendFallback]);

  const totalCount =
    total.state.status === "success"
      ? total.state.result.data.totalElements
      : null;
  const failedCount =
    failed.state.status === "success"
      ? failed.state.result.data.totalElements
      : null;
  const fallbackCount =
    fallback.state.status === "success"
      ? fallback.state.result.data.totalElements
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
        <div className="admin-kv__pair">
          <dt>템플릿 대체</dt>
          <dd>{formatAdminValue(fallbackCount)}건</dd>
        </div>
      </dl>
      {isAllFallback(fallbackCount, totalCount) && (
        <p className="admin-empty">
          모든 호출이 템플릿으로 나갔습니다. 실 API 가 꺼져 있으면 정상입니다.
        </p>
      )}
    </AdminMetricCard>
  );
}
