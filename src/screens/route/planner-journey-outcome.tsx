import type { RefObject } from "react";

interface NoActionProps {
  readonly detailButtonRef: RefObject<HTMLButtonElement>;
  readonly onDetail: () => void;
}

export function PlannerJourneyNoAction({
  detailButtonRef,
  onDetail,
}: NoActionProps) {
  return (
    <section className="planner-main-action">
      <p className="planner-api-journey__eyebrow">다음 행동</p>
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
