import { useHomeDashboard, type HomeSummaryLoader } from "./use-home-dashboard";
import { HomeDashboardView } from "./home-dashboard-view";
import { HomeEmptyView } from "./home-empty-view";
import { MarketSummarySection } from "./market-summary-section";
import { ApiStateView } from "../../components/common/api-state-view";
import { toHomeDashboardData } from "./home-presenter";
import { toSummaryMarketSnapshot, type HomeMarketLoader } from "./home-market";
import type { ExplanationRequester } from "../../hooks/use-ai-explanation";
import type { NavTabId } from "../../types/navigation";

interface HomeScreenProps {
  readonly onNavigate: (tab: NavTabId) => void;
  readonly loadSummary?: HomeSummaryLoader;
  /** 통화쌍을 바꿨을 때 시세를 다시 받는 조회. 테스트에서 주입한다. */
  readonly loadMarket?: HomeMarketLoader;
  readonly explainRequester?: ExplanationRequester;
}

export function HomeScreen({
  onNavigate,
  loadSummary,
  loadMarket,
  explainRequester,
}: HomeScreenProps) {
  const { state, reload } = useHomeDashboard(loadSummary);

  if (state.status === "loading") {
    return (
      <ApiStateView
        status="loading"
        title="홈 정보를 불러오는 중입니다"
        message="서버의 최신 요약을 확인하고 있습니다."
      />
    );
  }

  if (state.status === "error") {
    return (
      <ApiStateView
        status="error"
        title="홈 정보를 불러오지 못했습니다"
        message={state.message}
        onRetry={reload}
      />
    );
  }

  if (state.status === "empty") {
    return <HomeEmptyView onNavigateToPlanner={() => onNavigate("planner")} />;
  }

  return (
    <HomeDashboardView
      data={toHomeDashboardData(state.result)}
      marketSlot={
        <MarketSummarySection
          summarySnapshot={toSummaryMarketSnapshot(state.result)}
          loadMarket={loadMarket}
          explainRequester={explainRequester}
        />
      }
      onNavigateToAssets={() => onNavigate("assets")}
      onNavigateToPlanner={() => onNavigate("planner")}
      onNavigateToRange={() => onNavigate("range")}
      onNavigateToMypage={() => onNavigate("mypage")}
    />
  );
}
