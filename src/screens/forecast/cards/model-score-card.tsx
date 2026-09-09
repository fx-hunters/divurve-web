import type { ModelPerformanceScore } from "../../../types/forecast";
import { CARD_PADDING, CARD_SURFACE, CARD_TITLE } from "./card-surface";

/**
 * 성적표를 못 받은 지평의 안내. 성적표는 지평만큼의 과거 관측을 잘라 검증한
 * 결과라 긴 지평에서는 서버가 이 값만 주지 못할 수 있다(`api/forecast.ts`).
 */
const EMPTY_TEXT =
  "이 기간의 성적표는 아직 표시할 수 없습니다. 검증할 과거 관측이 쌓이면 나타납니다.";

/** 카드가 무엇을 잰 숫자인지 먼저 말한다 — 지표 이름만으로는 읽히지 않는다. */
const CARD_HELP_TEXT =
  "지난 구간을 되짚어, 같은 방식으로 낸 모델 값과 실제로 나온 환율을 맞춰 본 결과입니다.";

interface MetricRowProps {
  readonly label: string;
  readonly value: string;
  readonly valueColor: string;
  readonly description: string;
}

/** 지표 한 줄: 이름·값 한 행 + 그 아래 한 문장 설명. */
function MetricRow({ label, value, valueColor, description }: MetricRowProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "0.75rem",
        }}
      >
        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>
          {label}
        </span>
        <span
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: valueColor,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
      </div>
      <p
        style={{
          fontSize: "0.75rem",
          lineHeight: 1.5,
          color: "var(--text-muted)",
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}

/** 값만 받아 그리는 성적표 본문. */
function ModelScoreRows({ score }: { readonly score: ModelPerformanceScore }) {
  // 개선 폭이 0 이하면 `+` 를 붙이지 않는다 — 서버가 음수를 주면 `+-3%` 가 된다.
  const improvement = score.randomWalkImprovementPct;
  const isImproved = improvement > 0;

  return (
    <>
      <MetricRow
        label="평균 오차율"
        value={`${score.maePct}%`}
        valueColor="var(--text)"
        description="모델 값이 실제 환율과 평균 이만큼 벌어졌습니다. 낮을수록 좁게 맞았다는 뜻입니다."
      />
      <MetricRow
        label="포함률(80%)"
        value={`${score.inclusion80Pct}%`}
        valueColor="var(--text)"
        description="실제 환율이 80% 범위 안에 들어온 비율입니다. 80%에 가까울수록 범위 폭이 알맞았다는 뜻입니다."
      />
      <MetricRow
        label="단순 기준선 대비"
        value={`${isImproved ? "+" : ""}${improvement}%`}
        valueColor={isImproved ? "var(--normal)" : "var(--text)"}
        description="환율이 오늘 값 그대로 이어진다고 본 기준선(랜덤워크)과 견준 오차 차이입니다. 값이 클수록 오차가 그만큼 작았습니다."
      />
    </>
  );
}

interface ModelScoreCardProps {
  readonly score: ModelPerformanceScore | null;
}

/**
 * 모델 성적 카드.
 *
 * 접어 두면 기본 상태에서 아무 값도 안 보여 카드가 있으나 마나 하므로 항상
 * 펼친 채로 둔다. 대신 지표마다 무엇을 잰 숫자인지 한 문장씩 붙인다.
 */
export function ModelScoreCard({ score }: ModelScoreCardProps) {
  return (
    <div style={{ ...CARD_SURFACE, padding: CARD_PADDING }}>
      <h3 style={{ ...CARD_TITLE, marginBottom: "0.5rem" }}>모델 성적</h3>
      <p
        style={{
          fontSize: "0.75rem",
          lineHeight: 1.5,
          color: "var(--text-muted)",
          margin: "0 0 1rem",
        }}
      >
        {CARD_HELP_TEXT}
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.875rem",
          paddingTop: "0.875rem",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        {score === null ? (
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
            {EMPTY_TEXT}
          </p>
        ) : (
          <ModelScoreRows score={score} />
        )}
      </div>
    </div>
  );
}
