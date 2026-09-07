import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import {
  EMPTY_FORECAST_API_FIXTURE,
  FORECAST_API_FIXTURE,
} from "../../test/api-fixtures";
import { ForecastScreen } from "./forecast-screen";

describe("ForecastScreen", () => {
  it("통화 선택, 기간 토글, 팬 차트, 요약 카드 및 플래너 이동을 렌더링하고 동작한다", async () => {
    const onNavigate = vi.fn();
    const loader = vi.fn().mockResolvedValue(FORECAST_API_FIXTURE);

    render(<ForecastScreen loader={loader} onNavigate={onNavigate} />);

    expect(
      await screen.findByRole("heading", { name: /시뮬레이션 팬 차트/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "USD" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "JPY" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EUR" })).toBeInTheDocument();
    expect(screen.getByText("80% 범위 (30D)")).toBeInTheDocument();
    expect(screen.getByText("1,350.00 ~ 1,450.00")).toBeInTheDocument();
    expect(screen.getByText("5년 중 63백분위")).toBeInTheDocument();
    expect(screen.getByText("1% 움직일 때 ₩12,000")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "전망 동인" })).toBeInTheDocument();
    expect(screen.getByText("금리 차")).toBeInTheDocument();
    expect(screen.getByText("미국 물가 발표")).toBeInTheDocument();
    expect(screen.getByText("3.1%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "JPY" }));
    await waitFor(() =>
      expect(loader).toHaveBeenLastCalledWith("JPY_KRW", 30),
    );
    expect(
      await screen.findByRole("heading", { name: /시뮬레이션 팬 차트 \(JPY\/KRW\)/ }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "90D" }));
    await waitFor(() => expect(loader).toHaveBeenLastCalledWith("JPY_KRW", 90));
    expect(await screen.findByText("80% 범위 (90D)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /내 계획에 적용하기/ }));
    expect(onNavigate).toHaveBeenCalledWith("planner");
  });

  it("onNavigate prop 없이도 에러 없이 렌더링되고 동작한다", async () => {
    render(
      <ForecastScreen loader={vi.fn().mockResolvedValue(FORECAST_API_FIXTURE)} />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /내 계획에 적용하기/ }),
    );
    expect(screen.getByRole("button", { name: "EUR" })).toBeInTheDocument();
  });

  it("동인과 일정이 비어 있으면 안내 문구를 보여준다", async () => {
    render(
      <ForecastScreen
        loader={vi.fn().mockResolvedValue({
          ...EMPTY_FORECAST_API_FIXTURE,
          forecast: FORECAST_API_FIXTURE.forecast,
        })}
      />,
    );
    expect(
      await screen.findByText("이 통화의 동인 데이터가 아직 제공되지 않습니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("예정된 일정이 없습니다.")).toBeInTheDocument();
  });

  it("변동성 국면이 높으면 백분위를 경고 색으로 표시한다", async () => {
    render(
      <ForecastScreen
        loader={vi.fn().mockResolvedValue({
          ...FORECAST_API_FIXTURE,
          forecast: {
            ...FORECAST_API_FIXTURE.forecast,
            volatility: {
              ...FORECAST_API_FIXTURE.forecast.volatility,
              regime: "high",
            },
          },
        })}
      />,
    );
    expect(await screen.findByText("5년 중 63백분위")).toHaveStyle({
      color: "var(--warn)",
    });
  });

  it("불러오는 중에는 로딩 안내를 보여준다", () => {
    render(<ForecastScreen loader={vi.fn().mockReturnValue(new Promise(() => {}))} />);
    expect(screen.getByText("환율 범위를 불러오는 중입니다")).toBeInTheDocument();
  });

  it("실패하면 메시지와 재시도 버튼을 보여준다", async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("서버 점검 중입니다.", 503, "UNAVAILABLE"))
      .mockResolvedValue(FORECAST_API_FIXTURE);
    render(<ForecastScreen loader={loader} />);

    expect(await screen.findByText("서버 점검 중입니다.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /다시/ }));
    expect(
      await screen.findByRole("heading", { name: /시뮬레이션 팬 차트/ }),
    ).toBeInTheDocument();
  });

  it("표시할 데이터가 없으면 빈 상태를 보여준다", async () => {
    render(
      <ForecastScreen loader={vi.fn().mockResolvedValue(EMPTY_FORECAST_API_FIXTURE)} />,
    );
    expect(
      await screen.findByText("표시할 환율 범위가 없습니다"),
    ).toBeInTheDocument();
  });
});
