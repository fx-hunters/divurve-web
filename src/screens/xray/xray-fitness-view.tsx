import { useState } from "react";
import { Icon } from "../../components/common/icon";
import type { FitPreviewRequest } from "../../api/generated/divurve-api";
import type { XRayDashboardData } from "../../types/xray";
import { toPercent } from "./xray-presenter";

export type FitPreviewState =
  | { readonly status: "idle" }
  | { readonly status: "running" }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "done";
      readonly preview: {
        readonly assumption: string;
        readonly concentration: { readonly share?: number; readonly status: string };
        readonly sensitivity1pct: {
          readonly before: Readonly<Record<string, number>>;
          readonly after: Readonly<Record<string, number>>;
        };
      };
    };

interface XRayFitnessViewProps {
  readonly data: XRayDashboardData;
  readonly previewState: FitPreviewState;
  readonly onPreviewAdjustment: (input: FitPreviewRequest) => void;
  readonly onNavigateToPlanner: () => void;
}

const CARD_STYLE = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "1.75rem",
  boxShadow: "var(--shadow-sm)",
} as const;

const CARD_TITLE_STYLE = {
  fontSize: "0.8125rem",
  fontWeight: 700,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "1.5rem",
} as const;

/** 분산 매수 후보로 보여줄 통화. 통화 색 배정과 같은 고정 목록이다. */
const CANDIDATE_CURRENCIES = ["USD", "JPY", "EUR"] as const;

export function XRayFitnessView({
  data,
  previewState,
  onPreviewAdjustment,
  onNavigateToPlanner,
}: XRayFitnessViewProps) {
  const { concentration } = data;
  const otherCurrencies = CANDIDATE_CURRENCIES.filter(
    (code) => code !== concentration.topCurrencyCode,
  );
  // 주력 통화는 최대 하나뿐이라 후보는 항상 둘 이상 남는다.
  const [currencyCode, setCurrencyCode] = useState<string>(otherCurrencies[0]);
  const [deltaSharePct, setDeltaSharePct] = useState(10);

  const isOver = concentration.status === "over";
  const isMeasured = concentration.riskProfileStatus === "measured";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* 1행: 집중도 진단 & 쏠림 해결 가이드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "1.5rem" }}>
        {/* 집중도 진단 카드 */}
        <div style={CARD_STYLE}>
          <h2 style={CARD_TITLE_STYLE}>집중도 진단</h2>

          {concentration.sharePct === undefined ? (
            <p style={{ fontSize: "0.9375rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              집중도를 계산할 자산 정보가 아직 없습니다.
            </p>
          ) : (
            <>
              <div
                style={{
                  fontSize: "clamp(3rem, 8vw, 4.5rem)",
                  fontWeight: 800,
                  color: isOver ? "var(--danger)" : "var(--primary)",
                  marginBottom: "1rem",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                }}
              >
                {concentration.sharePct}
                <span style={{ fontSize: "2.25rem", fontWeight: 500, opacity: 0.7, marginLeft: "4px" }}>
                  %
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  color: "var(--text)",
                  borderLeft: `3px solid ${isOver ? "var(--danger)" : "var(--primary)"}`,
                  paddingLeft: "0.75rem",
                  lineHeight: 1.6,
                }}
              >
                주력 통화({concentration.topCurrencyCode ?? "-"}) 비중이 전체의{" "}
                {concentration.sharePct}%입니다. 판정: {concentration.statusLabel}.
                {concentration.thresholdPct !== undefined &&
                  ` 기준선은 ${concentration.thresholdPct}%입니다.`}
              </p>
            </>
          )}

          {!isMeasured && (
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-muted)",
                marginTop: "1rem",
                lineHeight: 1.6,
              }}
            >
              위험성향을 진단하면 내 성향에 맞는 기준선과 함께 판정을 볼 수 있습니다. 마이페이지에서
              진단할 수 있습니다.
            </p>
          )}
          {isMeasured && concentration.gradeLabel !== undefined && (
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "1rem" }}>
              위험성향 {concentration.gradeLabel}
              {concentration.diagnosedOnLabel !== undefined &&
                ` · ${concentration.diagnosedOnLabel} 진단`}
            </p>
          )}
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem", lineHeight: 1.6 }}>
            {concentration.basisNote}
          </p>
        </div>

        {/* 쏠림을 고치는 방법 */}
        <div
          style={{
            ...CARD_STYLE,
            borderTop: "4px solid var(--primary)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 4px 20px var(--primary-subtle)",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "var(--text)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ color: "var(--primary)" }}>
                <Icon name="sparkles" size={18} />
              </div>
              <span>쏠림을 고치는 방법</span>
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--text-muted)",
                lineHeight: 1.6,
                marginBottom: "1.5rem",
              }}
            >
              이미 가진 통화를 파는 것은 투자 결정이라 다루지 않습니다. 앞으로 사는 통화를 다른
              통화로 바꾸면 쏠림이 자연스럽게 줄어듭니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onNavigateToPlanner}
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-content)",
              fontWeight: 700,
              fontSize: "0.875rem",
              padding: "0.875rem 1.5rem",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 12px var(--primary-subtle)",
              transition: "all 0.15s ease",
            }}
          >
            <span>새 통화 목표 만들기</span>
            <Icon name="arrowRight" size={16} />
          </button>
        </div>
      </div>

      {/* 2행: 비중 조정 시뮬레이터 */}
      <div style={CARD_STYLE}>
        <h2 style={CARD_TITLE_STYLE}>비중 조정 시뮬레이터</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {otherCurrencies.map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={currencyCode === code}
                onClick={() => setCurrencyCode(code)}
                style={{
                  padding: "0.375rem 0.875rem",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  borderRadius: "var(--radius-md)",
                  backgroundColor: currencyCode === code ? "var(--primary)" : "var(--bg)",
                  color: currencyCode === code ? "var(--primary-content)" : "var(--text)",
                  border: `1px solid ${currencyCode === code ? "var(--primary)" : "var(--border)"}`,
                }}
              >
                {code}
              </button>
            ))}
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <label
                htmlFor="delta-share-slider"
                style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}
              >
                {currencyCode} 추가 매수 비율
              </label>
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "var(--primary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                +{deltaSharePct}%
              </span>
            </div>
            <input
              id="delta-share-slider"
              type="range"
              min="0"
              max="50"
              value={deltaSharePct}
              onChange={(event) => setDeltaSharePct(Number(event.target.value))}
              style={{ width: "100%", accentColor: "var(--primary)" }}
            />
          </div>

          <button
            type="button"
            onClick={() =>
              onPreviewAdjustment({ currencyCode, deltaShare: deltaSharePct / 100 })
            }
            disabled={previewState.status === "running"}
            style={{
              alignSelf: "flex-start",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 700,
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
          >
            조정 결과 보기
          </button>

          {previewState.status === "idle" && (
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              비율을 정하고 조정 결과를 요청하면 서버가 계산한 집중도와 민감도를 보여줍니다.
            </p>
          )}
          {previewState.status === "running" && (
            <p role="status" style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              조정 결과를 계산하는 중입니다.
            </p>
          )}
          {previewState.status === "error" && (
            <p role="alert" style={{ fontSize: "0.8125rem", color: "var(--danger)" }}>
              {previewState.message}
            </p>
          )}
          {previewState.status === "done" && (
            <div
              style={{
                backgroundColor: "var(--bg)",
                padding: "1.25rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", fontWeight: 600 }}>
                <span style={{ color: "var(--text-muted)" }}>조정 전 집중도</span>
                <span style={{ color: "var(--danger)", fontWeight: 700 }}>
                  {concentration.sharePct === undefined
                    ? "-"
                    : `${concentration.sharePct}%`}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", fontWeight: 600 }}>
                <span style={{ color: "var(--text-muted)" }}>조정 후 집중도</span>
                <span style={{ color: "var(--normal)", fontWeight: 700 }}>
                  {previewState.preview.concentration.share === undefined
                    ? "-"
                    : `${toPercent(previewState.preview.concentration.share)}%`}
                </span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                {previewState.preview.assumption}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
