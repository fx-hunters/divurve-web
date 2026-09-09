import { DonutChart } from "../../components/common/donut-chart";
import { Badge } from "../../components/common/badge";
import { Icon } from "../../components/common/icon";
import type { ExplanationRequester } from "../../hooks/use-ai-explanation";
import { XRayAiExplanation, XRAY_EXPOSURE_SURFACE } from "./xray-ai-explanation";
import { XRaySummaryStrip, type XRaySummaryItem } from "./xray-summary-strip";
import {
  isConcentrationAboveThreshold,
  toExposureExplanationFacts,
} from "./xray-presenter";
import type {
  StressRunResult,
  XRayDashboardData,
} from "../../types/xray";
import "./xray-layout.css";

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
  /** AI 설명 요청 경로 주입 지점. 없으면 공용 훅의 기본 경로를 쓴다. */
  readonly explanationRequester?: ExplanationRequester;
}

const CARD_STYLE = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "1.5rem",
  boxShadow: "var(--shadow-sm)",
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
} as const;

const CARD_TITLE_STYLE = {
  fontSize: "0.8125rem",
  fontWeight: 700,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
} as const;

/** 카드 안 소제목. 한 카드가 모수가 다른 두 블록을 담을 때만 쓴다. */
const SECTION_TITLE_STYLE = {
  fontSize: "0.875rem",
  fontWeight: 700,
  color: "var(--text)",
} as const;

const SECTION_BASIS_STYLE = {
  fontSize: "0.75rem",
  fontWeight: 500,
  color: "var(--text-muted)",
} as const;

/**
 * 상단 요약 스트립에 올릴 금액들.
 *
 * 넷 다 KRW 라 한 줄에 모아 두면 서로 비교된다. 외화 비중은 총 자산 대비
 * 비율이므로 별도 칸을 만들지 않고 외화 자산 칸의 부연으로 붙인다.
 */
function toSummaryItems(data: XRayDashboardData): readonly XRaySummaryItem[] {
  return [
    {
      key: "total",
      label: "총 자산",
      value: `₩ ${data.totalAssetKrw.toLocaleString()}`,
    },
    {
      key: "fx",
      label: "외화 자산",
      value: `₩ ${data.fxKrw.toLocaleString()}`,
      hint: `총 자산의 ${data.fxRatioPct}%`,
    },
    {
      key: "krw",
      label: "원화 자산",
      value: `₩ ${data.krwAmount.toLocaleString()}`,
    },
    {
      key: "sensitivity",
      label: "환율 1% 상승 시",
      value: `+₩ ${data.fxSensitivity1pctKrw.toLocaleString()}`,
      hint: "외화 자산 평가액 변화",
    },
  ];
}

export function XRayExposureView({
  data,
  selectedScenarioCode,
  runState,
  runResult,
  onSelectScenario,
  explanationRequester,
}: XRayExposureViewProps) {
  return (
    <div className="xray-layout">
      <div className="xray-layout__full">
        <XRaySummaryStrip
          items={toSummaryItems(data)}
          caption={`기준 시각: ${data.asOfLabel}`}
        />
      </div>

      {/*
       * 통화 구성 — 도넛(총 자산 대비)과 게이지(외화 자산 대비)는 모수가 다르다.
       * 한 카드에 담되 소제목마다 모수를 밝혀 둔다.
       */}
      <div className="xray-layout__pair" style={{ ...CARD_STYLE, gap: "1.5rem" }}>
        <h2 style={CARD_TITLE_STYLE}>통화 구성</h2>

        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <h3 style={SECTION_TITLE_STYLE}>외화 비중</h3>
            <span style={SECTION_BASIS_STYLE}>총 자산 대비</span>
          </div>
          <div className="xray-composition__donut">
            <DonutChart
              percent={data.fxRatioPct}
              size={144}
              label={`외화 비중 ${data.fxRatioPct}%`}
            />
          </div>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.875rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <h3 style={SECTION_TITLE_STYLE}>통화별 노출</h3>
              <span style={SECTION_BASIS_STYLE}>외화 자산 대비</span>
            </div>
            <Badge
              variant={
                isConcentrationAboveThreshold(data.concentration.status)
                  ? "danger"
                  : "default"
              }
            >
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
      </div>

      {/* 손익 분해 카드 */}
      <div className="xray-layout__pair" style={CARD_STYLE}>
        <h2 style={{ ...CARD_TITLE_STYLE, marginBottom: "1.25rem" }}>손익 분해</h2>

        <div style={{ overflowX: "auto", fontSize: "0.875rem" }}>
          {/* minWidth 가 없으면 좁은 폭에서 셀이 min-content 로 붕괴해 라벨이 세로로 쌓인다. */}
          <table
            style={{
              width: "100%",
              minWidth: "17.5rem",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
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

      </div>

      {/*
       * 종목별 상세도 전폭에 둔다. 손익 분해 카드 안에 두면 펼칠 때 2열 행
       * 높이가 통째로 늘어나, 옆의 통화 구성 카드까지 같이 커진다(494 -> 598).
       */}
      <details className="xray-layout__full" style={{ ...CARD_STYLE, padding: 0 }}>
        <summary
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--text)",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.25rem 1.5rem",
            outline: "none",
          }}
        >
          <span>종목별 상세 (접힘)</span>
          <Icon name="chevronDown" size={15} />
        </summary>
        <div className="xray-holdings">
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
                padding: "0.625rem 0",
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

      {/*
       * 스트레스 시나리오는 전폭에 둔다. 결과 박스가 붙으면 카드가 크게
       * 늘어나는데, 2열 안에 있으면 그 행 전체 높이가 따라 튄다.
       */}
      <div className="xray-layout__full" style={CARD_STYLE}>
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

      <div className="xray-layout__full">
        <XRayAiExplanation
          surface={XRAY_EXPOSURE_SURFACE}
          title="통화 노출 AI 설명"
          facts={toExposureExplanationFacts(data)}
          requester={explanationRequester}
        />
      </div>
    </div>
  );
}
