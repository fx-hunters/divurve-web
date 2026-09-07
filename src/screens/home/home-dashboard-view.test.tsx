import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  EMPTY_HOME_SUMMARY_FIXTURE,
  HOME_SUMMARY_FIXTURE,
} from "../../test/api-fixtures";
import { toHomeDashboardData } from "./home-presenter";
import { HomeDashboardView } from "./home-dashboard-view";

describe("HomeDashboardView", () => {
  it("채워진 블록의 카드를 모두 렌더링한다", () => {
    render(<HomeDashboardView data={toHomeDashboardData(HOME_SUMMARY_FIXTURE)} />);

    expect(screen.getByRole("heading", { name: "오늘의 핵심" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "내 외화 현황" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "내 목표" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /주의 필요/ })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "오늘의 시장 (USDKRW)" }),
    ).toBeInTheDocument();
  });

  it("비어 있는 블록의 카드는 그리지 않는다", () => {
    render(
      <HomeDashboardView data={toHomeDashboardData(EMPTY_HOME_SUMMARY_FIXTURE)} />,
    );

    expect(screen.queryByRole("heading", { name: "오늘의 핵심" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "내 외화 현황" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "내 목표" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /주의 필요/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /오늘의 시장/ })).not.toBeInTheDocument();
  });
});
