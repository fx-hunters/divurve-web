import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FanChart, FanChartTooltip, formatYTick, formatTooltipValue } from "./fan-chart";
import { FORECAST_API_FIXTURE } from "../../test/api-fixtures";
import { toFanChartData } from "./forecast-presenter";

describe("FanChart", () => {
  it("데이터가 있을 때 팬 차트 컨테이너를 렌더링한다", () => {
    const data = toFanChartData(FORECAST_API_FIXTURE);

    render(<FanChart data={data} currency="USD" />);

    const chartEl = screen.getByRole("img", { name: "시뮬레이션 팬 차트 (USD/KRW)" });
    expect(chartEl).toBeInTheDocument();
    expect(chartEl.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });

  it("formatYTick과 formatTooltipValue가 포맷팅을 올바르게 수행한다", () => {
    expect(formatYTick(1350, 0)).toBe("");
    expect(formatYTick(1350, 1)).toBe("1,350");
    expect(formatTooltipValue(1400)).toEqual(["₩1,400"]);
    expect(formatTooltipValue("N/A")).toEqual(["N/A"]);
  });

  it("데이터가 비어 있을 때 안내 텍스트를 표시한다", () => {
    render(<FanChart data={[]} currency="USD" />);
    expect(screen.getByText("데이터가 없습니다.")).toBeInTheDocument();
  });

  describe("FanChartTooltip", () => {
    it("active가 false이거나 payload가 없을 때 아무것도 렌더링하지 않는다", () => {
      const { container: c1 } = render(<FanChartTooltip active={false} />);
      expect(c1.firstChild).toBeNull();

      const { container: c2 } = render(<FanChartTooltip active={true} payload={[]} />);
      expect(c2.firstChild).toBeNull();

      const { container: c3 } = render(<FanChartTooltip active={true} payload={undefined} />);
      expect(c3.firstChild).toBeNull();
    });

    it("active 상태에서 유효한 payload와 라벨이 주어지면 원화 금액과 항목명을 렌더링한다", () => {
      const payload = [
        { dataKey: "price", value: 1350 },
        { dataKey: "projected", value: 1360 },
        { dataKey: "range80_upper", value: 1380 },
        { dataKey: "range80_lower", value: 1320 },
        { dataKey: "range50_upper", value: 1370 },
        { dataKey: "range50_lower", value: 1330 },
        { dataKey: "custom_key", name: "사용자 정의", value: "미정" },
        { dataKey: "invalid_key", value: null },
      ];

      render(
        <FanChartTooltip
          active={true}
          payload={payload}
          label="09/06 (D+10)"
          currency="USD"
        />
      );

      expect(screen.getByText("09/06 (D+10)")).toBeInTheDocument();
      expect(screen.getByText("USD/KRW")).toBeInTheDocument();
      expect(screen.getByText("실제 환율")).toBeInTheDocument();
      expect(screen.getByText("₩1,350")).toBeInTheDocument();
      expect(screen.getByText("투영 시나리오")).toBeInTheDocument();
      expect(screen.getByText("₩1,360")).toBeInTheDocument();
      expect(screen.getByText("80% 상한")).toBeInTheDocument();
      expect(screen.getByText("₩1,380")).toBeInTheDocument();
      expect(screen.getByText("사용자 정의")).toBeInTheDocument();
      expect(screen.getByText("미정")).toBeInTheDocument();
    });

    it("currency가 주어지지 않으면 기본값 USD로 표시된다", () => {
      render(
        <FanChartTooltip
          active={true}
          payload={[{ dataKey: "price", value: 1350 }]}
          label="오늘"
        />
      );

      expect(screen.getByText("USD/KRW")).toBeInTheDocument();
    });

    it("dataKey 매핑이 없고 name이 없는 경우 및 dataKey/name 둘 다 없는 경우 fallback 이름을 표시한다", () => {
      const payload = [
        { dataKey: "unmapped_key", value: 1400 },
        { value: 1420 },
      ];

      render(
        <FanChartTooltip
          active={true}
          payload={payload}
          label="내일"
          currency="EUR"
        />
      );

      expect(screen.getByText("EUR/KRW")).toBeInTheDocument();
      expect(screen.getByText("unmapped_key")).toBeInTheDocument();
      expect(screen.getByText("항목")).toBeInTheDocument();
    });
  });
});
