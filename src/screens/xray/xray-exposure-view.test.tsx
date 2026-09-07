import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  NOT_MEASURED_XRAY_API_FIXTURE,
  STRESS_RUN_FIXTURE,
  XRAY_API_FIXTURE,
} from "../../test/api-fixtures";
import { toStressRunResult, toXRayDashboardData } from "./xray-presenter";
import { currencyColor, XRayExposureView } from "./xray-exposure-view";

const DATA = toXRayDashboardData(XRAY_API_FIXTURE);
const RUN_RESULT = toStressRunResult(STRESS_RUN_FIXTURE);

describe("currencyColor", () => {
  it("USD·JPY·EUR은 고정 색을, 그 밖의 통화는 중립색을 쓴다", () => {
    expect(currencyColor("USD")).toBe("var(--usd)");
    expect(currencyColor("JPY")).toBe("var(--jpy)");
    expect(currencyColor("EUR")).toBe("var(--eur)");
    expect(currencyColor("GBP")).toBe("var(--text-muted)");
  });
});

describe("XRayExposureView", () => {
  it("외화 비중, 통화 노출, 손익 분해, 시나리오 목록을 렌더링한다", () => {
    render(
      <XRayExposureView
        data={DATA}
        selectedScenarioCode=""
        runState={{ status: "idle" }}
        runResult={null}
        onSelectScenario={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "외화 비중" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "통화별 노출" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "환율 민감도" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "손익 분해" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "스트레스 시나리오" })).toBeInTheDocument();

    expect(screen.getByText("₩ 8,000,000")).toBeInTheDocument();
    expect(screen.getByText("₩ 12,000,000")).toBeInTheDocument();
    expect(screen.getByText("USD 75%")).toBeInTheDocument();
    expect(screen.getByText("JPY 25%")).toBeInTheDocument();
    expect(screen.getByText("기준선 60%")).toBeInTheDocument();
    expect(screen.getByTestId("concentration-threshold-marker")).toBeInTheDocument();
    expect(screen.getByText("+₩ 80,000")).toBeInTheDocument();

    expect(screen.getByText("자산 가격 효과")).toBeInTheDocument();
    expect(screen.getByText("5.8%p")).toBeInTheDocument();
    expect(screen.getByText("-0.4%p")).toBeInTheDocument();
    expect(screen.getByText("0%p")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("+15%")).toBeInTheDocument();
    expect(screen.getByText("-2%")).toBeInTheDocument();
    expect(
      screen.getByText("시나리오를 고르면 서버가 계산한 충격 결과를 보여줍니다."),
    ).toBeInTheDocument();
  });

  it("시나리오를 고르면 코드를 넘긴다", () => {
    const onSelectScenario = vi.fn();
    render(
      <XRayExposureView
        data={DATA}
        selectedScenarioCode="equity_down_krw_weak"
        runState={{ status: "running" }}
        runResult={null}
        onSelectScenario={onSelectScenario}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("시나리오를 계산하는 중입니다.");
    expect(
      screen.getByRole("button", { name: "주가 하락 + 원화 약세" }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "주가 하락 + 원화 강세" }));
    expect(onSelectScenario).toHaveBeenCalledWith("equity_down_krw_strong");
  });

  it("시나리오 실행 결과와 실패 메시지를 각각 보여준다", () => {
    const { unmount } = render(
      <XRayExposureView
        data={DATA}
        selectedScenarioCode="equity_down_krw_weak"
        runState={{ status: "done" }}
        runResult={RUN_RESULT}
        onSelectScenario={vi.fn()}
      />,
    );
    expect(screen.getByText("주가 -20%, 환율 +10% 충격 가정")).toBeInTheDocument();
    expect(screen.getByText("₩ -520,000")).toBeInTheDocument();
    expect(screen.getByText("충격 후 외화 자산 ₩ 7,480,000")).toBeInTheDocument();
    unmount();

    render(
      <XRayExposureView
        data={DATA}
        selectedScenarioCode="equity_down_krw_weak"
        runState={{ status: "error", message: "계산 실패" }}
        runResult={null}
        onSelectScenario={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("계산 실패");
  });

  it("기준선이 없고 종목이 없는 계정은 마커와 목록을 비운다", () => {
    render(
      <XRayExposureView
        data={toXRayDashboardData(NOT_MEASURED_XRAY_API_FIXTURE)}
        selectedScenarioCode=""
        runState={{ status: "idle" }}
        runResult={null}
        onSelectScenario={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId("concentration-threshold-marker"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/기준선/)).not.toBeInTheDocument();
    expect(screen.getByText("등록된 종목이 없습니다.")).toBeInTheDocument();
  });
});
