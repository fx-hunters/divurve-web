import { Badge } from "../../components/common/badge";
import { Icon } from "../../components/common/icon";
import type {
  PlannerIntroContent,
  PlannerPlan,
  RouteDataNotice,
} from "../../types/route";

interface PlannerIntroProps {
  readonly content: PlannerIntroContent;
  readonly dataNotice: RouteDataNotice;
  readonly plans: readonly [PlannerPlan, ...PlannerPlan[]];
  readonly defaultPlan: PlannerPlan;
  readonly isCreationNoticeVisible: boolean;
  readonly onSelectGoal: (plan: PlannerPlan) => void;
  readonly onShowCreationNotice: () => void;
}

export function PlannerIntro({
  content,
  dataNotice,
  plans,
  defaultPlan,
  isCreationNoticeVisible,
  onSelectGoal,
  onShowCreationNotice,
}: PlannerIntroProps) {
  return (
    <section
      className="planner-intro"
      aria-labelledby="planner-intro-title"
      data-source={dataNotice.source}
    >
      <div className="planner-intro__halo" aria-hidden="true" />

      <header className="planner-intro__header">
        <div className="planner-intro__brand-mark" aria-hidden="true">
          <Icon name="sparkles" size={18} />
        </div>
        <h2 id="planner-intro-title">{content.title}</h2>
        <p className="planner-intro__description">{content.description}</p>
        <Badge variant="primary">{dataNotice.sourceLabel}</Badge>
      </header>

      <div className="planner-intro__goals" aria-label="체험할 외화 목표">
        {plans.map((plan) => {
          const goal = plan.introOption;
          return (
          <button
            type="button"
            className="planner-goal-option"
            data-currency={goal.currencyCode}
            key={goal.id}
            onClick={() => onSelectGoal(plan)}
          >
            <span className="planner-goal-option__topline">
              <Badge>{goal.purposeLabel}</Badge>
              <span className="planner-goal-option__currency">
                {goal.currencyCode}
              </span>
            </span>
            <strong>{goal.name}</strong>
            <span className="planner-goal-option__summary">{goal.summary}</span>
            <span className="planner-goal-option__values">
              <span>{goal.primaryValueLabel}</span>
              <span>{goal.secondaryValueLabel}</span>
            </span>
            <small>{goal.diagnosisNote}</small>
            <span className="planner-goal-option__enter" aria-hidden="true">
              계획 안으로 들어가기 <Icon name="arrowRight" size={16} />
            </span>
          </button>
          );
        })}
      </div>

      <div className="planner-intro__actions">
        <button
          type="button"
          className="route-button route-button--secondary"
          onClick={onShowCreationNotice}
          aria-expanded={isCreationNoticeVisible}
          aria-controls="planner-creation-notice"
        >
          {content.newPlanLabel}
        </button>
        <button
          type="button"
          className="route-button route-button--primary"
          onClick={() => onSelectGoal(defaultPlan)}
        >
          {content.demoActionLabel}
          <Icon name="arrowRight" size={16} />
        </button>
      </div>

      {isCreationNoticeVisible && (
        <p id="planner-creation-notice" className="planner-intro__notice" role="status">
          {content.creationNotice}
        </p>
      )}

      <p className="planner-intro__data-note" role="note">
        {dataNotice.notice}
      </p>
    </section>
  );
}
