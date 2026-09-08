import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrendChart } from "./trend-chart";

const FORMAT_RATE = (rate: number) => rate.toFixed(1);
const FORMAT_DATE = (isoDate: string) => isoDate.slice(5);

function points(...rates: readonly number[]) {
  return rates.map((rate, index) => ({
    date: `2026-09-${String(index + 1).padStart(2, "0")}`,
    rate,
  }));
}

describe("TrendChart", () => {
  it("관측점을 시간순 꺾은선으로 그린다", () => {
    const { container } = render(
      <TrendChart
        points={points(1_300, 1_350, 1_400)}
        formatRate={FORMAT_RATE}
        formatDate={FORMAT_DATE}
        label="USD/KRW 최근 3영업일 추세"
      />,
    );

    const line = container.querySelector("polyline");
    // 최솟값은 바닥, 최댓값은 천장에 놓인다.
    expect(line?.getAttribute("points")).toBe("52.0,198.0 262.0,104.0 472.0,10.0");
    expect(
      screen.getByRole("img", { name: "USD/KRW 최근 3영업일 추세" }),
    ).toBeInTheDocument();
  });

  it("세로축에 최소·중간·최대 눈금을 적는다", () => {
    render(
      <TrendChart
        points={points(1_300, 1_400)}
        formatRate={FORMAT_RATE}
        formatDate={FORMAT_DATE}
        label="추세"
      />,
    );

    expect(screen.getByText("1300.0")).toBeInTheDocument();
    expect(screen.getByText("1350.0")).toBeInTheDocument();
    expect(screen.getByText("1400.0")).toBeInTheDocument();
  });

  it("가로축에 처음·가운데·끝 날짜를 적는다", () => {
    render(
      <TrendChart
        points={points(1_300, 1_350, 1_400, 1_360, 1_380)}
        formatRate={FORMAT_RATE}
        formatDate={FORMAT_DATE}
        label="추세"
      />,
    );

    expect(screen.getByText("09-01")).toBeInTheDocument();
    expect(screen.getByText("09-03")).toBeInTheDocument();
    expect(screen.getByText("09-05")).toBeInTheDocument();
    // 나머지는 글자가 겹치므로 적지 않는다.
    expect(screen.queryByText("09-02")).not.toBeInTheDocument();
  });

  // 점 두 개면 가운데가 곧 양 끝이라 눈금이 겹친다.
  it("점이 둘이면 가로축 눈금을 양 끝만 적는다", () => {
    const { container } = render(
      <TrendChart
        points={points(1_300, 1_400)}
        formatRate={FORMAT_RATE}
        formatDate={FORMAT_DATE}
        label="추세"
      />,
    );

    const xLabels = Array.from(container.querySelectorAll("text")).filter(
      (node) => node.textContent?.startsWith("09-"),
    );
    expect(xLabels).toHaveLength(2);
  });

  it("점이 하나면 선이 되지 않아 아무것도 그리지 않는다", () => {
    const { container } = render(
      <TrendChart
        points={points(1_300)}
        formatRate={FORMAT_RATE}
        formatDate={FORMAT_DATE}
        label="추세"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  // 평평한 선은 "변동이 없다"가 아니라 "그릴 진폭이 없다"는 뜻이라 감춘다.
  it("값이 전부 같으면 아무것도 그리지 않는다", () => {
    const { container } = render(
      <TrendChart
        points={points(1_300, 1_300, 1_300)}
        formatRate={FORMAT_RATE}
        formatDate={FORMAT_DATE}
        label="추세"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
