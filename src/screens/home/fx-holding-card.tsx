import { Card } from "../../components/common/card";
import { DonutChart } from "../../components/common/donut-chart";
import type { FxStatusData } from "../../types/home";

interface FxHoldingCardProps {
  readonly data: FxStatusData;
  readonly onNavigateToAssets?: () => void;
}

export function FxHoldingCard({ data, onNavigateToAssets }: FxHoldingCardProps) {
  const ratioPct = data.fxRatioPct;

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
          <DonutChart
            percent={ratioPct}
            size={120}
            strokeWidth={14}
            color="var(--usd)"
            trackColor="var(--border)"
            label={`외화 비중 ${ratioPct}%`}
          />

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
