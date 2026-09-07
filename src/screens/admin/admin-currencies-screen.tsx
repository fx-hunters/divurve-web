/**
 * 2-3. 통화 마스터.
 *
 * `is_supported=false`인 통화는 회색으로 두고 미지원 사유(`support_note`)를
 * 같이 보여준다. `is_stored=false`인 쌍은 저장하지 않고 유도하는 쌍이다.
 */
import { useCallback, useEffect } from "react";
import {
  fetchAdminCurrencies,
  type AdminCurrency,
  type AdminCurrencyPair,
} from "../../api/admin";
import type { AdminAuthFailure } from "./admin-errors";
import {
  AdminErrorPanel,
  AdminLoadingPanel,
  AdminMetaLine,
  AdminSection,
} from "./admin-panels";
import { AdminTable, type AdminColumn } from "./admin-table";
import { formatAdminValue } from "./admin-value";
import { useAdminRequest } from "./use-admin-request";

const CURRENCY_COLUMNS: readonly AdminColumn<AdminCurrency>[] = [
  { key: "currencyCode" },
  { key: "nameKo" },
  { key: "symbol" },
  { key: "minorUnits" },
  { key: "quoteUnit" },
  { key: "usdSide" },
  { key: "isHomeCurrency" },
  { key: "isSupported" },
  { key: "supportNote" },
  { key: "colorToken" },
  { key: "sortOrder" },
];

const PAIR_COLUMNS: readonly AdminColumn<AdminCurrencyPair>[] = [
  { key: "pairCode" },
  { key: "baseCurrencyCode" },
  { key: "quoteCurrencyCode" },
  {
    key: "isStored",
    render: (pair) =>
      pair.isStored === false ? (
        <span title="저장하지 않고 유도하는 쌍">false (유도)</span>
      ) : (
        formatAdminValue(pair.isStored)
      ),
  },
  { key: "deriveViaPairCode" },
];

interface AdminCurrenciesScreenProps {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
}

export function AdminCurrenciesScreen({
  onAuthFailure,
}: AdminCurrenciesScreenProps) {
  const { state, send } = useAdminRequest(fetchAdminCurrencies, onAuthFailure);

  const load = useCallback(() => {
    void send();
  }, [send]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminSection
      title="통화 마스터"
      description="GET /api/v1/admin/currencies 응답 그대로입니다."
      action={
        <button type="button" className="admin-button" onClick={load}>
          다시 불러오기
        </button>
      }
    >
      {state.status === "loading" && (
        <AdminLoadingPanel label="통화 마스터를 불러오는 중입니다." />
      )}
      {state.status === "error" && <AdminErrorPanel error={state.error} />}
      {state.status === "success" && (
        <>
          <AdminMetaLine meta={state.result.meta} />

          <h3 className="admin-subtitle">
            currencies ({state.result.data.currencies.length}건)
          </h3>
          <AdminTable
            columns={CURRENCY_COLUMNS}
            rows={state.result.data.currencies}
            getRowKey={(currency, index) =>
              `${formatAdminValue(currency.currencyCode)}-${index}`
            }
            getRowTone={(currency) =>
              currency.isSupported === false ? "muted" : "default"
            }
            emptyLabel="없음"
          />

          <h3 className="admin-subtitle">
            currency_pairs ({state.result.data.currencyPairs.length}건)
          </h3>
          <AdminTable
            columns={PAIR_COLUMNS}
            rows={state.result.data.currencyPairs}
            getRowKey={(pair, index) =>
              `${formatAdminValue(pair.pairCode)}-${index}`
            }
            getRowTone={(pair) => (pair.isStored === false ? "muted" : "default")}
            emptyLabel="없음"
          />
        </>
      )}
    </AdminSection>
  );
}
