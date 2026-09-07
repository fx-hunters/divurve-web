import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminFxRateChart, formatFxAxisTick } from "./admin-fx-rate-chart";

describe("formatFxAxisTick", () => {
  it("천단위만 끊고 반올림하지 않는다", () => {
    expect(formatFxAxisTick(1382.4567)).toBe("1,382.4567");
    expect(formatFxAxisTick(null)).toBe("-");
  });
});

describe("AdminFxRateChart", () => {
  it("점이 있으면 차트를 그린다", () => {
    render(
      <AdminFxRateChart
        pairCode="USDKRW"
        points={[
          {
            quoteDate: "2026-09-01",
            rate: 1382.4,
            dataSource: "ECOS",
            fetchedAt: "2026-09-01T10:00:00Z",
          },
        ]}
      />,
    );

    const chart = screen.getByRole("img", { name: "USDKRW 환율 추이" });
    expect(
      chart.querySelector(".recharts-responsive-container"),
    ).toBeInTheDocument();
  });

  it("점이 없으면 안내 문구만 남긴다", () => {
    render(<AdminFxRateChart pairCode="USDKRW" points={[]} />);
    expect(screen.getByText("표시할 점이 없습니다.")).toBeInTheDocument();
  });
});
