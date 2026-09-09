/**
 * 계획 이력 장면.
 *
 * 데이터 취득은 훅에 맡기고(§7.2 container), 표시는 `PlanVersionList` 와
 * 공용 `AiExplanation` 이 담당한다.
 */
import { AiExplanation } from "../../components/ai/ai-explanation";
import { Spinner } from "../../components/common/spinner";
import {
  useAiExplanation,
  type ExplanationFacts,
  type ExplanationRequester,
} from "../../hooks/use-ai-explanation";
import { PlanVersionList } from "./plan-version-list";
import {
  usePlanVersions,
  type PlanVersionDependencies,
} from "./use-plan-versions";

interface PlannerPlanHistoryProps {
  readonly goalId: string;
  readonly goalName: string;
  readonly currencyCode: string;
  readonly facts: ExplanationFacts | null;
  readonly dependencies?: PlanVersionDependencies;
  readonly explanationRequester?: ExplanationRequester;
  readonly onBack: () => void;
}

export function PlannerPlanHistory({
  goalId,
  goalName,
  currencyCode,
  facts,
  dependencies,
  explanationRequester,
  onBack,
}: PlannerPlanHistoryProps) {
  const { state, detailState, reload, selectVersion, clearSelection } =
    usePlanVersions(goalId, dependencies);
  const explanation = useAiExplanation({
    surface: "planner_plan_summary",
    facts,
    requester: explanationRequester,
  });

  return (
    <section
      className="planner-api-journey__scene"
      aria-labelledby="planner-api-history-question"
    >
      <p className="planner-api-journey__eyebrow">계획 이력</p>
      <h2 id="planner-api-history-question">
        {goalName}의 계획 버전을 확인하세요
      </h2>

      <AiExplanation
        state={explanation.state}
        onRetry={explanation.reload}
        title="이 계획 요약"
        loadingIndicator={<Spinner size={20} label="설명 불러오는 중" />}
      />

      <PlanVersionList
        state={state}
        detailState={detailState}
        currencyCode={currencyCode}
        onRetry={reload}
        onSelect={selectVersion}
        onCloseDetail={clearSelection}
      />

      <div className="planner-api-journey__buttons">
        <button
          type="button"
          className="planner-api-journey__secondary"
          onClick={onBack}
        >
          현재 계획으로 돌아가기
        </button>
      </div>
    </section>
  );
}
