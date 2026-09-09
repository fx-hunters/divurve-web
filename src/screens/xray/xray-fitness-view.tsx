import { useState } from "react";
import { Icon } from "../../components/common/icon";
import { Skeleton, SkeletonText } from "../../components/common/skeleton";
import type {
  FitPreviewConcentrationPoint,
  FitPreviewRequest,
  FitPreviewResponse,
} from "../../api/generated/divurve-api";
import type { ExplanationRequester } from "../../hooks/use-ai-explanation";
import type { XRayDashboardData } from "../../types/xray";
import { XRayAiExplanation, XRAY_FITNESS_SURFACE } from "./xray-ai-explanation";
import { XRaySummaryStrip, type XRaySummaryItem } from "./xray-summary-strip";
import { isRiskProfileMeasured } from "../../components/diagnosis/diagnosis-presenter";
import { toPercent } from "../../lib/percent";
import {
  isConcentrationAboveThreshold,
  toConcentrationStatusLabel,
  toFitnessExplanationFacts,
} from "./xray-presenter";
import "./xray-layout.css";

export type FitPreviewState =
  | { readonly status: "idle" }
  | { readonly status: "running" }
  | { readonly status: "error"; readonly message: string }
  // 응답 타입을 그대로 쓴다. 모양을 여기 다시 적으면 서버와 갈라져도 알 수 없다.
  | { readonly status: "done"; readonly preview: FitPreviewResponse };

/**
 * 가정 전후 집중도 한 줄.
 *
 * 색은 기준선 판정(`status`)을 따른다. 조정 후라고 무조건 안전색을 칠하면
 * 여전히 기준선을 넘는 결과를 안전한 것처럼 보이게 만든다.
 */
function ConcentrationPointRow({
  label,
  point,
}: {
  readonly label: string;
  readonly point: FitPreviewConcentrationPoint;
}) {
  const isAbove = isConcentrationAboveThreshold(point.status);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "0.5rem",
        fontSize: "0.875rem",
        fontWeight: 600,
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          {point.topCurrencyCode} · {toConcentrationStatusLabel(point.status)}
        </span>
        <span
          style={{
            color: isAbove ? "var(--danger)" : "var(--normal)",
            fontWeight: 700,
          }}
        >
          {toPercent(point.share)}%
        </span>
      </span>
    </div>
  );
}

interface XRayFitnessViewProps {
  /**
   * 아직 서버를 기다리는 중이면 null. 카드·제목·슬라이더는 그대로 서고
   * 값이 들어갈 자리만 자리표시자가 된다.
   */
  readonly data: XRayDashboardData | null;
  readonly previewState: FitPreviewState;
  readonly onPreviewAdjustment: (input: FitPreviewRequest) => void;
  readonly onNavigateToPlanner: () => void;
  /** AI 설명 요청 경로 주입 지점. 없으면 공용 훅의 기본 경로를 쓴다. */
  readonly explanationRequester?: ExplanationRequester;
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

type CandidateCurrency = (typeof CANDIDATE_CURRENCIES)[number];

/** 값이 없으면 0 으로 꾸미지 않고 없다고 적는다. */
function toPercentLabel(percent: number | undefined, suffix: string): string {
  return percent === undefined ? "—" : `${percent}${suffix}`;
}

/**
 * 상단 요약 스트립에 올릴 판정 수치들.
 *
 * `gapPp` 는 서버가 준 `share − threshold` 로 이미 0~1 비율이라 표시 단위로만
 * 바꾼다. 프론트에서 격차를 다시 계산하지 않는다(AGENTS.md §1).
 */
function toFitnessSummaryItems(
  data: XRayDashboardData | null,
): readonly XRaySummaryItem[] {
  const concentration = data?.concentration ?? null;
  const isOver =
    concentration !== null &&
    isConcentrationAboveThreshold(concentration.status);
  return [
    {
      key: "top-currency",
      label: "주력 통화",
      value: concentration === null ? null : (concentration.topCurrencyCode ?? "—"),
    },
    {
      key: "share",
      label: "집중도",
      value:
        concentration === null
          ? null
          : toPercentLabel(concentration.sharePct, "%"),
      tone: isOver ? "danger" : "primary",
      hint: "외화 자산 대비",
    },
    {
      key: "threshold",
      label: "기준선",
      value:
        concentration === null
          ? null
          : toPercentLabel(concentration.thresholdPct, "%"),
      // 등급 이름은 아래 진단 카드가 이미 적는다. 여기서는 기준선의 출처만 밝힌다.
      hint:
        concentration === null
          ? null
          : concentration.thresholdPct === undefined
            ? "성향 진단 후 제공"
            : "내 성향 기준",
    },
    {
      key: "gap",
      label: "기준선 격차",
      value:
        concentration === null
          ? null
          : concentration.gapPp === undefined
            ? "—"
            : `${concentration.gapPp > 0 ? "+" : ""}${toPercent(concentration.gapPp)}%p`,
      tone: isOver ? "danger" : "default",
      hint: concentration === null ? null : concentration.statusLabel,
    },
  ];
}


export function XRayFitnessView({
  data,
  previewState,
  onPreviewAdjustment,
  onNavigateToPlanner,
  explanationRequester,
}: XRayFitnessViewProps) {
  const concentration = data?.concentration ?? null;
  const otherCurrencies = CANDIDATE_CURRENCIES.filter(
    (code) => code !== concentration?.topCurrencyCode,
  );
  /*
   * 고른 통화를 그대로 쓰지 않고 후보 목록으로 한 번 거른다. 로딩 중에는
   * 주력 통화를 몰라 후보에 그 통화가 섞여 있고, 값이 도착하면 목록에서
   * 빠지기 때문이다. 저장한 선택이 더 이상 후보가 아니면 첫 후보로 돌아간다.
   */
  const [pickedCurrencyCode, setPickedCurrencyCode] =
    useState<CandidateCurrency | null>(null);
  // 주력 통화는 최대 하나뿐이라 후보는 항상 둘 이상 남는다.
  const currencyCode =
    pickedCurrencyCode !== null && otherCurrencies.includes(pickedCurrencyCode)
      ? pickedCurrencyCode
      : otherCurrencies[0];
  const [deltaSharePct, setDeltaSharePct] = useState(10);

  const isOver =
    concentration !== null &&
    isConcentrationAboveThreshold(concentration.status);
  const isMeasured =
    concentration !== null &&
    isRiskProfileMeasured(concentration.riskProfileStatus);

  return (
    <div className="xray-layout">
      <div className="xray-layout__full">
        <XRaySummaryStrip items={toFitnessSummaryItems(data)} />
      </div>

      {/*
       * 집중도 진단 — 큰 숫자는 위 스트립이 이미 보여 준다. 이 카드는 그
       * 숫자를 기준선 옆에 세워 얼마나 넘었는지 보이는 일만 맡는다.
       */}
      <div className="xray-layout__pair" style={CARD_STYLE}>
        <h2 style={CARD_TITLE_STYLE}>집중도 진단</h2>

        {concentration === null ? (
          <>
            <Skeleton shape="block" height="20px" />
            <SkeletonText lines={2} />
          </>
        ) : concentration.sharePct === undefined ? (
          <p style={{ fontSize: "0.9375rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            집중도를 계산할 자산 정보가 아직 없습니다.
          </p>
        ) : (
          <>
            <div
              style={{
                height: "20px",
                width: "100%",
                backgroundColor: "var(--border)",
                borderRadius: "var(--radius-full)",
                position: "relative",
                overflow: "hidden",
                marginBottom: "0.625rem",
              }}
            >
              <div
                style={{
                  width: `${concentration.sharePct}%`,
                  height: "100%",
                  backgroundColor: isOver ? "var(--danger)" : "var(--primary)",
                }}
              />
              {concentration.thresholdPct !== undefined && (
                <div
                  data-testid="fitness-threshold-marker"
                  style={{
                    position: "absolute",
                    left: `${concentration.thresholdPct}%`,
                    top: 0,
                    bottom: 0,
                    width: "2px",
                    backgroundColor: "var(--text)",
                    zIndex: 10,
                  }}
                />
              )}
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

        {concentration !== null && !isMeasured && (
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
        {isMeasured && concentration?.gradeLabel !== undefined && (
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "1rem" }}>
            위험성향 {concentration.gradeLabel}
            {concentration.diagnosedOnLabel !== undefined &&
              ` · ${concentration.diagnosedOnLabel} 진단`}
          </p>
        )}
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem", lineHeight: 1.6 }}>
          {concentration === null ? <Skeleton width="80%" /> : concentration.basisNote}
        </p>
      </div>

      {/* 쏠림을 고치는 방법 */}
      <div
        className="xray-layout__pair"
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

      {/*
       * 비중 조정 시뮬레이터는 전폭에 둔다. 조정 결과 박스가 붙으면 카드가
       * 크게 늘어나는데, 2열 안에 있으면 그 행 전체 높이가 따라 튄다.
       */}
      <div className="xray-layout__full" style={CARD_STYLE}>
        <h2 style={CARD_TITLE_STYLE}>비중 조정 시뮬레이터</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {otherCurrencies.map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={currencyCode === code}
                onClick={() => setPickedCurrencyCode(code)}
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
              <ConcentrationPointRow
                label="조정 전 집중도"
                point={previewState.preview.concentration.before}
              />
              <ConcentrationPointRow
                label="조정 후 집중도"
                point={previewState.preview.concentration.after}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                {previewState.preview.assumption}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="xray-layout__full">
        <XRayAiExplanation
          surface={XRAY_FITNESS_SURFACE}
          title="통화 적합도 AI 설명"
          facts={data === null ? null : toFitnessExplanationFacts(data)}
          requester={explanationRequester}
        />
      </div>
    </div>
  );
}
