import {
  FORECAST_HORIZON_DAYS,
  FORECAST_PAIRS,
  type ForecastPair,
  type ForecastPeriod,
} from "../../../types/forecast";
import { currencyColor, toPair, toPairLabel, toPeriodLabel } from "../forecast-presenter";
import { Skeleton } from "../../../components/common/skeleton";
import { CARD_SURFACE } from "./card-surface";

const PAIR_SELECT_ID = "forecast-pair-select";

/** 기간 컨트롤 문구. "무엇에 대한 기간"인지 컨트롤 자체가 말하게 한다. */
const PERIOD_GROUP_LABEL = "전망 기간";
const PERIOD_HELP_TEXT =
  "선택한 기간만큼 앞으로의 환율 범위를 팬 차트와 요약 카드에 표시합니다.";
const PERIOD_HELP_ID = "forecast-period-help";

const FIELD_LABEL_STYLE = {
  fontSize: "0.8125rem",
  fontWeight: 700,
  color: "var(--text-muted)",
  whiteSpace: "nowrap",
} as const;

interface ForecastControlsProps {
  readonly pair: ForecastPair;
  readonly period: ForecastPeriod;
  /** 서버에서 오는 유일한 값. 아직 없으면 그 자리만 자리표시자가 된다. */
  readonly asOfLabel: string | null;
  readonly onSelectPair: (pair: ForecastPair) => void;
  readonly onSelectPeriod: (period: ForecastPeriod) => void;
}

/**
 * 상단 컨트롤 바. 통화쌍·전망 기간·기준 시각을 **한 줄**에 세운다.
 *
 * 기간 그룹을 라벨/칩/설명 3단 세로 스택으로 두면 바 높이가 컨트롤 자체보다
 * 커진다. 라벨은 칩 왼쪽에 붙이고, 보조 설명은 `aria-describedby` 대상만
 * 남겨 화면에서 감춘다(`.sr-only`) — 칩 문구가 이미 "향후 N일"이라 시각적
 * 으로는 중복이지만, 보조기술에는 그대로 읽힌다.
 *
 * 통화쌍 목록(FORECAST_PAIRS)과 기간 목록(FORECAST_HORIZON_DAYS)은 정적
 * 상수이고 선택값은 화면의 로컬 상태다. 그래서 이 바는 서버 응답을 기다리지
 * 않고 먼저 서며, 로딩 중에도 통화쌍·기간을 바꿀 수 있다.
 */
export function ForecastControls({
  pair,
  period,
  asOfLabel,
  onSelectPair,
  onSelectPeriod,
}: ForecastControlsProps) {
  const accentColor = currencyColor(pair.baseCode);

  return (
    <div
      style={{
        ...CARD_SURFACE,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "0.75rem 1.25rem",
        padding: "0.625rem 1rem",
      }}
    >
      {/* 통화쌍 드롭다운 */}
      <label
        htmlFor={PAIR_SELECT_ID}
        style={{
          ...FIELD_LABEL_STYLE,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span>통화쌍</span>
        <span
          aria-hidden="true"
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "var(--radius-full)",
            backgroundColor: accentColor,
            display: "inline-block",
          }}
        />
        <select
          id={PAIR_SELECT_ID}
          value={pair.code}
          onChange={(event) => onSelectPair(toPair(event.target.value))}
          style={{
            padding: "0.375rem 0.5rem",
            fontWeight: 700,
            fontSize: "0.875rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          {FORECAST_PAIRS.map((option) => (
            <option key={option.code} value={option.code}>
              {toPairLabel(option)}
            </option>
          ))}
        </select>
      </label>

      {/* 전망 기간 칩 — 선택지가 여섯이라 좁은 폭에서는 줄바꿈으로 넘어간다
          (가로 스크롤을 쓰면 뒤쪽 선택지가 화면 밖에 숨는다). */}
      <div
        role="group"
        aria-label={PERIOD_GROUP_LABEL}
        aria-describedby={PERIOD_HELP_ID}
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem 0.625rem",
          flex: "1 1 20rem",
          minWidth: 0,
        }}
      >
        <span style={FIELD_LABEL_STYLE}>{PERIOD_GROUP_LABEL}</span>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.375rem",
            minWidth: 0,
            maxWidth: "100%",
          }}
        >
          {FORECAST_HORIZON_DAYS.map((option) => {
            const isSelected = period === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectPeriod(option)}
                style={{
                  flex: "0 0 auto",
                  whiteSpace: "nowrap",
                  padding: "0.375rem 0.625rem",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  borderRadius: "var(--radius-md)",
                  border: isSelected
                    ? "1px solid var(--border)"
                    : "1px solid var(--border-subtle)",
                  backgroundColor: isSelected ? "var(--border)" : "transparent",
                  color: isSelected ? "var(--text)" : "var(--text-muted)",
                  transition: "all 0.15s ease",
                }}
              >
                {toPeriodLabel(option)}
              </button>
            );
          })}
        </div>
        <p id={PERIOD_HELP_ID} className="sr-only">
          {PERIOD_HELP_TEXT}
        </p>
      </div>

      {/* 기준 시각 */}
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          fontVariantNumeric: "tabular-nums",
          marginLeft: "auto",
          whiteSpace: "nowrap",
        }}
      >
        기준 시각:{" "}
        {asOfLabel ?? <Skeleton width="8.5rem" />}
      </div>
    </div>
  );
}
