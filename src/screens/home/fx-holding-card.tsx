import { Card } from "../../components/common/card";
import {
  DonutChart,
  type DonutSegment,
} from "../../components/common/donut-chart";
import type { FxStatusData } from "../../types/home";
import type { ExposureShareItem } from "../../types/xray";
import { toCurrencyColor } from "./home-market";

interface FxHoldingCardProps {
  readonly data: FxStatusData;
  readonly onNavigateToAssets?: () => void;
}

/**
 * 도넛이 색으로 구분할 수 있는 조각 수.
 *
 * 통화 색은 USD·JPY·EUR 세 개만 고정 배정돼 있고(개발 컨벤션 7.2) 나머지는
 * 전부 `--text-muted` 로 떨어진다. 네 조각째부터는 회색끼리 구분되지 않으므로
 * 색을 늘리는 대신 나머지를 하나로 묶는다 — 색을 임의로 늘리면 통화-색 고정
 * 배정 규칙이 깨진다.
 */
const DONUT_SEGMENT_LIMIT = 3;

const OTHER_SEGMENT_KEY = "__other__";

/**
 * 통화별 노출을 도넛 조각으로. 서버가 준 순서(원화 평가액 내림차순)를 지킨다.
 *
 * 상위 세 개까지는 통화 색 그대로, 그 아래는 "기타" 한 조각으로 합친다.
 */
export function toSegments(
  exposure: readonly ExposureShareItem[],
): readonly DonutSegment[] {
  const top = exposure.slice(0, DONUT_SEGMENT_LIMIT).map((item) => ({
    key: item.currencyCode,
    value: item.krw,
    color: toCurrencyColor(item.currencyCode),
  }));
  const restKrw = exposure
    .slice(DONUT_SEGMENT_LIMIT)
    .reduce((sum, item) => sum + item.krw, 0);
  if (restKrw <= 0) return top;
  return [
    ...top,
    { key: OTHER_SEGMENT_KEY, value: restKrw, color: "var(--text-muted)" },
  ];
}

/** 도넛 라벨. 묶인 나머지가 있으면 몇 개를 묶었는지 함께 읽어 준다. */
export function toDonutLabel(exposure: readonly ExposureShareItem[]): string {
  const top = exposure
    .slice(0, DONUT_SEGMENT_LIMIT)
    .map((item) => `${item.currencyCode} ${item.sharePct}%`)
    .join(", ");
  const restCount = Math.max(exposure.length - DONUT_SEGMENT_LIMIT, 0);
  return restCount === 0
    ? `통화별 비중 ${top}`
    : `통화별 비중 ${top}, 기타 ${restCount}종`;
}

/**
 * 통화별 비중 목록. 서버가 준 순서를 그대로 지킨다.
 *
 * 도넛이 상위 세 개만 색으로 가르는 것과 달리 여기는 전부 나열한다 — 목록은
 * 통화 코드가 글자로 붙어 있어 색이 같아도 읽을 수 있고, 정확한 금액은 이쪽이
 * 유일한 출처다.
 */
function ExposureLegend({
  exposure,
}: {
  readonly exposure: readonly ExposureShareItem[];
}) {
  return (
    <ul
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {exposure.map((item) => (
        <li
          key={item.currencyCode}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: "var(--radius-full)",
                backgroundColor: toCurrencyColor(item.currencyCode),
                display: "inline-block",
              }}
            />
            <span style={{ color: "var(--text)", fontWeight: 700 }}>
              {item.currencyCode}
            </span>
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            {item.sharePct}% · ₩ {item.krw.toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function FxHoldingCard({ data, onNavigateToAssets }: FxHoldingCardProps) {
  const ratioPct = data.fxRatioPct;
  const { exposure } = data;
  const hasExposure = exposure.length > 0;

  return (
    <Card
      title="내 외화 현황"
      action={
        onNavigateToAssets && (
          <button
            type="button"
            onClick={onNavigateToAssets}
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--primary)",
              textDecoration: "underline",
            }}
          >
            자산 등록 / 편집
          </button>
        )
      }
      className="fx-holding-card"
    >
      {ratioPct === undefined ? (
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
          등록된 자산이 없어 외화 비중을 계산할 수 없습니다.
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "1.5rem",
          }}
        >
          {/*
            통화별 노출이 오면 분해 도넛으로, 아직 안 오면 외화 비중 게이지로
            그린다. 두 그림이 답하는 질문이 다르므로 겹쳐 놓지 않는다 —
            "무슨 통화를 얼마나" vs "자산 중 외화가 얼마나".
          */}
          {hasExposure ? (
            <DonutChart
              segments={toSegments(exposure)}
              size={120}
              strokeWidth={14}
              label={toDonutLabel(exposure)}
            />
          ) : (
            <DonutChart
              percent={ratioPct}
              size={120}
              strokeWidth={14}
              color="var(--usd)"
              trackColor="var(--border)"
              label={`외화 비중 ${ratioPct}%`}
            />
          )}

          <div
            style={{
              flex: 1,
              minWidth: "200px",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {hasExposure && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <span style={{ color: "var(--text-muted)" }}>외화 비중</span>
                <span style={{ color: "var(--text)", fontWeight: 700 }}>
                  {ratioPct}%
                </span>
              </div>
            )}
            {hasExposure && <ExposureLegend exposure={exposure} />}
            {data.topCurrencyCode !== undefined && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <span style={{ color: "var(--text-muted)" }}>주력 통화</span>
                <span style={{ color: "var(--text)", fontWeight: 700 }}>
                  {data.topCurrencyCode}
                </span>
              </div>
            )}
            {data.dayChangeKrw !== undefined && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <span style={{ color: "var(--text-muted)" }}>어제 대비</span>
                <span
                  style={{
                    color: data.dayChangeKrw >= 0 ? "var(--normal)" : "var(--danger)",
                    fontWeight: 700,
                  }}
                >
                  {data.dayChangeKrw >= 0 ? "+" : ""}₩ {data.dayChangeKrw.toLocaleString()}
                </span>
              </div>
            )}
            {data.sensitivity1pctKrw !== undefined && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <span style={{ color: "var(--text-muted)" }}>1% 변동 시</span>
                <span style={{ color: "var(--text)", fontWeight: 700 }}>
                  ±₩ {data.sensitivity1pctKrw.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
