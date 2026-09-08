import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlannerCurveViewModel, PlannerStepViewModel } from "./planner-api-types";
import { PlannerJourneyCurve } from "./planner-journey-curve";

const steps: readonly PlannerStepViewModel[] = [
  { sequence: 1, sequenceLabel: "1회차", scheduledDate: "2026-01-01", amount: 10, amountLabel: "10 USD", budgetLabel: null, estimatedCostLabel: null, executedAmount: null, cumulativeAmount: 10, cumulativeAmountLabel: "10 USD", actionLabel: "완료 확인", calculationBasis: "실행 금액 반영", status: "completed", statusLabel: "완료" },
  { sequence: 2, sequenceLabel: "2회차", scheduledDate: "2026-01-02", amount: 20, amountLabel: "20 USD", budgetLabel: null, estimatedCostLabel: null, executedAmount: null, cumulativeAmount: 30, cumulativeAmountLabel: "30 USD", actionLabel: "준비 확인", calculationBasis: "계획 금액 반영", status: "next", statusLabel: "다음 회차" },
];
const curve: PlannerCurveViewModel = {
  viewBox: "0 0 1000 440",
  accessibleLabel: "가로축은 날짜, 세로축은 누적 확보 외화 금액인 계획 경로입니다.",
  path: "M 92 354 L 960 42",
  actualPath: null,
  plannedPath: "M 92 354 L 960 42",
  nodes: [
    { id: "one", sequence: 1, x: 92, y: 250, status: "completed", statusLabel: "완료", roundLabel: "1회차", date: "2026-01-01", dateLabel: "2026. 1. 1.", cumulativeAmount: 10, cumulativeAmountLabel: "10 USD", roundAmount: 10, roundAmountLabel: "10 USD", actionLabel: "완료 확인" },
    { id: "two", sequence: 2, x: 960, y: 42, status: "next", statusLabel: "다음 회차", roundLabel: "2회차", date: "2026-01-02", dateLabel: "2026. 1. 2.", cumulativeAmount: 30, cumulativeAmountLabel: "30 USD", roundAmount: 20, roundAmountLabel: "20 USD", actionLabel: "준비 확인" },
  ],
  destination: null,
  currentPoint: { x: 92, y: 250, date: "2026-01-01", dateLabel: "2026. 1. 1.", amount: 10, amountLabel: "10 USD" },
  targetLineY: null,
  yTicks: [{ y: 354, label: "0 USD" }, { y: 42, label: "30 USD" }],
  xStartLabel: "2026. 1. 1.",
  xEndLabel: "2026. 1. 2.",
  dataNotice: null,
  currencyCode: "USD",
  allocatedAmount: 0,
  targetAmount: null,
  targetDate: null,
  currentDate: "2026-01-01",
  domain: { minDate: 1, maxDate: 2, maxAmount: 30 },
};
function renderCurve(selectedSequence: number | null, items = steps, model = curve) { const onSelect = vi.fn(); const onBack = vi.fn(); const onContinue = vi.fn(); render(<PlannerJourneyCurve curve={model} steps={items} selectedSequence={selectedSequence} onSelect={onSelect} onBack={onBack} onContinue={onContinue} />); return { onSelect, onBack, onContinue }; }

describe("PlannerJourneyCurve", () => {
  it("invalid selected sequence falls back to next node", () => { renderCurve(99); expect(screen.getByRole("status")).toHaveTextContent("2회차"); });
  it("falls back to first node when next node is absent", () => { renderCurve(null, [steps[0]!], { ...curve, nodes: [curve.nodes[0]!] }); expect(screen.getByRole("status")).toHaveTextContent("1회차"); });
  it("renders empty curve without a native SVG title tooltip", () => { renderCurve(null, [], { ...curve, path: "", actualPath: null, plannedPath: null, nodes: [], currentPoint: null }); expect(screen.queryByRole("status")).not.toBeInTheDocument(); expect(screen.getByRole("img", { name: /계획 경로/ })).toHaveAccessibleDescription(/가로축은 날짜/); expect(document.querySelector("title")).toBeNull(); });
  it("selects nodes by mouse, Enter and Space only", () => { const { onSelect } = renderCurve(null); const second = screen.getByRole("button", { name: /2회차/ }); fireEvent.click(second); fireEvent.keyDown(second, { key: "Enter" }); fireEvent.keyDown(second, { key: " " }); fireEvent.keyDown(second, { key: "ArrowRight" }); expect(onSelect).toHaveBeenCalledTimes(3); expect(onSelect).toHaveBeenCalledWith(2); });
  it("runs back and continue actions", () => { const { onBack, onContinue } = renderCurve(null); fireEvent.click(screen.getByRole("button", { name: "현재 상태" })); fireEvent.click(screen.getByRole("button", { name: "다음 행동 보기" })); expect(onBack).toHaveBeenCalledOnce(); expect(onContinue).toHaveBeenCalledOnce(); });
});
