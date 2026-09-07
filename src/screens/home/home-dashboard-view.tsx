import { TodayHeadlineCard } from "./today-headline-card";
import { FxHoldingCard } from "./fx-holding-card";
import { GoalsRouteCard } from "./goals-route-card";
import { AttentionBanner } from "./attention-banner";
import { MarketSummaryCard } from "./market-summary-card";
import type { HomeDashboardData } from "../../types/home";

interface HomeDashboardViewProps {
  readonly data: HomeDashboardData;
  readonly onNavigateToAssets?: () => void;
  readonly onNavigateToPlanner?: () => void;
  readonly onNavigateToRange?: () => void;
  readonly onNavigateToMypage?: () => void;
}

export function HomeDashboardView({
  data,
  onNavigateToAssets,
  onNavigateToPlanner,
  onNavigateToRange,
  onNavigateToMypage,
}: HomeDashboardViewProps) {
  const { blockStates } = data;

  return (
    <div
      className="home-dashboard-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
        gap: "1.5rem",
      }}
    >
      {/* 오늘의 핵심 및 외화 현황 컬럼 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>
        {blockStates.today !== "empty" && (
          <TodayHeadlineCard
            today={data.today}
            profileFit={data.profileFit}
            isProfileMeasured={blockStates.profile_fit === "filled"}
            asOfLabel={data.asOfLabel}
            onNavigateToMypage={onNavigateToMypage}
          />
        )}
        {blockStates.fx_status !== "empty" && (
          <FxHoldingCard
            data={data.fxStatus}
            onNavigateToAssets={onNavigateToAssets}
          />
        )}
      </div>

      {/* 목표, 주의 필요, 시장 요약 컬럼 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>
        {blockStates.goals_route !== "empty" && (
          <GoalsRouteCard
            data={data.goalsRoute}
            onNavigateToPlanner={onNavigateToPlanner}
          />
        )}
        {blockStates.attention !== "empty" && (
          <AttentionBanner
            data={data.attention}
            onNavigateToRange={onNavigateToRange}
          />
        )}
        {blockStates.forecast !== "empty" && (
          <MarketSummaryCard data={data.forecast} />
        )}
      </div>
    </div>
  );
}
