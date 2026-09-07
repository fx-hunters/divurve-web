import type { PlannerCurveViewModel, PlannerStepViewModel } from "./planner-api-types";

interface PlannerJourneyCurveProps { readonly curve: PlannerCurveViewModel; readonly steps: readonly PlannerStepViewModel[]; readonly selectedSequence: number | null; readonly onSelect: (sequence: number) => void; readonly onContinue: () => void; readonly onBack: () => void; }

export function PlannerJourneyCurve({ curve, steps, selectedSequence, onSelect, onContinue, onBack }: PlannerJourneyCurveProps) {
  const selected = steps.find((step) => step.sequence === selectedSequence) ?? steps.find((step) => step.status === "next") ?? steps[0];
  return <section className="planner-api-journey__scene planner-api-journey__scene--curve" aria-labelledby="planner-api-curve-question">
    <p className="planner-api-journey__eyebrow">3 / 5 전체 계획</p><h2 id="planner-api-curve-question">계획 Curve를 따라 다음 회차를 확인하세요</h2>
    <div className="planner-api-curve" role="region" aria-label="계획 Curve">
      <svg viewBox="0 0 100 100" role="img" aria-labelledby="planner-api-curve-title planner-api-curve-desc" preserveAspectRatio="none"><title id="planner-api-curve-title">계획 경로</title><desc id="planner-api-curve-desc">환율 차트가 아닌, 서버가 제공한 계획 회차의 진행 경로입니다.</desc><path className="planner-api-curve__path" d={curve.path} />
        {curve.nodes.map((node) => <g key={node.id} transform={`translate(${node.x} ${node.y})`}><g className="planner-api-curve__svg-node" data-kind={node.status}><circle r={node.status === "next" ? 5 : 4} /><text y="-8">{node.roundLabel}</text></g></g>)}
        {curve.destination && <g transform={`translate(${curve.destination.x} ${curve.destination.y})`}><g className="planner-api-curve__svg-node" data-kind="destination"><rect x="-4" y="-4" width="8" height="8" /><text y="-8">{curve.destination.label}</text></g></g>}
      </svg>
      <div className="planner-api-curve__nodes">{curve.nodes.map((node) => <button key={node.id} type="button" className="planner-api-curve__node" data-kind={node.status} data-selected={node.sequence === selected?.sequence} onClick={() => onSelect(node.sequence)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(node.sequence); } }}>
        <span aria-hidden="true" /><strong>{node.roundLabel}</strong><small>{node.statusLabel}</small>
      </button>)}</div>
    </div>
    {selected && <div className="planner-api-curve__selection" role="status"><strong>{selected.sequenceLabel}</strong><span>{selected.scheduledDate} · {selected.amountLabel} · {selected.statusLabel}</span></div>}
    <div className="planner-api-journey__buttons"><button type="button" className="planner-api-journey__secondary" onClick={onBack}>현재 상태</button><button type="button" className="planner-api-journey__primary" onClick={onContinue}>다음 행동 보기</button></div>
  </section>;
}
