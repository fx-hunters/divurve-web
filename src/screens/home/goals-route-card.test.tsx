import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GoalsRouteCard } from "./goals-route-card";
import type { GoalsRouteData } from "../../types/home";

const GOALS: GoalsRouteData = {
  isRouteEnabled: true,
  goals: [
    {
      id: "goal-1",
      name: "도쿄 여행",
      currencyCode: "JPY",
      targetAmount: 300_000,
      targetDateLabel: "2026년 12월 20일",
      status: "active",
    },
  ],
};

describe("GoalsRouteCard", () => {
  it("목표 목록과 플래너 이동 버튼을 렌더링한다", () => {
    const onNavigateToPlanner = vi.fn();
    render(<GoalsRouteCard data={GOALS} onNavigateToPlanner={onNavigateToPlanner} />);

    expect(screen.getByText("도쿄 여행")).toBeInTheDocument();
    expect(screen.getByText("JPY 300,000")).toBeInTheDocument();
    expect(screen.getByText("2026년 12월 20일까지")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "플래너 열기" }));
    expect(onNavigateToPlanner).toHaveBeenCalled();
  });

  it("경로 계산이 꺼져 있으면 준비 중 안내를 보여준다", () => {
    render(
      <GoalsRouteCard data={{ goals: [], isRouteEnabled: false }} />,
    );
    expect(screen.getByText(/환전 경로 계산 기능은 아직/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "플래너 열기" }),
    ).not.toBeInTheDocument();
  });

  it("경로 계산이 켜져 있는데 목표가 없으면 빈 안내를 보여준다", () => {
    render(<GoalsRouteCard data={{ goals: [], isRouteEnabled: true }} />);
    expect(screen.getByText("등록된 목표가 없습니다.")).toBeInTheDocument();
  });
});
