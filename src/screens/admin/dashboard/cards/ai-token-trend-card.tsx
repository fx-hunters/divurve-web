/**
 * AI 토큰 사용량 추이 카드 (이슈 #100).
 *
 * 대시보드의 첫 차트다. 숫자만으로는 늘고 있는지 줄고 있는지 보이지 않고,
 * 토큰은 곧 비용이라 추이가 가장 값어치 있다.
 *
 * 서버가 준 일자별 버킷을 날짜로 접어 그린다. 추세선·이동평균 같은 파생값을
 * 그리지 않는다(`admin-fx-rate-chart.tsx` 와 같은 규칙).
 */
import { useCallback, useEffect, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchAdminAiUsageSummary,
  type AdminAiUsageSummary,
} from "../../../../api/admin";
import { toDefaultFxRateRange } from "../../admin-datetime";
import { useAdminRequest } from "../../use-admin-request";
import {
  hasAnyLiveCall,
  toTokenPoints,
  type AdminTokenPoint,
} from "../admin-dashboard-presenter";
import { AdminMetricCard } from "../admin-metric-card";
import {
  dataOf,
  errorOf,
  isLoadingOf,
  type AdminCardProps,
} from "./card-state";

export function AiTokenTrendCard({ onAuthFailure }: AdminCardProps) {
  const range = useMemo(() => toDefaultFxRateRange(new Date()), []);
  const usage = useAdminRequest<[], AdminAiUsageSummary>(
    useCallback(
      () => fetchAdminAiUsageSummary({ from: range.from, to: range.to }),
      [range],
    ),
    onAuthFailure,
  );

  const { send } = usage;
  useEffect(() => {
    void send();
  }, [send]);

  const data = dataOf(usage.state);
  const points = data === null ? [] : toTokenPoints(data.buckets);

  return (
    <AdminMetricCard
      title="AI 토큰 추이"
      headline={`${range.from} ~ ${range.to}`}
      isLoading={isLoadingOf(usage.state)}
      error={errorOf(usage.state)}
    >
      {points.length === 0 ? (
        <p className="admin-empty">이 기간에 집계된 호출이 없습니다.</p>
      ) : (
        <>
          {!hasAnyLiveCall(points) && (
            <p className="admin-empty">
              이 기간에는 LLM 을 부른 호출이 없습니다. 실 API 가 꺼져 있으면
              토큰 0이 정상입니다.
            </p>
          )}
          <div className="admin-chart" role="img" aria-label="일자별 AI 토큰 사용량">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={points as AdminTokenPoint[]}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="inputTokens"
                  name="입력 토큰"
                  fill="var(--primary)"
                  stackId="tokens"
                />
                <Bar
                  dataKey="outputTokens"
                  name="출력 토큰"
                  fill="var(--warn)"
                  stackId="tokens"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </AdminMetricCard>
  );
}
