/**
 * 홈 대시보드 배치 전용 컴포넌트.
 *
 * 데이터를 직접 가져오지 않는다. '오늘의 시장'은 자체 조회 상태를 가지므로
 * 완성된 노드를 `marketSlot`으로 받아 자리만 잡아 준다(AGENTS.md §7.2).
 *
 * DOM 순서가 곧 모바일 읽기 순서다 — 핵심 → 일정 → 시장 → 목표 → 현황.
 * 배치는 `home-dashboard.css`가 정한다.
 */
import type { ReactNode } from "react";
import { TodayHeadlineCard } from "./today-headline-card";
import { FxHoldingCard } from "./fx-holding-card";
import { GoalsRouteCard } from "./goals-route-card";
import { AttentionBanner } from "./attention-banner";
import type { HomeDashboardData } from "../../types/home";
import "./home-dashboard.css";

interface HomeDashboardViewProps {
  /**
   * 아직 서버를 기다리는 중이면 null. 어떤 블록이 비어 있는지도 서버가
   * 알려 주는 값이라, 응답 전에는 다섯 장을 모두 세워 두고 값 자리만 비운다.
   */
  readonly data: HomeDashboardData | null;
  /** 왼쪽 기둥에 놓이는 '오늘의 시장' 카드. */
  readonly marketSlot?: ReactNode;
  readonly onNavigateToAssets?: () => void;
  readonly onNavigateToPlanner?: () => void;
  readonly onNavigateToRange?: () => void;
  readonly onNavigateToMypage?: () => void;
}

export function HomeDashboardView({
  data,
  marketSlot,
  onNavigateToAssets,
  onNavigateToPlanner,
  onNavigateToRange,
  onNavigateToMypage,
}: HomeDashboardViewProps) {
  const blockStates = data?.blockStates ?? null;

  return (
    <div className="home-dashboard">
      {/*
        값 자리가 비어 있는 동안 상태를 한 번만 읽어 준다. 자리표시자 막대는
        전부 aria-hidden 이라 여기 말고는 읽힐 것이 없다.
      */}
      {data === null && (
        <span className="sr-only" role="status">
          홈 정보를 불러오는 중입니다. 서버의 최신 요약을 확인하고 있습니다.
        </span>
      )}

      {blockStates?.today !== "empty" && (
        <div className="home-dashboard__cell home-dashboard__headline">
          <TodayHeadlineCard
            today={data?.today ?? null}
            profileFit={data?.profileFit ?? null}
            isProfileMeasured={blockStates?.profile_fit === "filled"}
            asOfLabel={data?.asOfLabel ?? null}
            onNavigateToMypage={onNavigateToMypage}
          />
        </div>
      )}

      {blockStates?.attention !== "empty" && (
        <div className="home-dashboard__cell home-dashboard__calendar">
          <AttentionBanner
            data={data?.attention ?? null}
            onNavigateToRange={onNavigateToRange}
          />
        </div>
      )}

      {blockStates?.forecast !== "empty" && (
        <div className="home-dashboard__cell home-dashboard__market">
          {marketSlot}
        </div>
      )}

      {/*
        오른쪽 기둥은 한 칸에 묶는다. 카드를 각각 그리드 행에 놓으면, 왼쪽
        시장 카드가 두 행에 걸치면서 남는 높이를 그리드가 행마다 나눠 넣어
        카드 '사이'에 빈 공간이 생긴다. 한 칸이면 남는 높이는 마지막 카드
        아래로 가고, 그건 그냥 여백으로 읽힌다.
      */}
      <div className="home-dashboard__cell home-dashboard__side">
        {blockStates?.goals_route !== "empty" && (
          <GoalsRouteCard
            data={data?.goalsRoute ?? null}
            onNavigateToPlanner={onNavigateToPlanner}
          />
        )}
        {blockStates?.fx_status !== "empty" && (
          <FxHoldingCard
            data={data?.fxStatus ?? null}
            onNavigateToAssets={onNavigateToAssets}
          />
        )}
      </div>

    </div>
  );
}
