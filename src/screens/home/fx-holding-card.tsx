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

/** 통화별 노출을 도넛 조각으로. 서버가 준 순서(원화 평가액 내림차순)를 지킨다. */
function toSegments(
  exposure: readonly ExposureShareItem[],
): readonly DonutSegment[] {
  return exposure.map((item) => ({
    key: item.currencyCode,
    value: item.krw,
    color: toCurrencyColor(item.currencyCode),
  }));
}

/** 통화별 비중 목록. 도넛 조각과 같은 색·같은 순서로 읽힌다. */
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
              label={`통화별 비중 ${exposure
                .map((item) => `${item.currencyCode} ${item.sharePct}%`)
                .join(", ")}`}
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
