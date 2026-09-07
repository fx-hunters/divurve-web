import { DonutChart } from "../../components/common/donut-chart";
import { Badge } from "../../components/common/badge";
import { Icon } from "../../components/common/icon";
import type {
  StressRunResult,
  XRayDashboardData,
} from "../../types/xray";

/** 통화 색은 컨벤션 7.2에 따라 고정 배정하고, 그 밖의 통화는 중립색으로 둔다. */
const CURRENCY_COLORS: Readonly<Record<string, string>> = {
  USD: "var(--usd)",
  JPY: "var(--jpy)",
  EUR: "var(--eur)",
};

export function currencyColor(currencyCode: string): string {
  return CURRENCY_COLORS[currencyCode] ?? "var(--text-muted)";
}

export type StressRunState =
  | { readonly status: "idle" }
  | { readonly status: "running" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "done" };

interface XRayExposureViewProps {
  readonly data: XRayDashboardData;
  readonly selectedScenarioCode: string;
  readonly runState: { readonly status: string; readonly message?: string };
  readonly runResult: StressRunResult | null;
  readonly onSelectScenario: (code: string) => void;
}

const CARD_STYLE = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "1.5rem",
  boxShadow: "var(--shadow-sm)",
} as const;

const CARD_TITLE_STYLE = {
  fontSize: "0.8125rem",
  fontWeight: 700,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
} as const;

export function XRayExposureView({
  data,
  selectedScenarioCode,
  runState,
  runResult,
  onSelectScenario,
}: XRayExposureViewProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
        gap: "1.5rem",
      }}
    >
      {/* 좌측 컬럼: 외화 비중, 통화별 노출, 환율 민감도 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>
        {/* 외화 비중 카드 */}
        <div style={CARD_STYLE}>
          <h2 style={{ ...CARD_TITLE_STYLE, marginBottom: "1.25rem" }}>외화 비중</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <DonutChart percent={data.fxRatioPct} label={`${data.fxRatioPct}%`} />
            <div style={{ fontSize: "0.875rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.5rem" }}>
                <span style={{ color: "var(--text-muted)" }}>외화 자산</span>
                <span style={{ color: "var(--text)", fontWeight: 700 }}>
                  ₩ {data.fxKrw.toLocaleString()}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.5rem" }}>
                <span style={{ color: "var(--text-muted)" }}>원화 자산</span>
                <span style={{ color: "var(--text)", fontWeight: 700 }}>
                  ₩ {data.krwAmount.toLocaleString()}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <span style={{ color: "var(--text-muted)" }}>총 자산</span>
                <span style={{ color: "var(--text)", fontWeight: 700 }}>
                  ₩ {data.totalAssetKrw.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1rem" }}>
            기준 시각: {data.asOfLabel}
          </p>
        </div>

        {/* 통화별 노출 카드 */}
        <div style={CARD_STYLE}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 style={CARD_TITLE_STYLE}>통화별 노출</h2>
            <Badge variant={data.concentration.status === "over" ? "danger" : "default"}>
              {data.concentration.statusLabel}
            </Badge>
          </div>

          {/* 다중 통화 게이지 바 (기준선 마커는 서버가 줄 때만 표시) */}
          <div
            style={{
              height: "16px",
              width: "100%",
              backgroundColor: "var(--border)",
              borderRadius: "var(--radius-full)",
              display: "flex",
              position: "relative",
              overflow: "hidden",
              marginBottom: "1rem",
            }}
          >
            {data.concentration.thresholdPct !== undefined && (
              <div
                data-testid="concentration-threshold-marker"
                style={{
                  position: "absolute",
                  left: `${data.concentration.thresholdPct}%`,
                  top: 0,
                  bottom: 0,
                  width: "2px",
                  backgroundColor: "var(--danger)",
                  zIndex: 10,
                  boxShadow: "0 0 6px var(--danger)",
                }}
              />
            )}
            {data.exposure.map((item) => (
              <div
                key={item.currencyCode}
                style={{
                  width: `${item.sharePct}%`,
                  backgroundColor: currencyColor(item.currencyCode),
                  height: "100%",
                }}
              />
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}>
              {data.exposure.map((item) => (
                <span
                  key={item.currencyCode}
                  style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "2px",
                      backgroundColor: currencyColor(item.currencyCode),
                    }}
                  />
                  {item.currencyCode} {item.sharePct}%
                </span>
              ))}
            </div>
            {data.concentration.thresholdPct !== undefined && (
              <span style={{ color: "var(--danger)" }}>
                기준선 {data.concentration.thresholdPct}%
              </span>
            )}
          </div>
        </div>

        {/* 환율 민감도 카드 */}
        <div style={CARD_STYLE}>
          <h2 style={{ ...CARD_TITLE_STYLE, marginBottom: "0.75rem" }}>환율 민감도</h2>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.875rem",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>1% 상승 시</span>
            <span style={{ color: "var(--normal)", fontWeight: 700 }}>
              +₩ {data.fxSensitivity1pctKrw.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 우측 컬럼: 손익 분해 테이블, 종목 상세, 스트레스 시나리오 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>
        {/* 손익 분해 카드 */}
        <div style={{ ...CARD_STYLE, display: "flex", flexDirection: "column" }}>
          <h2 style={{ ...CARD_TITLE_STYLE, marginBottom: "1.25rem" }}>손익 분해</h2>

          <div style={{ overflowX: "auto", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <tr>
                  <th style={{ paddingBottom: "0.75rem", fontWeight: 600 }}>항목</th>
                  <th style={{ paddingBottom: "0.75rem", textAlign: "right", fontWeight: 600 }}>금액 (KRW)</th>
                  <th style={{ paddingBottom: "0.75rem", textAlign: "right", fontWeight: 600 }}>기여도</th>
                </tr>
              </thead>
              <tbody style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                <tr style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "0.875rem 0", color: "var(--text-muted)" }}>매입 원가</td>
                  <td style={{ padding: "0.875rem 0", textAlign: "right" }}>
                    {data.pnl.costBasisKrw.toLocaleString()}
                  </td>
                  <td style={{ padding: "0.875rem 0", textAlign: "right", color: "var(--text-muted)" }}>-</td>
                </tr>
                {data.pnl.rows.map((row) => {
                  const tone = row.krw > 0 ? "var(--normal)" : row.krw < 0 ? "var(--danger)" : "var(--text-muted)";
                  return (
                    <tr key={row.key} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "0.875rem 0" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: "6px", height: "16px", borderRadius: "3px", backgroundColor: tone }} />
                          <span>{row.label}</span>
                        </span>
                      </td>
                      <td style={{ padding: "0.875rem 0", textAlign: "right", color: tone }}>
                        {row.krw.toLocaleString()}
                      </td>
                      <td style={{ padding: "0.875rem 0", textAlign: "right", color: tone }}>
                        {row.contributionPct}%p
                      </td>
                    </tr>
                  );
                })}
                <tr
                  style={{
                    backgroundColor: "var(--primary-subtle)",
                    borderTop: "1px solid var(--border)",
                    fontSize: "1rem",
                    fontWeight: 700,
                  }}
                >
                  <td style={{ padding: "0.875rem 0.5rem" }}>현재 평가액</td>
                  <td style={{ padding: "0.875rem 0.5rem", textAlign: "right", color: "var(--primary)" }}>
                    {data.pnl.totalValuationKrw.toLocaleString()}
                  </td>
                  <td style={{ padding: "0.875rem 0.5rem", textAlign: "right", color: "var(--primary)" }}>
                    {data.pnl.totalReturnPct}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 종목별 상세 아코디언 */}
          <details
            style={{
              backgroundColor: "var(--bg)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              marginTop: "auto",
            }}
          >
            <summary
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--text)",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.875rem 1rem",
                outline: "none",
              }}
            >
              <span>종목별 상세 (접힘)</span>
              <Icon name="chevronDown" size={15} />
            </summary>
            <div
              style={{
                padding: "0 1rem 0.875rem 1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {data.pnl.holdings.length === 0 && (
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                  등록된 종목이 없습니다.
                </p>
              )}
              {data.pnl.holdings.map((holding) => (
                <div
                  key={holding.ticker}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    padding: "0.5rem 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ color: "var(--text)" }}>{holding.ticker}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>
                      ₩ {holding.krw.toLocaleString()}
                    </span>
                    <Badge variant={holding.returnPct >= 0 ? "default" : "danger"}>
                      {holding.returnPct >= 0 ? `+${holding.returnPct}%` : `${holding.returnPct}%`}
                    </Badge>
                  </span>
                </div>
              ))}
            </div>
          </details>
        </div>

        {/* 스트레스 시나리오 카드 */}
        <div style={CARD_STYLE}>
          <h2 style={{ ...CARD_TITLE_STYLE, marginBottom: "1rem" }}>스트레스 시나리오</h2>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {data.scenarios.map((scenario) => {
              const isSelected = scenario.code === selectedScenarioCode;
              return (
                <button
                  key={scenario.code}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectScenario(scenario.code)}
                  style={{
                    padding: "0.375rem 0.875rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    borderRadius: "var(--radius-md)",
                    backgroundColor: isSelected ? "var(--primary)" : "var(--bg)",
                    color: isSelected ? "var(--primary-content)" : "var(--text)",
                    border: isSelected ? "1px solid var(--primary)" : "1px solid var(--border)",
                    boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {scenario.label}
                </button>
              );
            })}
          </div>

          {runState.status === "idle" && (
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              시나리오를 고르면 서버가 계산한 충격 결과를 보여줍니다.
            </p>
          )}
          {runState.status === "running" && (
            <p role="status" style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              시나리오를 계산하는 중입니다.
            </p>
          )}
          {runState.status === "error" && (
            <p role="alert" style={{ fontSize: "0.8125rem", color: "var(--danger)" }}>
              {runState.message}
            </p>
          )}
          {runResult !== null && runState.status === "done" && (
            <div
              style={{
                padding: "1rem 1.25rem",
                backgroundColor: "var(--danger-bg)",
                border: "1px solid var(--danger-border)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text)" }}>
                  {runResult.shockLabel}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    marginTop: "0.25rem",
                  }}
                >
                  {runResult.conditionalNote}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "clamp(1.25rem, 4vw, 1.5rem)",
                    fontWeight: 800,
                    color: "var(--danger)",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.02em",
                  }}
                >
                  ₩ {runResult.totalEffectKrw.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                  충격 후 외화 자산 ₩ {runResult.afterFxAssetKrw.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
