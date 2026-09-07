import type { RefObject } from "react";
import type { PlannerScenarioComparisonViewModel } from "./planner-api-types";

interface ConfirmProps {
  readonly comparison: PlannerScenarioComparisonViewModel;
  readonly isPending: boolean;
  readonly onBack: () => void;
  readonly onApply: () => void;
}

export function PlannerJourneyConfirm({
  comparison,
  isPending,
  onBack,
  onApply,
}: ConfirmProps) {
  return (
    <section
      className="planner-api-journey__scene"
      aria-labelledby="planner-confirm-title"
    >
      <p className="planner-api-journey__eyebrow">최종 확인</p>
      <h2 id="planner-confirm-title">이 변경 계획을 적용할까요?</h2>
      <p className="planner-api-journey__lead">
        {comparison.label} · {comparison.nextAction}
      </p>
      <p className="planner-api__notice">
        이 버튼을 누르기 전까지 현재 활성 계획은 변경되지 않습니다.
      </p>
      <div className="planner-api-journey__buttons">
        <button
          type="button"
          className="planner-api-journey__secondary"
          disabled={isPending}
          onClick={onBack}
        >
          비교로 돌아가기
        </button>
        <button
          type="button"
          className="planner-api-journey__primary"
          disabled={isPending}
          onClick={onApply}
        >
          {isPending ? "적용하는 중…" : "이 계획 적용"}
        </button>
      </div>
    </section>
  );
}

interface ResultProps {
  readonly title: string;
  readonly onGoals: () => void;
  readonly onCurve: () => void;
}

export function PlannerJourneyResult({ title, onGoals, onCurve }: ResultProps) {
  return (
    <section
      className="planner-api-journey__scene"
      aria-labelledby="planner-result-title"
    >
      <p className="planner-api-journey__eyebrow">처리 결과</p>
      <h2 id="planner-result-title">{title}</h2>
      <p className="planner-api-journey__lead">
        최신 Curve와 다음 행동을 다시 확인할 수 있습니다.
      </p>
      <div className="planner-api-journey__buttons">
        <button
          type="button"
          className="planner-api-journey__secondary"
          onClick={onGoals}
        >
          다른 목표 보기
        </button>
        <button
          type="button"
          className="planner-api-journey__primary"
          onClick={onCurve}
        >
          최신 Curve 확인
        </button>
      </div>
    </section>
  );
}

export function PlannerJourneyNoPlan({ onBack }: { readonly onBack: () => void }) {
  return (
    <section className="planner-api-journey__scene">
      <p className="planner-api-journey__eyebrow">활성 계획</p>
      <h2>이 목표에는 활성 계획이 없습니다</h2>
      <p className="planner-api-journey__lead">
        서버가 계획 미리보기를 지원하지 않아 목표 정보만 확인할 수 있습니다.
      </p>
      <button
        type="button"
        className="planner-api-journey__secondary"
        onClick={onBack}
      >
        현재 상태로
      </button>
    </section>
  );
}

interface NoActionProps {
  readonly detailButtonRef: RefObject<HTMLButtonElement>;
  readonly onDetail: () => void;
}

export function PlannerJourneyNoAction({
  detailButtonRef,
  onDetail,
}: NoActionProps) {
  return (
    <section className="planner-api-journey__scene">
      <p className="planner-api-journey__eyebrow">4 / 5 다음 행동</p>
      <h2>남은 회차가 없습니다</h2>
      <p className="planner-api-journey__lead">
        전체 계획 상세에서 완료된 회차를 확인할 수 있습니다.
      </p>
      <button
        ref={detailButtonRef}
        type="button"
        className="planner-api-journey__primary"
        onClick={onDetail}
      >
        전체 계획 상세 보기
      </button>
    </section>
  );
}
