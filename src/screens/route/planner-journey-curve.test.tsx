import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlannerCurveViewModel } from "./planner-api-types";
import { PlannerCurveCanvas } from "./planner-journey-curve";

const curve: PlannerCurveViewModel = {
  viewBox: "0 0 1000 440",
  accessibleLabel:
    "가로축은 날짜, 세로축은 누적 확보 외화 금액인 계획 경로입니다.",
  path: "M 92 354 L 960 42",
  actualPath: "M 92 354 L 250 280",
  plannedPath: "M 250 280 L 960 42",
  nodes: [
    {
      id: "one",
      sequence: 1,
      x: 250,
      y: 280,
      status: "completed",
      statusLabel: "완료",
      roundLabel: "1회차",
      date: "2026-01-01",
      dateLabel: "2026. 1. 1.",
      cumulativeAmount: 10,
      cumulativeAmountLabel: "10 USD",
      roundAmount: 10,
      roundAmountLabel: "10 USD",
      actionLabel: "완료 확인",
    },
    {
      id: "two",
      sequence: 2,
      x: 600,
      y: 160,
      status: "skipped",
      statusLabel: "건너뜀",
      roundLabel: "2회차",
      date: "2026-02-01",
      dateLabel: "2026. 2. 1.",
      cumulativeAmount: 10,
      cumulativeAmountLabel: "10 USD",
      roundAmount: 20,
      roundAmountLabel: "20 USD",
      actionLabel: "계획 점검",
    },
    {
      id: "three",
      sequence: 3,
      x: 800,
      y: 90,
      status: "next",
      statusLabel: "다음 행동",
      roundLabel: "3회차",
      date: "2026-03-01",
      dateLabel: "2026. 3. 1.",
      cumulativeAmount: 30,
      cumulativeAmountLabel: "30 USD",
      roundAmount: 20,
      roundAmountLabel: "20 USD",
      actionLabel: "외화 준비",
    },
  ],
  destination: {
    id: "destination",
    x: 960,
    y: 42,
    status: "destination",
    statusLabel: "목표 기준",
    label: "목표 도착",
    targetDateLabel: "2026. 4. 1.",
    targetAmountLabel: "40 USD",
  },
  currentPoint: {
    x: 92,
    y: 354,
    date: "2025-12-01",
    dateLabel: "2025. 12. 1.",
    amount: 0,
    amountLabel: "0 USD",
  },
  targetLineY: 42,
  yTicks: [
    { y: 354, label: "0 USD" },
    { y: 42, label: "40 USD" },
  ],
  xStartLabel: "2025. 12. 1.",
  xEndLabel: "2026. 4. 1.",
  dataNotice: null,
  currencyCode: "USD",
  baselineAmount: 0,
  currentAmount: 0,
  targetAmount: 40,
  targetDate: "2026-04-01",
  currentDate: "2025-12-01",
  domain: { minDate: 1, maxDate: 2, maxAmount: 40 },
};

describe("PlannerCurveCanvas", () => {
  it("실제·계획 경로와 금액·날짜 축을 접근 가능한 SVG로 표시한다", () => {
    const { container } = render(<PlannerCurveCanvas curve={curve} />);

    expect(screen.getByRole("img", { name: "계획 경로" })).toHaveAccessibleDescription(
      /가로축은 날짜/,
    );
    expect(container.querySelector('[data-curve-role="actual"]')).toHaveAttribute(
      "d",
      curve.actualPath,
    );
    expect(container.querySelector('[data-curve-role="current"]')).toHaveAttribute(
      "d",
      curve.plannedPath,
    );
    expect(screen.getByText("목표 금액 기준")).toBeInTheDocument();
    expect(screen.getByText("현재 확보")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
    expect(screen.getByText("×")).toBeInTheDocument();
    expect(screen.getByText("목표 도착")).toBeInTheDocument();
    expect(screen.getByText("현재 확보")).toHaveAttribute("y", "-15");
    expect(document.querySelector("title")).toBeNull();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("대체 경로와 변경·선택 지점을 같은 축 위에 구분한다", () => {
    const onSelect = vi.fn();
    const alternative: PlannerCurveViewModel = {
      ...curve,
      accessibleLabel: "변경안 누적 금액 경로입니다.",
      path: "M 250 280 L 960 80",
      plannedPath: null,
    };
    const { container } = render(
      <PlannerCurveCanvas
        curve={curve}
        alternativeCurve={alternative}
        changedNodeIds={["two", "destination"]}
        selectedSequence={2}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByRole("img")).toHaveAccessibleDescription(
      "변경안 누적 금액 경로입니다.",
    );
    expect(container.querySelector('[data-curve-role="current"]')).toHaveClass(
      "planner-api-curve__path--muted",
    );
    expect(container.querySelector('[data-curve-role="alternative"]')).toHaveAttribute(
      "d",
      alternative.path,
    );
    expect(container.querySelector('[data-selected="true"]')).toHaveTextContent("2회차");
    expect(container.querySelectorAll('[data-changed="true"]')).toHaveLength(2);

    const nextNode = screen.getByRole("button", {
      name: /3회차.*누적 30 USD.*다음 행동/,
    });
    fireEvent.click(nextNode);
    fireEvent.keyDown(nextNode, { key: "Enter" });
    fireEvent.keyDown(nextNode, { key: " " });
    fireEvent.keyDown(nextNode, { key: "ArrowRight" });
    expect(onSelect).toHaveBeenCalledTimes(3);
    expect(onSelect).toHaveBeenLastCalledWith(3);
  });

  it("축·경로 데이터가 없으면 기본 크기와 설명만 안전하게 표시한다", () => {
    const empty: PlannerCurveViewModel = {
      ...curve,
      viewBox: undefined,
      accessibleLabel: undefined,
      path: "",
      actualPath: null,
      plannedPath: null,
      nodes: [],
      destination: null,
      currentPoint: null,
      targetLineY: null,
      yTicks: [],
      xStartLabel: null,
      xEndLabel: null,
    };
    const { container } = render(<PlannerCurveCanvas curve={empty} />);

    expect(screen.getByRole("img")).toHaveAttribute("viewBox", "0 0 100 100");
    expect(screen.getByRole("img")).toHaveAccessibleDescription(
      "환율 차트가 아닌 계획 회차의 진행 경로입니다.",
    );
    expect(container.querySelector("path")).toBeNull();
  });

  it("회차가 많으면 주요 지점만 라벨을 표시하고 모든 지점은 접근 가능하게 유지한다", () => {
    const nodes = Array.from({ length: 52 }, (_, index) => ({
      ...curve.nodes[2]!,
      id: `many-${index + 1}`,
      sequence: index + 1,
      x: 100 + index * 16,
      y: 300 - index * 4,
      status: index === 25 ? ("next" as const) : ("upcoming" as const),
      statusLabel: index === 25 ? "다음 행동" : "예정",
      roundLabel: `${index + 1}회차`,
    }));
    const { container } = render(
      <PlannerCurveCanvas
        curve={{ ...curve, nodes }}
        selectedSequence={11}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(52);
    expect(container.querySelectorAll(".planner-api-curve__node-label").length).toBeLessThan(12);
    expect(screen.getByText("11회차")).toBeInTheDocument();
    expect(screen.getByText("26회차")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /52회차.*예정/ }),
    ).toBeInTheDocument();
  });

  it("현재와 목표 지점 가까이에 회차가 있으면 라벨 위치를 벌린다", () => {
    const { container } = render(
      <PlannerCurveCanvas
        curve={{
          ...curve,
          nodes: [
            { ...curve.nodes[0]!, x: 100, y: 350 },
            { ...curve.nodes[2]!, x: 950, y: 45 },
          ],
        }}
      />,
    );

    expect(screen.getByText("현재 확보")).toHaveAttribute("y", "-34");
    expect(screen.getByText("목표 도착")).toHaveAttribute("y", "-36");
    expect(
      container.querySelector('.planner-api-curve__node-date[y="40"]'),
    ).toHaveTextContent("2026. 4. 1.");
  });
});
