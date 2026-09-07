import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  HOME_SUMMARY_FIXTURE,
  SPARSE_HOME_SUMMARY_FIXTURE,
} from "../../test/api-fixtures";
import { toHomeDashboardData } from "./home-presenter";
import { TodayHeadlineCard, toBadgeVariant } from "./today-headline-card";

const DATA = toHomeDashboardData(HOME_SUMMARY_FIXTURE);
const SPARSE = toHomeDashboardData(SPARSE_HOME_SUMMARY_FIXTURE);

describe("toBadgeVariant", () => {
  it("뷰 톤을 Badge 변형으로 그대로 넘긴다", () => {
    expect(toBadgeVariant("warn")).toBe("warn");
    expect(toBadgeVariant("default")).toBe("default");
  });
});

describe("TodayHeadlineCard", () => {
  it("헤드라인, 배지, 집중도 판정과 위험성향 등급을 렌더링한다", () => {
    render(
      <TodayHeadlineCard
        today={DATA.today}
        profileFit={DATA.profileFit}
        isProfileMeasured
        asOfLabel={DATA.asOfLabel}
      />,
    );

    expect(screen.getByText("USD 변동성이 평시보다 높습니다.")).toBeInTheDocument();
    expect(screen.getByText("주의")).toBeInTheDocument();
    expect(screen.getByText("위험성향 중립형")).toBeInTheDocument();
    expect(screen.getByText("기준선 초과")).toBeInTheDocument();
    expect(screen.getByText(/기준 시각/)).toBeInTheDocument();
    expect(screen.queryByText(/위험성향을 진단하면/)).not.toBeInTheDocument();
  });

  it("미측정 계정에는 진단 안내와 이동 버튼을 보여준다", () => {
    const onNavigateToMypage = vi.fn();
    render(
      <TodayHeadlineCard
        today={SPARSE.today}
        profileFit={SPARSE.profileFit}
        isProfileMeasured={false}
        asOfLabel={SPARSE.asOfLabel}
        onNavigateToMypage={onNavigateToMypage}
      />,
    );

    expect(screen.getByText(/위험성향을 진단하면/)).toBeInTheDocument();
    expect(screen.queryByText(/위험성향 /)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "진단하러 가기" }));
    expect(onNavigateToMypage).toHaveBeenCalled();
  });

  it("이동 핸들러가 없으면 진단 버튼을 감춘다", () => {
    render(
      <TodayHeadlineCard
        today={SPARSE.today}
        profileFit={SPARSE.profileFit}
        isProfileMeasured={false}
        asOfLabel={SPARSE.asOfLabel}
      />,
    );
    expect(screen.getByText(/위험성향을 진단하면/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "진단하러 가기" }),
    ).not.toBeInTheDocument();
  });
});
