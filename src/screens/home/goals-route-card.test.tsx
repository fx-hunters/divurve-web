import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GoalsRouteCard } from "./goals-route-card";
import type { GoalsRouteData } from "../../types/home";

const GOALS: GoalsRouteData = {
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

  it("목표가 없으면 빈 안내만 보여주고, 준비 중 안내는 더 이상 없다", () => {
    render(<GoalsRouteCard data={{ goals: [] }} />);

    expect(screen.getByText(/등록된 목표가 없습니다/)).toBeInTheDocument();
    expect(screen.queryByText(/준비 중/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "플래너 열기" }),
    ).not.toBeInTheDocument();
  });

  // 목표 수만큼 카드가 길어지면 옆 카드와의 배치가 흔들린다. 목록에 최대
  // 높이를 두고 넘치는 만큼은 스크롤로 담는다.
  it("목표 목록을 키보드로 훑을 수 있는 스크롤 영역에 담는다", () => {
    const { container } = render(<GoalsRouteCard data={GOALS} />);

    const list = container.querySelector(".goals-route-card__list");
    expect(list).toHaveAttribute("tabindex", "0");
    expect(list).toHaveAttribute("aria-label", "목표 1개, 마감이 이른 순");
  });

  it("목표가 둘 이상이면 정렬 기준을 부제로 알린다", () => {
    const two = {
      goals: [
        GOALS.goals[0]!,
        { ...GOALS.goals[0]!, id: "goal-2", name: "유럽 여행" },
      ],
    };
    const { rerender } = render(<GoalsRouteCard data={two} />);
    expect(screen.getByText("마감이 이른 순")).toBeInTheDocument();

    // 하나뿐이면 순서를 말할 것이 없다.
    rerender(<GoalsRouteCard data={GOALS} />);
    expect(screen.queryByText("마감이 이른 순")).not.toBeInTheDocument();
  });
});
