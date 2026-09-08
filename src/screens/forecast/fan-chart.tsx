import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  Line,
} from "recharts";
import type { FanChartDataPoint } from "../../types/forecast";

const DEFAULT_PAIR_LABEL = "USD/KRW";

interface FanChartProps {
  readonly data: readonly FanChartDataPoint[];
  /** 통화쌍 표기(예 `USD/KRW`). 축약하지 않고 서버 코드와 같은 순서로 적는다. */
  readonly pairLabel: string;
  /** 기준통화에 고정 배정된 색 토큰(컨벤션 7.2). 상태색과 섞지 않는다. */
  readonly accentColor: string;
}

export interface FanChartTooltipProps {
  readonly active?: boolean;
  readonly payload?: readonly {
    readonly name?: string;
    readonly value?: unknown;
    readonly color?: string;
    readonly dataKey?: string;
  }[];
  readonly label?: string | number;
  readonly pairLabel?: string;
  readonly accentColor?: string;
}

export function formatYTick(v: number | string, idx: number): string {
  return idx === 0 ? "" : Number(v).toLocaleString();
}

export function formatTooltipValue(value: unknown): [string] {
  return [typeof value === "number" ? `₩${value.toLocaleString()}` : String(value)];
}

const ITEM_NAME_MAP: Record<string, string> = {
  price: "실제 환율",
  projected: "투영 시나리오",
  range80_upper: "80% 상한",
  range80_lower: "80% 하한",
  range50_upper: "50% 상한",
  range50_lower: "50% 하한",
};

export function FanChartTooltip({
  active,
  payload,
  label,
  pairLabel = DEFAULT_PAIR_LABEL,
  accentColor = "var(--primary)",
}: FanChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  // 실제 환율 및 투영 시나리오, 80%/50% 범위 데이터 필터링
  const validItems = payload.filter((item) => item.value !== undefined && item.value !== null);

  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "0.75rem 1rem",
        boxShadow: "var(--shadow-lg)",
        minWidth: "180px",
        fontSize: "0.8125rem",
        lineHeight: 1.4,
      }}
    >
      {/* 툴팁 상단 헤더: 날짜 & 통화 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "0.375rem",
          marginBottom: "0.5rem",
        }}
      >
        <span style={{ fontWeight: 700, color: "var(--text)" }}>{label}</span>
        <span
          style={{
            fontSize: "0.6875rem",
            fontWeight: 700,
            padding: "0.125rem 0.375rem",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--surface-subtle)",
            color: accentColor,
            border: "1px solid var(--border)",
          }}
        >
          {pairLabel}
        </span>
      </div>

      {/* 툴팁 본문: 항목 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        {validItems.map((item, idx) => {
          const key = item.dataKey || "";
          const isMain = key === "price" || key === "projected";
          const displayName = (key && ITEM_NAME_MAP[key]) || item.name || key || "항목";
          const formattedVal =
            typeof item.value === "number" ? `₩${item.value.toLocaleString()}` : String(item.value);

          return (
            <div
              key={`${key}-${idx}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: isMain ? accentColor : "var(--text-muted)",
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    color: isMain ? "var(--text)" : "var(--text-muted)",
                    fontWeight: isMain ? 600 : 500,
                    fontSize: "0.75rem",
                  }}
                >
                  {displayName}
                </span>
              </div>
              <span
                style={{
                  fontWeight: 700,
                  color: isMain ? "var(--text)" : "var(--text-muted)",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: isMain ? "0.875rem" : "0.75rem",
                  letterSpacing: "-0.01em",
                }}
              >
                {formattedVal}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FanChart({ data, pairLabel, accentColor }: FanChartProps) {
  if (data.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        데이터가 없습니다.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    day: d.day,
    price: d.price,
    projected: d.projected,
    range80Upper: d.range80Upper,
    range80Lower: d.range80Lower,
    range50Upper: d.range50Upper,
    range50Lower: d.range50Lower,
    range80_upper: d.range80Upper,
    range80_lower: d.range80Lower,
    range50_upper: d.range50Upper,
    range50_lower: d.range50Lower,
  }));

  return (
    <div
      className="w-full h-full min-h-[280px]"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "280px",
      }}
      role="img"
      aria-label={`시뮬레이션 팬 차트 (${pairLabel})`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <ComposedChart data={chartData} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
          <XAxis
            dataKey="day"
            stroke="var(--text-muted)"
            tick={{ fontSize: 12, fill: "var(--text-muted)" }}
            minTickGap={30}
          />
          <YAxis
            domain={["auto", "auto"]}
            stroke="var(--text-muted)"
            tick={{ fontSize: 12, fill: "var(--text-muted)" }}
            width={55}
            tickFormatter={formatYTick}
          />
          <Tooltip
            cursor={{ stroke: "var(--text-muted)", strokeWidth: 1, strokeDasharray: "3 3" }}
            content={
              <FanChartTooltip pairLabel={pairLabel} accentColor={accentColor} />
            }
          />
          <Area
            type="monotone"
            dataKey="range80_upper"
            name="80% 상한"
            stroke="none"
            fill="var(--border)"
            fillOpacity={0.3}
          />
          <Area
            type="monotone"
            dataKey="range80_lower"
            name="80% 하한"
            stroke="none"
            fill="var(--bg)"
            fillOpacity={1}
          />
          <Area
            type="monotone"
            dataKey="range50_upper"
            name="50% 상한"
            stroke="none"
            fill="var(--text-muted)"
            fillOpacity={0.1}
          />
          <Area
            type="monotone"
            dataKey="range50_lower"
            name="50% 하한"
            stroke="none"
            fill="var(--surface)"
            fillOpacity={1}
          />
          <Line
            type="monotone"
            dataKey="price"
            name="실제 환율"
            stroke={accentColor}
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="projected"
            name="투영 시나리오"
            stroke={accentColor}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
