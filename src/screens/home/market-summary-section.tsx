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
import { usePersistedToggle } from "../../hooks/use-persisted-toggle";
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

/**
 * 접기 선택을 기억할 자리. 지면마다 달라야 해서 surface 를 키에 넣는다.
 *
 * 기본값이 '펼침'인 이유: 접어 두면 대부분 펼치지 않는다. 이 설명은 숫자만
 * 있는 화면과 이 서비스를 가르는 부분이라 처음부터 보이는 편이 낫고, 원치
 * 않는 사용자는 한 번 접으면 다음부터 접힌 채로 열린다.
 */
export const EXPLANATION_TOGGLE_STORAGE_KEY = `divurve_ai_explanation_open:${EXPLANATION_SURFACE}`;

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

  // 접기/펼치기 상태를 카드 바깥에 둔다. 설명이 접히면 그 자리를 추세 그래프가
  // 가져가므로 카드가 함께 다시 그려져야 한다.
  const { isOpen: isExplanationOpen, toggle: toggleExplanation } =
    usePersistedToggle(EXPLANATION_TOGGLE_STORAGE_KEY, true);

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
        isOpen={isExplanationOpen}
        onToggle={toggleExplanation}
        loadingIndicator={<Spinner size={20} label="설명을 정리하는 중" />}
      />
    </MarketSummaryCard>
  );
}
