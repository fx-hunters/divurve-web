import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlannerCurveViewModel, PlannerStepViewModel } from "./planner-api-types";
import { PlannerJourneyCurve } from "./planner-journey-curve";

const steps: readonly PlannerStepViewModel[] = [
  { sequence: 1, sequenceLabel: "1회차", scheduledDate: "2026-01-01", amount: 10, amountLabel: "10 USD", executedAmount: 10, status: "completed", statusLabel: "완료" },
  { sequence: 2, sequenceLabel: "2회차", scheduledDate: "2026-01-02", amount: 20, amountLabel: "20 USD", executedAmount: 0, status: "next", statusLabel: "다음 회차" },
];
const curve: PlannerCurveViewModel = { path: "M 0 0 L 100 100", nodes: [{ id: "one", sequence: 1, x: 0, y: 0, status: "completed", statusLabel: "완료", roundLabel: "1회차" }, { id: "two", sequence: 2, x: 100, y: 100, status: "next", statusLabel: "다음 회차", roundLabel: "2회차" }], destination: null };
function renderCurve(selectedSequence: number | null, items = steps, model = curve) { const onSelect = vi.fn(); const onBack = vi.fn(); const onContinue = vi.fn(); render(<PlannerJourneyCurve curve={model} steps={items} selectedSequence={selectedSequence} onSelect={onSelect} onBack={onBack} onContinue={onContinue} />); return { onSelect, onBack, onContinue }; }

describe("PlannerJourneyCurve", () => {
  it("invalid selected sequence falls back to next node", () => { renderCurve(99); expect(screen.getByRole("status")).toHaveTextContent("2회차"); });
  it("falls back to first node when next node is absent", () => { renderCurve(null, [steps[0]!], { ...curve, nodes: [curve.nodes[0]!] }); expect(screen.getByRole("status")).toHaveTextContent("1회차"); });
  it("renders empty curve and destination absence", () => { renderCurve(null, [], { path: "", nodes: [], destination: null }); expect(screen.queryByRole("status")).not.toBeInTheDocument(); expect(screen.getByRole("img", { name: /계획 경로/ })).toBeInTheDocument(); });
  it("selects nodes by mouse, Enter and Space only", () => { const { onSelect } = renderCurve(null); const second = screen.getByRole("button", { name: /2회차/ }); fireEvent.click(second); fireEvent.keyDown(second, { key: "Enter" }); fireEvent.keyDown(second, { key: " " }); fireEvent.keyDown(second, { key: "ArrowRight" }); expect(onSelect).toHaveBeenCalledTimes(3); expect(onSelect).toHaveBeenCalledWith(2); });
  it("runs back and continue actions", () => { const { onBack, onContinue } = renderCurve(null); fireEvent.click(screen.getByRole("button", { name: "현재 상태" })); fireEvent.click(screen.getByRole("button", { name: "다음 행동 보기" })); expect(onBack).toHaveBeenCalledOnce(); expect(onContinue).toHaveBeenCalledOnce(); });
});
