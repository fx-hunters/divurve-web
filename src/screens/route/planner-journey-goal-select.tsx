import type { PlannerGoalItemViewModel } from "./planner-api-types";

interface PlannerJourneyGoalSelectProps {
  readonly goals: readonly PlannerGoalItemViewModel[];
  readonly selectedGoalId: string;
  readonly onSelect: (goalId: string) => void;
  readonly onContinue: () => void;
  readonly onCreateGoal: () => void;
  readonly onExploreDemo?: () => void;
  readonly onExitDemo?: () => void;
}

export function PlannerJourneyGoalSelect({
  goals,
  selectedGoalId,
  onSelect,
  onContinue,
  onCreateGoal,
  onExploreDemo,
  onExitDemo,
}: PlannerJourneyGoalSelectProps) {
  const hasGoals = goals.length > 0;
  return (
    <section className="planner-api-journey__scene" aria-labelledby="planner-api-goal-question">
    <p className="planner-api-journey__eyebrow">1 / 5 목표 선택</p>
    <h2 id="planner-api-goal-question">
      {hasGoals ? "어떤 외화 목표를 이어갈까요?" : "첫 외화 목표를 만들어 보세요"}
    </h2>
    <p className="planner-api-journey__lead">
      {hasGoals
        ? "목표 하나를 선택하면 현재 상태와 계획 Curve를 함께 확인할 수 있습니다."
        : "아직 등록된 목표가 없습니다. 목표를 만들거나 데모로 먼저 둘러볼 수 있습니다."}
    </p>
    <div className="planner-api-goal-select" role="list">
      {goals.map((goal) => (
        <button key={goal.id} type="button" className="planner-api-goal-select__item" aria-pressed={goal.id === selectedGoalId} onClick={() => onSelect(goal.id)}>
          <span className="planner-api-goal-select__copy">
            <strong>{goal.name}</strong>
            <small>{goal.heldAmountLabel} · 목표 {goal.targetAmountLabel}</small>
            <small>{goal.targetDateLabel}</small>
            <small>{goal.planStatusLabel}</small>
          </span>
          <span className="planner-api-goal-select__currency">{goal.currencyCode}</span>
          {goal.id === selectedGoalId && (
            <span className="planner-api-goal-select__check" aria-hidden="true">✓</span>
          )}
        </button>
      ))}
    </div>
      <div className="planner-api-journey__buttons">
        {hasGoals && (
          <button type="button" className="planner-api-journey__primary" onClick={onContinue}>선택한 목표 보기</button>
        )}
        <button type="button" className={hasGoals ? "planner-api-journey__secondary" : "planner-api-journey__primary"} onClick={onCreateGoal}>새 목표 만들기</button>
        {onExploreDemo !== undefined && (
          <button type="button" className="planner-api-journey__secondary" onClick={onExploreDemo}>데모로 둘러보기</button>
        )}
        {onExitDemo !== undefined && (
          <button type="button" className="planner-api-journey__secondary" onClick={onExitDemo}>내 계정 플래너로 돌아가기</button>
        )}
      </div>
      {onExploreDemo !== undefined && (
        <p className="planner-api-goal-select__notice">데모는 프론트 예시 데이터를 이 브라우저 화면에서만 사용하며 내 계정에 저장하지 않습니다.</p>
      )}
    </section>
  );
}
