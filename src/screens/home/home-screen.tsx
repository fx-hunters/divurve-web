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

  /*
   * 로딩이라고 화면을 통째로 가리지 않는다. 카드 제목·이동 버튼·통화쌍
   * 선택은 그대로 세우고, 서버 값이 들어갈 자리만 비워 둔다.
   */
  const result = state.status === "ready" ? state.result : null;

  return (
    <HomeDashboardView
      data={result === null ? null : toHomeDashboardData(result)}
      marketSlot={
        <MarketSummarySection
          summarySnapshot={
            result === null ? null : toSummaryMarketSnapshot(result)
          }
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
