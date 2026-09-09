/**
 * 환율 결측 카드 (이슈 #84). 자세한 구간은 결측 화면(#85)에서 본다.
 */
import { useCallback, useEffect } from "react";
import {
  fetchAdminFxGaps,
  type AdminFxCoverage,
} from "../../../../api/admin-fx-gaps";
import { formatAdminValue } from "../../admin-value";
import { useAdminRequest } from "../../use-admin-request";
import { toGapDigest, toGapTone } from "../admin-dashboard-presenter";
import { AdminMetricCard } from "../admin-metric-card";
import { errorOf, isLoadingOf, type AdminCardProps } from "./card-state";

/** 환율 결측. 자세한 구간은 결측 화면(#85)에서 본다. */
export function GapCard({ onAuthFailure }: AdminCardProps) {
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
