import { useId } from "react";
import type { PlannerCurveViewModel } from "./planner-api-types";

interface PlannerCurveCanvasProps {
  readonly curve: PlannerCurveViewModel;
  readonly alternativeCurve?: PlannerCurveViewModel | null;
  readonly changedNodeIds?: readonly string[];
  readonly selectedSequence?: number | null;
  readonly onSelect?: (sequence: number) => void;
}

function shouldShowNodeLabel(
  index: number,
  nodeCount: number,
  status: PlannerCurveViewModel["nodes"][number]["status"],
  sequence: number,
  selectedSequence: number | null,
): boolean {
  if (nodeCount <= 8) return true;
  if (
    index === 0 ||
    index === nodeCount - 1 ||
    status === "next" ||
    sequence === selectedSequence
  ) {
    return true;
  }
  const interval = nodeCount > 32 ? 8 : 4;
  return (index + 1) % interval === 0;
}

export function PlannerCurveCanvas({
  curve,
  alternativeCurve = null,
  changedNodeIds = [],
  selectedSequence = null,
  onSelect,
}: PlannerCurveCanvasProps) {
  const descriptionId = useId();
  const changedIds = new Set(changedNodeIds);
  const isCurrentLabelCrowded =
    curve.currentPoint !== null &&
    curve.nodes.some(
      (node) =>
        Math.abs(node.x - curve.currentPoint!.x) < 72 &&
        Math.abs(node.y - curve.currentPoint!.y) < 48,
    );
  const isDestinationLabelCrowded =
    curve.destination !== null &&
    curve.nodes.some(
      (node) =>
        Math.abs(node.x - curve.destination!.x) < 72 &&
        Math.abs(node.y - curve.destination!.y) < 48,
    );
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
          <text y={isCurrentLabelCrowded ? -76 : -25}>현재 확보</text>
        </g>
      )}
      {curve.nodes.map((node, index) => (
        <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
          <g
            className="planner-api-curve__svg-node"
            data-kind={node.status}
            data-changed={changedIds.has(node.id) || undefined}
            data-selected={node.sequence === selectedSequence || undefined}
            role={onSelect === undefined ? undefined : "button"}
            tabIndex={onSelect === undefined ? undefined : 0}
            aria-label={
              onSelect === undefined
                ? undefined
                : `${node.roundLabel}, ${node.dateLabel}, 누적 ${node.cumulativeAmountLabel}, ${node.statusLabel}`
            }
            onClick={
              onSelect === undefined
                ? undefined
                : () => onSelect(node.sequence)
            }
            onKeyDown={
              onSelect === undefined
                ? undefined
                : (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(node.sequence);
                    }
                  }
            }
          >
            <circle r={node.status === "next" ? 9 : 7} />
            {node.status === "completed" && <text className="planner-api-curve__mark" y="5">✓</text>}
            {node.status === "skipped" && <text className="planner-api-curve__mark" y="5">×</text>}
            {shouldShowNodeLabel(
              index,
              curve.nodes.length,
              node.status,
              node.sequence,
              selectedSequence,
            ) && (
              <>
                <text className="planner-api-curve__node-label" y="-17">{node.roundLabel}</text>
                <text className="planner-api-curve__node-date" y="28">{node.dateLabel}</text>
              </>
            )}
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
            <text
              className="planner-api-curve__node-label"
              x="-8"
              y={isDestinationLabelCrowded ? 64 : 36}
            >
              {curve.destination.label}
            </text>
            <text
              className="planner-api-curve__node-date"
              x="-8"
              y={isDestinationLabelCrowded ? 96 : 64}
            >
              {curve.destination.targetDateLabel}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}
