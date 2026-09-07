import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketSummaryCard } from "./market-summary-card";

describe("MarketSummaryCard", () => {
  it("현재 환율과 80% 범위를 렌더링한다", () => {
    render(
      <MarketSummaryCard
        data={{
          pairLabel: "USDKRW",
          currentRateLabel: "1,382.40",
          lowerLabel: "1,330.60",
          upperLabel: "1,389.02",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "오늘의 시장 (USDKRW)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1,382.40")).toBeInTheDocument();
    expect(screen.getByText("80% 범위 1,330.60 - 1,389.02")).toBeInTheDocument();
  });

  it("현재 환율과 범위가 없으면 안내 문구만 보여준다", () => {
    render(<MarketSummaryCard data={{ pairLabel: "-" }} />);
    expect(
      screen.getByText("현재 환율을 불러오지 못했습니다."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/80% 범위/)).not.toBeInTheDocument();
  });
});
