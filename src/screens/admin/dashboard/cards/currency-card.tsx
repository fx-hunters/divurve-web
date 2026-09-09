/**
 * 통화 마스터 카드 (이슈 #102).
 *
 * 지원 통화와 통화쌍 구성은 자주 바뀌지 않지만, **환율을 조달할 수 없는 통화가
 * 왜 그런지**는 운영 중 반복해서 확인하게 된다. 사유는 `supportNote` 에 이미
 * 적혀 있다(예: `ECOS 731Y001 미고시 — 환율 조달 불가`).
 */
import { useEffect } from "react";
import {
  fetchAdminCurrencies,
  type AdminCurrencyMaster,
} from "../../../../api/admin";
import { formatAdminValue } from "../../admin-value";
import { useAdminRequest } from "../../use-admin-request";
import { toCurrencyDigest } from "../admin-dashboard-presenter";
import { AdminMetricCard } from "../admin-metric-card";
import {
  dataOf,
  errorOf,
  isLoadingOf,
  type AdminCardProps,
} from "./card-state";

export function CurrencyCard({ onAuthFailure }: AdminCardProps) {
  const master = useAdminRequest<[], AdminCurrencyMaster>(
    fetchAdminCurrencies,
    onAuthFailure,
  );
  const { send } = master;
  useEffect(() => {
    void send();
  }, [send]);

  const data = dataOf(master.state);
  const digest = data === null ? null : toCurrencyDigest(data);

  return (
    <AdminMetricCard
      title="통화 마스터"
      headline={
        digest === null
          ? "-"
          : `지원 ${digest.totalCurrencies - digest.unsupported.length} / ${
              digest.totalCurrencies
            }`
      }
      tone={
        digest !== null && digest.unsupported.length > 0 ? "warn" : "neutral"
      }
      isLoading={isLoadingOf(master.state)}
      error={errorOf(master.state)}
    >
      {digest !== null && (
        <dl className="admin-kv admin-kv--inline">
          <div className="admin-kv__pair">
            <dt>저장 통화쌍</dt>
            <dd>{digest.storedPairs}개</dd>
          </div>
          <div className="admin-kv__pair">
            <dt>유도 쌍</dt>
            <dd>{digest.derivedPairs}개</dd>
          </div>
        </dl>
      )}
      {digest !== null && digest.derivedPairs > 0 && (
        <p className="admin-empty">
          유도 쌍은 저장하지 않아 시계열 조회가 되지 않습니다.
        </p>
      )}
      {digest !== null &&
        digest.unsupported.map((currency) => (
          <p className="admin-empty" key={currency.currencyCode ?? "unknown"}>
            {formatAdminValue(currency.currencyCode)} —{" "}
            {formatAdminValue(currency.supportNote)}
          </p>
        ))}
    </AdminMetricCard>
  );
}
