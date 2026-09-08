import { useEffect, useRef } from "react";
import type { PlannerPlanSummaryViewModel, PlannerStepViewModel } from "./planner-api-types";

interface PlannerJourneyDetailProps { readonly plan: PlannerPlanSummaryViewModel; readonly steps: readonly PlannerStepViewModel[]; readonly onClose: () => void; readonly returnFocus: HTMLElement | null; }
export function PlannerJourneyDetail({ plan, steps, onClose, returnFocus }: PlannerJourneyDetailProps) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeButton.current?.focus(); const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", handleKey); return () => { window.removeEventListener("keydown", handleKey); returnFocus?.focus(); }; }, [onClose, returnFocus]);
  return <div className="planner-api-detail" role="dialog" aria-modal="true" aria-labelledby="planner-api-detail-title"><button className="planner-api-detail__backdrop" type="button" aria-label="상세 닫기" onClick={onClose} /><section className="planner-api-detail__sheet"><div className="planner-api-detail__header"><div><p className="planner-api-journey__eyebrow">5 / 5 계획 상세</p><h2 id="planner-api-detail-title">활성 계획 {plan.versionLabel}</h2></div><button ref={closeButton} type="button" aria-label="상세 닫기" onClick={onClose}>×</button></div>
    <dl className="planner-api-detail__facts">
      <div><dt>계획 상태</dt><dd>{plan.statusLabel}</dd></div>
      <div><dt>전체 회차</dt><dd>{plan.totalRounds}회</dd></div>
      <div><dt>완료 회차</dt><dd>{plan.completedRounds}회</dd></div>
      <div><dt>건너뛴 회차</dt><dd>{plan.skippedRounds}회</dd></div>
      <div><dt>계획 종료일</dt><dd>{plan.planEndDateLabel}</dd></div>
      <div><dt>예상 원화 비용</dt><dd>{plan.estimatedCostLabel}</dd></div>
      <div><dt>예산 상태</dt><dd>{plan.budgetStateLabel}</dd></div>
    </dl>
    {plan.warnings.length > 0 && <ul className="planner-api-detail__warnings" aria-label="계획 경고">{plan.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
    <p className="planner-api-detail__disclaimer">{plan.disclaimer}</p>
    <ol className="planner-api-detail__steps">{steps.map((step) => <li key={step.sequence}><strong>{step.sequenceLabel}</strong><span>{step.scheduledDate} · {step.amountLabel}</span><small>{step.statusLabel}</small></li>)}</ol></section></div>;
}
