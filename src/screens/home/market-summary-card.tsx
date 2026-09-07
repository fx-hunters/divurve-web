import { Card } from "../../components/common/card";
import { Badge } from "../../components/common/badge";
import type { ForecastSummaryData } from "../../types/home";

interface MarketSummaryCardProps {
  readonly data: ForecastSummaryData;
}

export function MarketSummaryCard({ data }: MarketSummaryCardProps) {
  const hasBand = data.lowerLabel !== undefined && data.upperLabel !== undefined;

  return (
    <Card title={`오늘의 시장 (${data.pairLabel})`} className="market-summary-card">
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {data.currentRateLabel === undefined ? (
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
            현재 환율을 불러오지 못했습니다.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.25rem",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ fontSize: "1.25rem", color: "var(--text-muted)", fontWeight: 500 }}>₩</span>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text)" }}>
              {data.currentRateLabel}
            </span>
          </div>
        )}

        {hasBand && (
          <div>
            <Badge variant="primary">
              80% 범위 {data.lowerLabel} - {data.upperLabel}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
}
