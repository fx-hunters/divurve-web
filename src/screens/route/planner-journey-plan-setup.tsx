import type { PlannerPlanSummaryViewModel } from "./planner-api-types";

interface PlannerJourneyPlanSetupProps {
  readonly plan: PlannerPlanSummaryViewModel;
  readonly isPending: boolean;
  readonly onCreate: () => void;
  readonly onBack: () => void;
}

export function PlannerJourneyPlanSetup({
  plan,
  isPending,
  onCreate,
  onBack,
}: PlannerJourneyPlanSetupProps) {
  return (
    <section
      className="planner-api-journey__scene"
      aria-labelledby="planner-api-preview-title"
    >
      <p className="planner-api-journey__eyebrow">2 / 3 계획 미리보기</p>
      <h2 id="planner-api-preview-title">이 계획을 만들기 전에 확인해 주세요</h2>
      <p className="planner-api-journey__lead">
        서버가 계산한 미리보기이며 아직 활성 계획으로 저장되지 않았습니다.
      </p>
      <dl className="planner-api-plan-preview__facts">
        <div>
          <dt>계획 종료일</dt>
          <dd>{plan.planEndDateLabel}</dd>
        </div>
        <div>
          <dt>전체 회차</dt>
          <dd>{plan.totalRounds}회</dd>
        </div>
        <div>
          <dt>비용 범위</dt>
          <dd>{plan.estimatedCostLabel ?? "서버 응답에 없음"}</dd>
        </div>
      </dl>
      <p className="planner-api__notice">{plan.disclaimer}</p>
      <div className="planner-api-journey__buttons">
        <button
          type="button"
          className="planner-api-journey__secondary"
          disabled={isPending}
          onClick={onBack}
        >
          현재 상태로
        </button>
        <button
          type="button"
          className="planner-api-journey__primary"
          disabled={isPending}
          onClick={onCreate}
        >
          {isPending ? "계획을 만드는 중…" : "이 계획 만들기"}
        </button>
      </div>
    </section>
  );
}
