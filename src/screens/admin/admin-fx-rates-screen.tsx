/**
 * 2-4. 환율 조회 + 수동 갱신.
 *
 * 통화쌍 선택지는 2-3의 `currency_pairs` 응답으로 만든다(하드코딩 금지).
 * `is_stored=false`인 유도 쌍은 조회하면 400이 나므로 선택지에서 잠근다.
 */
import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_RATE_TYPES,
  ADMIN_STORED_RATE_TYPE,
  fetchAdminCurrencies,
  fetchAdminFxRates,
  type AdminCurrencyPair,
  type AdminFxRatePoint,
} from "../../api/admin";
import { toDefaultFxRateRange } from "./admin-datetime";
import type { AdminAuthFailure } from "./admin-errors";
import { AdminFxRateChart } from "./admin-fx-rate-chart";
import {
  AdminErrorPanel,
  AdminIdlePanel,
  AdminLoadingPanel,
  AdminMetaLine,
  AdminSection,
} from "./admin-panels";
import { AdminRefreshPanel } from "./admin-refresh-panel";
import { AdminTable, type AdminColumn } from "./admin-table";
import { formatAdminValue } from "./admin-value";
import { useAdminRequest } from "./use-admin-request";

const POINT_COLUMNS: readonly AdminColumn<AdminFxRatePoint>[] = [
  { key: "quoteDate" },
  { key: "rate" },
  { key: "dataSource" },
  { key: "fetchedAt" },
];

/** 선택지 한 줄. 유도 쌍은 잠그고 사유를 라벨에 남긴다. */
export interface AdminPairOption {
  readonly pairCode: string;
  readonly isDisabled: boolean;
  readonly label: string;
}

export function toPairOptions(
  pairs: readonly AdminCurrencyPair[],
): readonly AdminPairOption[] {
  return pairs
    .filter((pair): pair is AdminCurrencyPair & { pairCode: string } =>
      pair.pairCode !== null,
    )
    .map((pair) => {
      const isDerived = pair.isStored === false;
      return {
        pairCode: pair.pairCode,
        isDisabled: isDerived,
        label: isDerived
          ? `${pair.pairCode} (유도 쌍 — 조회 불가)`
          : pair.pairCode,
      };
    });
}

interface AdminFxRatesScreenProps {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
}

export function AdminFxRatesScreen({ onAuthFailure }: AdminFxRatesScreenProps) {
  const { state: currenciesState, send: sendCurrencies } = useAdminRequest(
    fetchAdminCurrencies,
    onAuthFailure,
  );
  const fxRates = useAdminRequest(fetchAdminFxRates, onAuthFailure);
  const [pairCode, setPairCode] = useState("");
  // 매번 손으로 채우지 않도록 최근 1개월을 미리 넣어 둔다. 생략 시 서버 기본값은
  // 1년이라 화면에서 훑기에는 넓다.
  const [defaultRange] = useState(() => toDefaultFxRateRange(new Date()));
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [rateType, setRateType] = useState(ADMIN_STORED_RATE_TYPE);

  // 통화쌍 선택지를 만들기 위한 조회. 그 밖의 호출은 모두 버튼에서 시작한다.
  const loadCurrencies = useCallback(() => {
    void sendCurrencies();
  }, [sendCurrencies]);

  useEffect(() => {
    loadCurrencies();
  }, [loadCurrencies]);

  const pairOptions =
    currenciesState.status === "success"
      ? toPairOptions(currenciesState.result.data.currencyPairs)
      : [];

  const handleSubmit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    void fxRates.send({ pairCode, from, to, rateType });
  };

  return (
    <>
      <AdminSection
        title="환율 조회"
        description="GET /api/v1/admin/fx-rates — 서버가 준 관측만 잇습니다. 관측은 영업일에만 있으므로 빠진 날짜를 채우지 않습니다. 기간은 최근 1개월로 채워 두었습니다."
      >
        {currenciesState.status === "error" && (
          <AdminErrorPanel error={currenciesState.error} />
        )}

        <form className="admin-toolbar" onSubmit={handleSubmit}>
          <label className="admin-field">
            <span>pair_code</span>
            <select
              value={pairCode}
              onChange={(event) => setPairCode(event.target.value)}
            >
              <option value="">선택</option>
              {pairOptions.map((option) => (
                <option
                  key={option.pairCode}
                  value={option.pairCode}
                  disabled={option.isDisabled}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>from</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>to</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>rate_type</span>
            <select
              value={rateType}
              onChange={(event) => setRateType(event.target.value)}
            >
              {ADMIN_RATE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="admin-button admin-button--primary"
            disabled={pairCode === ""}
          >
            조회
          </button>
        </form>

        {rateType !== ADMIN_STORED_RATE_TYPE && (
          <p className="admin-panel admin-panel--idle">
            현재 적재되는 rate_type은 {ADMIN_STORED_RATE_TYPE} 하나뿐입니다.
            나머지는 스키마에만 있어 0건이 정상입니다.
          </p>
        )}

        {fxRates.state.status === "idle" && (
          <AdminIdlePanel label="통화쌍과 기간을 고르고 조회를 누르세요." />
        )}
        {fxRates.state.status === "loading" && (
          <AdminLoadingPanel label="환율을 불러오는 중입니다." />
        )}
        {fxRates.state.status === "error" && (
          <AdminErrorPanel error={fxRates.state.error} />
        )}
        {fxRates.state.status === "success" && (
          <>
            <AdminMetaLine meta={fxRates.state.result.meta} />
            <dl className="admin-kv admin-kv--inline">
              <div className="admin-kv__pair">
                <dt>pairCode</dt>
                <dd>{formatAdminValue(fxRates.state.result.data.pairCode)}</dd>
              </div>
              <div className="admin-kv__pair">
                <dt>rateType</dt>
                <dd>{formatAdminValue(fxRates.state.result.data.rateType)}</dd>
              </div>
              <div className="admin-kv__pair">
                <dt>from</dt>
                <dd>{formatAdminValue(fxRates.state.result.data.from)}</dd>
              </div>
              <div className="admin-kv__pair">
                <dt>to</dt>
                <dd>{formatAdminValue(fxRates.state.result.data.to)}</dd>
              </div>
              <div className="admin-kv__pair">
                <dt>count</dt>
                <dd>{formatAdminValue(fxRates.state.result.data.count)}</dd>
              </div>
            </dl>

            <AdminFxRateChart
              points={fxRates.state.result.data.points}
              pairCode={pairCode}
            />
            <h3 className="admin-subtitle">points</h3>
            <AdminTable
              columns={POINT_COLUMNS}
              rows={fxRates.state.result.data.points}
              getRowKey={(point, index) => `${point.quoteDate}-${index}`}
              emptyLabel="없음"
            />
          </>
        )}
      </AdminSection>

      <AdminRefreshPanel onAuthFailure={onAuthFailure} />
    </>
  );
}
