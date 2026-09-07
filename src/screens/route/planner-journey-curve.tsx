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
      <path
        className={
          alternativeCurve === null
            ? "planner-api-curve__path"
            : "planner-api-curve__path planner-api-curve__path--muted"
        }
        d={curve.path}
        data-curve-role="current"
      />
      {alternativeCurve !== null && (
        <path
          className="planner-api-curve__path planner-api-curve__path--alternative"
          d={alternativeCurve.path}
          data-curve-role="alternative"
        />
      )}
      {curve.nodes.map((node) => (
        <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
          <g
            className="planner-api-curve__svg-node"
            data-kind={node.status}
            data-changed={changedIds.has(node.id) || undefined}
          >
            <circle r={node.status === "next" ? 5 : 4} />
            <text y="-9">{node.roundLabel}</text>
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
            <rect x="-4" y="-4" width="8" height="8" />
            <text y="-9">{curve.destination.label}</text>
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
        이 선은 환율 움직임이 아니라 목표까지 이어지는 계획 순서입니다.
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
      {selected !== undefined && (
        <div className="planner-api-curve__selection" role="status">
          <strong>{selected.sequenceLabel}</strong>
          <span>
            {selected.scheduledDate} · {selected.amountLabel} ·{" "}
            {selected.statusLabel}
          </span>
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
