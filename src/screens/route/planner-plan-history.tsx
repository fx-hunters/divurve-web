/**
 * 계획 이력 장면.
 *
 * 데이터 취득은 훅에 맡기고(§7.2 container), 표시는 `PlanVersionList` 가 담당한다.
 * Planner AI 설명 연결은 별도 계약 검수 뒤 진행한다.
 */
import { PlanVersionList } from "./plan-version-list";
import {
  usePlanVersions,
  type PlanVersionDependencies,
} from "./use-plan-versions";

interface PlannerPlanHistoryProps {
  readonly goalId: string;
  readonly goalName: string;
  readonly currencyCode: string;
  readonly dependencies?: PlanVersionDependencies;
  readonly onBack: () => void;
}

export function PlannerPlanHistory({
  goalId,
  goalName,
  currencyCode,
  dependencies,
  onBack,
}: PlannerPlanHistoryProps) {
  const { state, detailState, reload, selectVersion, clearSelection } =
    usePlanVersions(goalId, dependencies);

  return (
    <section
      className="planner-api-journey__scene"
      aria-labelledby="planner-api-history-question"
    >
      <p className="planner-api-journey__eyebrow">계획 이력</p>
      <h2 id="planner-api-history-question">
        {goalName}의 계획 버전을 확인하세요
      </h2>

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
