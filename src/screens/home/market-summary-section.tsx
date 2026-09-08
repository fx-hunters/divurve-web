/**
 * '오늘의 시장' 컨테이너.
 *
 * 통화쌍 선택 상태를 여기(홈 화면 안)에 두고, 시세 조회와 AI 자연어 설명을
 * 엮어 표현 컴포넌트에 넘긴다(AGENTS.md §7.2·§7.5).
 */
import { AiExplanation } from "../../components/ai/ai-explanation";
import { Spinner } from "../../components/common/spinner";
import {
  useAiExplanation,
  type ExplanationRequester,
} from "../../hooks/use-ai-explanation";
import {
  toDisplaySnapshot,
  toMarketFacts,
  toMarketView,
  type HomeMarketLoader,
  type HomeMarketSnapshot,
} from "./home-market";
import { MarketSummaryCard } from "./market-summary-card";
import { useHomeMarket } from "./use-home-market";

/** 백엔드 `POST /api/v1/ai/explain`의 지면 식별자. */
const EXPLANATION_SURFACE = "home_market_summary";

interface MarketSummarySectionProps {
  /** 홈 요약이 이미 준 시세. 첫 화면은 이 값으로 그리고 다시 조회하지 않는다. */
  readonly summarySnapshot: HomeMarketSnapshot;
  readonly loadMarket?: HomeMarketLoader;
  readonly explainRequester?: ExplanationRequester;
}

export function MarketSummarySection({
  summarySnapshot,
  loadMarket,
  explainRequester,
}: MarketSummarySectionProps) {
  const { pairCode, state, selectPairCode, reload } = useHomeMarket(
    summarySnapshot.pairCode,
    loadMarket,
  );

  const snapshot = toDisplaySnapshot(summarySnapshot, pairCode, state);
  const { state: explanationState, reload: reloadExplanation } =
    useAiExplanation({
      surface: EXPLANATION_SURFACE,
      facts: toMarketFacts(snapshot),
      requester: explainRequester,
    });

  return (
    <MarketSummaryCard
      view={toMarketView(snapshot)}
      isReloading={state.status === "loading"}
      errorMessage={state.status === "error" ? state.message : undefined}
      onSelectPairCode={selectPairCode}
      onRetry={reload}
    >
      <AiExplanation
        state={explanationState}
        onRetry={reloadExplanation}
        title="AI 시장 설명"
        loadingIndicator={<Spinner size={20} label="설명을 정리하는 중" />}
      />
    </MarketSummaryCard>
  );
}
