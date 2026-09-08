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
  readonly data: HomeDashboardData;
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
  const { blockStates } = data;

  return (
    <div className="home-dashboard">
      {blockStates.today !== "empty" && (
        <div className="home-dashboard__cell home-dashboard__headline">
          <TodayHeadlineCard
            today={data.today}
            profileFit={data.profileFit}
            isProfileMeasured={blockStates.profile_fit === "filled"}
            asOfLabel={data.asOfLabel}
            onNavigateToMypage={onNavigateToMypage}
          />
        </div>
      )}

      {blockStates.attention !== "empty" && (
        <div className="home-dashboard__cell home-dashboard__calendar">
          <AttentionBanner
            data={data.attention}
            onNavigateToRange={onNavigateToRange}
          />
        </div>
      )}

      {blockStates.forecast !== "empty" && (
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
        {blockStates.goals_route !== "empty" && (
          <GoalsRouteCard
            data={data.goalsRoute}
            onNavigateToPlanner={onNavigateToPlanner}
          />
        )}
        {blockStates.fx_status !== "empty" && (
          <FxHoldingCard
            data={data.fxStatus}
            onNavigateToAssets={onNavigateToAssets}
          />
        )}
      </div>

    </div>
  );
}
