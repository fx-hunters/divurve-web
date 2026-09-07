/**
 * 2-4. 환율 선형 차트.
 *
 * 서버가 준 점만 잇는다. 이동평균·추세선 같은 파생값을 그리지 않는다.
 */
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminFxRatePoint } from "../../api/admin";
import { formatAdminValue } from "./admin-value";

export function formatFxAxisTick(value: unknown): string {
  return formatAdminValue(value);
}

interface AdminFxRateChartProps {
  readonly points: readonly AdminFxRatePoint[];
  readonly pairCode: string;
}

export function AdminFxRateChart({ points, pairCode }: AdminFxRateChartProps) {
  if (points.length === 0) {
    return <p className="admin-empty">표시할 점이 없습니다.</p>;
  }

  return (
    <div
      className="admin-chart"
      role="img"
      aria-label={`${pairCode} 환율 추이`}
    >
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={points as AdminFxRatePoint[]}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="quoteDate"
            stroke="var(--text-muted)"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={["auto", "auto"]}
            stroke="var(--text-muted)"
            tick={{ fontSize: 11 }}
            tickFormatter={formatFxAxisTick}
            width={90}
          />
          <Tooltip formatter={formatFxAxisTick} />
          <Line
            type="linear"
            dataKey="rate"
            stroke="var(--primary)"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
