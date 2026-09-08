import type { KeyboardEvent } from "react";
import { Badge } from "../../components/common/badge";
import { ProgressBar } from "../../components/common/progress-bar";
import type {
  PlannerAction,
  PlannerPlan,
  RouteDataNotice,
} from "../../types/route";
import { BucketSection } from "./bucket-section";
import { PlanSummarySection } from "./plan-summary-section";
import { RouteFlow } from "./route-flow";
import { RoundPlanSection } from "./round-plan-section";

interface PlannerDetailDrawerProps {
  readonly plan: PlannerPlan;
  readonly action: PlannerAction;
  readonly dataNotice: RouteDataNotice;
  readonly onClose: () => void;
}

export function PlannerDetailDrawer({
  plan,
  action,
  dataNotice,
  onClose,
}: PlannerDetailDrawerProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      className="planner-detail-drawer"
      onKeyDown={handleKeyDown}
      data-testid="planner-detail-drawer"
    >
      <button
        type="button"
        className="planner-detail-drawer__backdrop"
        aria-label="계획 상세 닫기"
        tabIndex={-1}
        onClick={onClose}
      />
      <aside
        className="planner-detail-drawer__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="planner-detail-title"
      >
        <header className="planner-detail-drawer__header">
          <h2 id="planner-detail-title">계획 자세히 보기</h2>
          <button type="button" autoFocus onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>

        <p className="planner-detail-drawer__notice" role="note">
          <Badge variant="primary">{dataNotice.sourceLabel}</Badge>
          <span>{dataNotice.notice}</span>
        </p>

        <section
          className="planner-detail-drawer__goal"
          aria-labelledby="planner-detail-goal-title"
        >
          <div>
            <p className="route-eyebrow">{plan.goal.currencyCode} 목표</p>
            <h3 id="planner-detail-goal-title">{plan.goal.name}</h3>
          </div>
          <strong>{plan.goal.targetAmountLabel}</strong>
          <dl>
            <div>
              <dt>현재</dt>
              <dd>{plan.goal.securedAmountLabel}</dd>
            </div>
            <div>
              <dt>도착 조건</dt>
              <dd>{plan.goal.targetDateLabel}</dd>
            </div>
            <div>
              <dt>남은 일정</dt>
              <dd>{plan.goal.remainingPeriodLabel}</dd>
            </div>
            <div>
              <dt>{plan.goal.primaryMetricLabel}</dt>
              <dd>{plan.goal.primaryMetricValue}</dd>
            </div>
          </dl>
          <ProgressBar
            ratio={plan.goal.progressPercent}
            color="var(--primary)"
            label={plan.goal.progressLabel}
          />
        </section>

        <RouteFlow steps={plan.flowSteps} />
        <PlanSummarySection plan={plan.plan} action={action} isDetailed />
        <BucketSection buckets={plan.buckets} />
        <RoundPlanSection rounds={plan.rounds} />
      </aside>
    </div>
  );
}
