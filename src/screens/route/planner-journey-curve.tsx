import { useId } from "react";
import type {
  PlannerCurveViewModel,
  PlannerStepViewModel,
} from "./planner-api-types";

interface PlannerCurveCanvasProps {
  readonly curve: PlannerCurveViewModel;
  readonly alternativeCurve?: PlannerCurveViewModel | null;
  readonly changedNodeIds?: readonly string[];
}

export function PlannerCurveCanvas({
  curve,
  alternativeCurve = null,
  changedNodeIds = [],
}: PlannerCurveCanvasProps) {
  const descriptionId = useId();
  const changedIds = new Set(changedNodeIds);
  return (
    <svg
      viewBox={curve.viewBox ?? "0 0 100 100"}
      role="img"
      aria-label="계획 경로"
      aria-describedby={descriptionId}
      preserveAspectRatio="xMidYMid meet"
    >
      <desc id={descriptionId}>
        {alternativeCurve?.accessibleLabel ??
          curve.accessibleLabel ??
          "환율 차트가 아닌 계획 회차의 진행 경로입니다."}
      </desc>
      <g className="planner-api-curve__axis" aria-hidden="true">
        {curve.yTicks.map((tick) => (
          <g key={`${tick.y}-${tick.label}`}>
            <line x1="92" x2="960" y1={tick.y} y2={tick.y} />
            <text x="80" y={tick.y + 5}>{tick.label}</text>
          </g>
        ))}
        {curve.xStartLabel !== null && <text x="92" y="410">{curve.xStartLabel}</text>}
        {curve.xEndLabel !== null && <text x="960" y="410" textAnchor="end">{curve.xEndLabel}</text>}
      </g>
      {curve.targetLineY !== null && (
        <g className="planner-api-curve__target-line" aria-hidden="true">
          <line x1="92" x2="960" y1={curve.targetLineY} y2={curve.targetLineY} />
          <text x="960" y={curve.targetLineY - 9} textAnchor="end">목표 금액 기준</text>
        </g>
      )}
      {curve.actualPath !== null && (
        <path
          className="planner-api-curve__path planner-api-curve__path--actual"
          d={curve.actualPath}
          data-curve-role="actual"
        />
      )}
      {curve.plannedPath !== null && (
        <path
          className={
            alternativeCurve === null
              ? "planner-api-curve__path planner-api-curve__path--planned"
              : "planner-api-curve__path planner-api-curve__path--planned planner-api-curve__path--muted"
          }
          d={curve.plannedPath}
          data-curve-role="current"
        />
      )}
      {alternativeCurve !== null && (
        <path
          className="planner-api-curve__path planner-api-curve__path--alternative"
          d={alternativeCurve.plannedPath ?? alternativeCurve.path}
          data-curve-role="alternative"
        />
      )}
      {curve.currentPoint !== null && (
        <g
          className="planner-api-curve__current-point"
          transform={`translate(${curve.currentPoint.x} ${curve.currentPoint.y})`}
          aria-hidden="true"
        >
          <circle r="8" />
          <text y="-15">현재 확보</text>
        </g>
      )}
      {curve.nodes.map((node) => (
        <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
          <g
            className="planner-api-curve__svg-node"
            data-kind={node.status}
            data-changed={changedIds.has(node.id) || undefined}
          >
            <circle r={node.status === "next" ? 9 : 7} />
            {node.status === "completed" && <text className="planner-api-curve__mark" y="5">✓</text>}
            {node.status === "skipped" && <text className="planner-api-curve__mark" y="5">×</text>}
            <text className="planner-api-curve__node-label" y="-17">{node.roundLabel}</text>
            <text className="planner-api-curve__node-date" y="28">{node.dateLabel}</text>
          </g>
        </g>
      ))}
      {curve.destination !== null && (
        <g
          transform={`translate(${curve.destination.x} ${curve.destination.y})`}
        >
          <g
            className="planner-api-curve__svg-node"
            data-kind="destination"
            data-changed={
              changedIds.has(curve.destination.id) || undefined
            }
          >
            <circle r="8" />
            <text className="planner-api-curve__node-label" y="-17">{curve.destination.label}</text>
            <text className="planner-api-curve__node-date" y="28">{curve.destination.targetDateLabel}</text>
          </g>
        </g>
      )}
    </svg>
  );
}

interface PlannerJourneyCurveProps {
  readonly curve: PlannerCurveViewModel;
  readonly steps: readonly PlannerStepViewModel[];
  readonly selectedSequence: number | null;
  readonly onSelect: (sequence: number) => void;
  readonly onContinue: () => void;
  readonly onBack: () => void;
}

export function PlannerJourneyCurve({
  curve,
  steps,
  selectedSequence,
  onSelect,
  onContinue,
  onBack,
}: PlannerJourneyCurveProps) {
  const selected =
    steps.find((step) => step.sequence === selectedSequence) ??
    steps.find((step) => step.status === "next") ??
    steps[0];
  return (
    <section
      className="planner-api-journey__scene planner-api-journey__scene--curve"
      aria-labelledby="planner-api-curve-question"
    >
      <p className="planner-api-journey__eyebrow">3 / 5 전체 계획</p>
      <h2 id="planner-api-curve-question">
        계획 Curve를 따라 다음 회차를 확인하세요
      </h2>
      <p className="planner-api-journey__lead">
        가로축은 날짜, 세로축은 누적 확보 외화입니다. 점선은 환율 전망이 아니라 계획대로 준비했을 때의 금액입니다.
      </p>
      <div className="planner-api-curve" role="region" aria-label="계획 Curve">
        <PlannerCurveCanvas curve={curve} />
        <div className="planner-api-curve__nodes">
          {curve.nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              className="planner-api-curve__node"
              data-kind={node.status}
              data-selected={node.sequence === selected?.sequence}
              aria-label={`${node.roundLabel} ${node.statusLabel}`}
              onClick={() => onSelect(node.sequence)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(node.sequence);
                }
              }}
            >
              <span aria-hidden="true" />
              <strong>{node.roundLabel}</strong>
              <small>{node.statusLabel}</small>
            </button>
          ))}
        </div>
      </div>
      {curve.dataNotice !== null && (
        <p className="planner-api__notice">{curve.dataNotice}</p>
      )}
      {selected !== undefined && (
        <div className="planner-api-curve__selection" role="status">
          <strong>{selected.sequenceLabel}</strong>
          <span>
            {selected.scheduledDate} · 이번 회차 {selected.amountLabel} · 누적 {selected.cumulativeAmountLabel}
          </span>
          <span>{selected.actionLabel} · {selected.calculationBasis}</span>
        </div>
      )}
      <div className="planner-api-journey__buttons">
        <button
          type="button"
          className="planner-api-journey__secondary"
          onClick={onBack}
        >
          현재 상태
        </button>
        <button
          type="button"
          className="planner-api-journey__primary"
          onClick={onContinue}
        >
          다음 행동 보기
        </button>
      </div>
    </section>
  );
}
