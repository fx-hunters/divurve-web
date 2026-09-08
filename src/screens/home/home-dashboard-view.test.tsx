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

  it("'오늘의 시장'을 중앙 상단에, 나머지 카드를 그 아래 그리드에 배치한다", () => {
    const { container } = render(
      <HomeDashboardView
        data={toHomeDashboardData(HOME_SUMMARY_FIXTURE)}
        marketSlot={MARKET_SLOT}
      />,
    );

    const root = container.querySelector(".home-dashboard");
    const children = Array.from(root?.children ?? []);
    expect(children.map((child) => child.className)).toEqual([
      "home-dashboard__market",
      "home-dashboard__cards",
    ]);
    // 주의 필요 배너만 그리드 한 줄을 다 쓴다.
    expect(container.querySelectorAll(".home-dashboard__cell")).toHaveLength(4);
    expect(
      container.querySelectorAll(".home-dashboard__cell--wide"),
    ).toHaveLength(1);
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
});
