/**
 * 대시보드 지표 카드.
 *
 * props만 받는 표현 컴포넌트다(AGENTS.md 7.2). 값을 가져오지도, 만들지도 않는다.
 */
import type { ReactNode } from "react";
import { isAdminEndpointMissing, type AdminErrorInfo } from "../admin-errors";
import { AdminErrorPanel } from "../admin-panels";

export type AdminMetricTone = "neutral" | "ok" | "warn" | "muted";

interface AdminMetricCardProps {
  readonly title: string;
  /** 카드의 한 줄 요약. 여기가 비면 카드를 볼 이유가 없다. */
  readonly headline: string;
  readonly tone?: AdminMetricTone;
  readonly isLoading?: boolean;
  /** 카드 하나가 실패해도 나머지는 그대로 선다. */
  readonly error?: AdminErrorInfo;
  /**
   * 서버가 아직 그 엔드포인트를 열지 않았을 때 대신 적을 문구.
   * 없으면 기본 안내를 쓴다.
   */
  readonly pendingLabel?: string;
  readonly children?: ReactNode;
}

export function AdminMetricCard({
  title,
  headline,
  tone = "neutral",
  isLoading = false,
  error,
  pendingLabel = "서버가 아직 제공하지 않습니다.",
  children,
}: AdminMetricCardProps) {
  // 백엔드가 아직 열지 않은 지표를 붉은 에러로 세우면, 진짜 장애가 났을 때
  // 구분이 되지 않는다. "없다"는 신호만 조용한 안내로 떨어뜨린다
  // (`admin-last-refresh-line.tsx`와 같은 관례다).
  if (error !== undefined && isAdminEndpointMissing(error)) {
    return (
      <section className="admin-metric-card">
        <h2 className="admin-metric-card__title">{title}</h2>
        <p className="admin-metric-card__headline admin-metric-card__headline--muted">
          준비 중
        </p>
        <p className="admin-empty">{pendingLabel}</p>
      </section>
    );
  }

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
