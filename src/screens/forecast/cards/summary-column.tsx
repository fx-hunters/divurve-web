import { Icon } from "../../../components/common/icon";
import { Skeleton } from "../../../components/common/skeleton";
import type { ForecastPeriod, PairForecastInfo } from "../../../types/forecast";
import { toPeriodLabel } from "../forecast-presenter";
import { CARD_SURFACE } from "./card-surface";

const METRIC_LABEL_STYLE = {
  fontSize: "0.75rem",
  color: "var(--text-muted)",
  marginBottom: "0.5rem",
  textTransform: "uppercase",
  fontWeight: 600,
  letterSpacing: "0.05em",
} as const;

const METRIC_VALUE_STYLE = {
  fontSize: "1.5rem",
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.02em",
} as const;

const SUMMARY_CARD_PADDING = "1.25rem 1.5rem";

interface SummaryColumnProps {
  readonly period: ForecastPeriod;
  /** 아직 없으면 라벨과 버튼은 그대로 두고 값 자리만 자리표시자가 된다. */
  readonly pairInfo: PairForecastInfo | null;
  readonly onNavigateToPlanner: () => void;
}

/**
 * 팬 차트 오른쪽 요약 지표 3종. 값만 받아 그리는 표현 컴포넌트다(§7.2).
 *
 * `pairInfo` 가 없어도 카드 세 장과 라벨, "내 계획에 적용하기" 버튼은 그대로
 * 선다. 로딩 중에 사라지는 것은 숫자뿐이다.
 */
export function SummaryColumn({
  period,
  pairInfo,
  onNavigateToPlanner,
}: SummaryColumnProps) {
  const summary = pairInfo?.summary ?? null;
  const uncertaintyNote = pairInfo?.uncertaintyNote ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* 80% 범위 카드 */}
      <div style={{ ...CARD_SURFACE, padding: SUMMARY_CARD_PADDING }}>
        <div style={METRIC_LABEL_STYLE}>
          80% 범위 ({toPeriodLabel(period)})
        </div>
        <div style={{ ...METRIC_VALUE_STYLE, color: "var(--text)" }}>
          {summary === null ? (
            <Skeleton width="11rem" />
          ) : (
            `${summary.lowerLabel} ~ ${summary.upperLabel}`
          )}
        </div>
      </div>

      {/* 변동성 백분위 카드 */}
      <div style={{ ...CARD_SURFACE, padding: SUMMARY_CARD_PADDING }}>
        <div style={METRIC_LABEL_STYLE}>변동성 백분위</div>
        <div
          style={{
            ...METRIC_VALUE_STYLE,
            color: summary?.isPercentileWarn ? "var(--warn)" : "var(--primary)",
          }}
        >
          {summary === null ? <Skeleton width="5rem" /> : summary.percentile}
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            marginTop: "0.375rem",
            fontWeight: 500,
          }}
        >
          {uncertaintyNote ?? <Skeleton width="80%" />}
        </div>
      </div>

      {/* 내 자산에 미치는 영향 */}
      <div
        style={{
          ...CARD_SURFACE,
          background:
            "linear-gradient(135deg, var(--surface) 0%, var(--primary-subtle) 100%)",
          border: "1px solid var(--primary-border)",
          padding: SUMMARY_CARD_PADDING,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ ...METRIC_LABEL_STYLE, color: "var(--primary)", fontWeight: 700 }}>
            내 자산에 미치는 영향
          </div>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "var(--text)",
              fontVariantNumeric: "tabular-nums",
              marginBottom: "0.75rem",
            }}
          >
            {summary === null ? (
              <Skeleton width="9rem" />
            ) : (
              `1% 움직일 때 ₩${summary.impact}`
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateToPlanner}
          style={{
            fontSize: "0.875rem",
            color: "var(--primary)",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            marginTop: "0.5rem",
          }}
        >
          <span>내 계획에 적용하기</span>
          <Icon name="arrowRight" size={15} />
        </button>
      </div>
    </div>
  );
}
