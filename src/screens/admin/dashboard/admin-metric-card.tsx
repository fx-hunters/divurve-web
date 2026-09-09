/**
 * 대시보드 지표 카드.
 *
 * props만 받는 표현 컴포넌트다(AGENTS.md 7.2). 값을 가져오지도, 만들지도 않는다.
 */
import type { ReactNode } from "react";
import type { AdminErrorInfo } from "../admin-errors";
import { AdminErrorPanel } from "../admin-panels";

export type AdminMetricTone = "neutral" | "ok" | "warn";

interface AdminMetricCardProps {
  readonly title: string;
  /** 카드의 한 줄 요약. 여기가 비면 카드를 볼 이유가 없다. */
  readonly headline: string;
  readonly tone?: AdminMetricTone;
  readonly isLoading?: boolean;
  /** 카드 하나가 실패해도 나머지는 그대로 선다. */
  readonly error?: AdminErrorInfo;
  readonly children?: ReactNode;
}

export function AdminMetricCard({
  title,
  headline,
  tone = "neutral",
  isLoading = false,
  error,
  children,
}: AdminMetricCardProps) {
  return (
    <section className="admin-metric-card">
      <h2 className="admin-metric-card__title">{title}</h2>
      {error !== undefined ? (
        <AdminErrorPanel error={error} />
      ) : (
        <>
          <p
            className={`admin-metric-card__headline admin-metric-card__headline--${tone}`}
          >
            {isLoading ? "불러오는 중" : headline}
          </p>
          {!isLoading && children}
        </>
      )}
    </section>
  );
}
