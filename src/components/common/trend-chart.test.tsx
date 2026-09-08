import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  describe("부모가 준 자리에 맞춰 좌표계를 다시 잡는다", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    /** 관찰 콜백을 즉시 부르는 대역. jsdom에는 ResizeObserver가 없다. */
    function stubResizeObserver(rect: { width: number; height: number }) {
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
        rect as DOMRect,
      );
      vi.stubGlobal(
        "ResizeObserver",
        class {
          constructor(private readonly callback: () => void) {}
          observe() {
            this.callback();
          }
          unobserve() {}
          disconnect() {}
        },
      );
    }

    it("측정한 픽셀 크기를 viewBox로 쓴다", () => {
      stubResizeObserver({ width: 552, height: 380 });

      const { container } = render(
        <TrendChart
          points={points(1_300, 1_400)}
          formatRate={FORMAT_RATE}
          formatDate={FORMAT_DATE}
          label="추세"
        />,
      );

      // 1 좌표 = 1px 이라 글자와 선 굵기가 늘어나지 않는다.
      expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(
        "0 0 552 380",
      );
    });

    it("눈금이 겹칠 만큼 좁아지면 하한 크기로 그린다", () => {
      stubResizeObserver({ width: 90, height: 40 });

      const { container } = render(
        <TrendChart
          points={points(1_300, 1_400)}
          formatRate={FORMAT_RATE}
          formatDate={FORMAT_DATE}
          label="추세"
        />,
      );

      expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(
        "0 0 240 140",
      );
    });

    it("바깥에서 준 className을 자리 배치용으로 그대로 붙인다", () => {
      const { container } = render(
        <TrendChart
          points={points(1_300, 1_400)}
          formatRate={FORMAT_RATE}
          formatDate={FORMAT_DATE}
          label="추세"
          className="market-summary-card__chart"
        />,
      );

      expect(container.querySelector(".trend-chart")).toHaveClass(
        "market-summary-card__chart",
      );
    });
  });
});
