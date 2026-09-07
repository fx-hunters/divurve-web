import type { PlannerGoalItemViewModel } from "./planner-api-types";

interface PlannerJourneyGoalSelectProps {
  readonly goals: readonly PlannerGoalItemViewModel[];
  readonly selectedGoalId: string;
  readonly onSelect: (goalId: string) => void;
  readonly onContinue: () => void;
}

export function PlannerJourneyGoalSelect({
  goals,
  selectedGoalId,
  onSelect,
  onContinue,
}: PlannerJourneyGoalSelectProps) {
  return (
    <section className="planner-api-journey__scene" aria-labelledby="planner-api-goal-question">
    <p className="planner-api-journey__eyebrow">1 / 5 목표 선택</p>
    <h2 id="planner-api-goal-question">어떤 외화 목표를 이어갈까요?</h2>
    <p className="planner-api-journey__lead">등록된 목표만 표시합니다.</p>
    <div className="planner-api-goal-select" role="list">
      {goals.map((goal) => (
        <button key={goal.id} type="button" className="planner-api-goal-select__item" aria-pressed={goal.id === selectedGoalId} onClick={() => onSelect(goal.id)}>
          <span className="planner-api-goal-select__copy">
            <strong>{goal.name}</strong>
            <small>{goal.heldAmountLabel} · 목표 {goal.targetAmountLabel}</small>
            <small>{goal.targetDateLabel}</small>
          </span>
          <span className="planner-api-goal-select__currency">{goal.currencyCode}</span>
        </button>
      ))}
    </div>
      <button type="button" className="planner-api-journey__primary" onClick={onContinue}>현재 상태 보기</button>
    </section>
  );
}
