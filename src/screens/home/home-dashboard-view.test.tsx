import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  EMPTY_HOME_SUMMARY_FIXTURE,
  HOME_SUMMARY_FIXTURE,
} from "../../test/api-fixtures";
import { toHomeDashboardData } from "./home-presenter";
import { HomeDashboardView } from "./home-dashboard-view";

const MARKET_SLOT = <p>오늘의 시장 자리</p>;

describe("HomeDashboardView", () => {
  it("채워진 블록의 카드를 모두 렌더링한다", () => {
    render(
      <HomeDashboardView
        data={toHomeDashboardData(HOME_SUMMARY_FIXTURE)}
        marketSlot={MARKET_SLOT}
      />,
    );

    expect(screen.getByRole("heading", { name: "오늘의 핵심" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "내 외화 현황" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "내 목표" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /주의 필요/ })).toBeInTheDocument();
    expect(screen.getByText("오늘의 시장 자리")).toBeInTheDocument();
  });

  // DOM 순서가 곧 모바일 읽기 순서다. 배치는 CSS가 정하므로 여기서는 순서만 본다.
  it("핵심 → 시장 → 오른쪽 기둥 → 일정 순서로 놓는다", () => {
    const { container } = render(
      <HomeDashboardView
        data={toHomeDashboardData(HOME_SUMMARY_FIXTURE)}
        marketSlot={MARKET_SLOT}
      />,
    );

    const root = container.querySelector(".home-dashboard");
    const children = Array.from(root?.children ?? []);
    expect(
      children.map((child) => child.className.split(" ")[1]),
    ).toEqual([
      "home-dashboard__headline",
      "home-dashboard__market",
      // 목표·현황은 이 한 칸 안에 세로로 쌓인다. 그리드 행을 따로 차지하면
      // 시장 카드가 남긴 높이가 둘 사이에 끼어 버린다.
      "home-dashboard__side",
      "home-dashboard__calendar",
    ]);
    expect(container.querySelectorAll(".home-dashboard__cell")).toHaveLength(4);
  });

  it("비어 있는 블록의 카드는 그리지 않는다", () => {
    render(
      <HomeDashboardView
        data={toHomeDashboardData(EMPTY_HOME_SUMMARY_FIXTURE)}
        marketSlot={MARKET_SLOT}
      />,
    );

    expect(screen.queryByRole("heading", { name: "오늘의 핵심" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "내 외화 현황" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "내 목표" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /주의 필요/ })).not.toBeInTheDocument();
    expect(screen.queryByText("오늘의 시장 자리")).not.toBeInTheDocument();
  });

  it("일정 블록이 비면 헤드라인 칩도 올리지 않는다", () => {
    const data = toHomeDashboardData(HOME_SUMMARY_FIXTURE);
    render(
      <HomeDashboardView
        data={{
          ...data,
          blockStates: { ...data.blockStates, attention: "empty" },
        }}
        marketSlot={MARKET_SLOT}
      />,
    );

    expect(screen.queryByRole("heading", { name: /주의 필요/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "다가오는 고변동성 일정" }),
    ).not.toBeInTheDocument();
  });
});
