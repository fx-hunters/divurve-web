import { ProgressBar } from "../../components/common/progress-bar";
import type { PlannerGoalSummaryViewModel } from "./planner-api-types";

interface PlannerJourneyStatusProps {
  readonly goal: PlannerGoalSummaryViewModel;
  readonly onContinue: () => void;
  readonly onBack: () => void;
  readonly onHistory?: () => void;
}

export function PlannerJourneyStatus({ goal, onContinue, onBack, onHistory }: PlannerJourneyStatusProps) {
  return (
    <section className="planner-api-journey__scene" aria-labelledby="planner-api-status-question">
    <p className="planner-api-journey__eyebrow">2 / 5 현재 상태</p>
    <h2 id="planner-api-status-question">{goal.name}의 현재 위치입니다</h2>
    <dl className="planner-api-status__facts">
      <div><dt>목표</dt><dd>{goal.targetAmountLabel}</dd></div>
      <div><dt>현재 확보</dt><dd>{goal.heldAmountLabel}</dd></div>
      <div><dt>목표일</dt><dd>{goal.targetDateLabel}</dd></div>
    </dl>
    <ProgressBar ratio={goal.progressPercent} label={goal.progressLabel} />
      <div className="planner-api-journey__buttons">
        <button type="button" className="planner-api-journey__secondary" onClick={onBack}>목표 다시 고르기</button>
        {onHistory !== undefined && (
          <button type="button" className="planner-api-journey__secondary" onClick={onHistory}>계획 이력 보기</button>
        )}
        <button type="button" className="planner-api-journey__primary" onClick={onContinue}>계획 Curve 보기</button>
      </div>
    </section>
  );
}
