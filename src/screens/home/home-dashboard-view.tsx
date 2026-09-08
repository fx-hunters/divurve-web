/**
 * 홈 대시보드 배치 전용 컴포넌트.
 *
 * 데이터를 직접 가져오지 않는다. '오늘의 시장'은 자체 조회 상태를 가지므로
 * 완성된 노드를 `marketSlot`으로 받아 자리만 잡아 준다(AGENTS.md §7.2).
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
  /** 중앙 상단에 놓이는 '오늘의 시장' 카드. */
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
      {blockStates.forecast !== "empty" && (
        <div className="home-dashboard__market">{marketSlot}</div>
      )}

      <div className="home-dashboard__cards">
        {blockStates.today !== "empty" && (
          <div className="home-dashboard__cell">
            <TodayHeadlineCard
              today={data.today}
              profileFit={data.profileFit}
              isProfileMeasured={blockStates.profile_fit === "filled"}
              asOfLabel={data.asOfLabel}
              onNavigateToMypage={onNavigateToMypage}
            />
          </div>
        )}
        {blockStates.fx_status !== "empty" && (
          <div className="home-dashboard__cell">
            <FxHoldingCard
              data={data.fxStatus}
              onNavigateToAssets={onNavigateToAssets}
            />
          </div>
        )}
        {blockStates.goals_route !== "empty" && (
          <div className="home-dashboard__cell">
            <GoalsRouteCard
              data={data.goalsRoute}
              onNavigateToPlanner={onNavigateToPlanner}
            />
          </div>
        )}
        {blockStates.attention !== "empty" && (
          <div className="home-dashboard__cell home-dashboard__cell--wide">
            <AttentionBanner
              data={data.attention}
              onNavigateToRange={onNavigateToRange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
