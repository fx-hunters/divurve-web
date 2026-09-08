import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError, type ApiResult } from "../../api/client";
import type { ExplainResult } from "../../api/ai-explain";
import type { ForecastBundle } from "../../api/generated/divurve-api";
import {
  EMPTY_FORECAST_API_FIXTURE,
  FORECAST_API_FIXTURE,
} from "../../test/api-fixtures";
import { ForecastScreen } from "./forecast-screen";

/**
 * 통화쌍마다 다른 응답을 준다. 드롭다운을 바꿨을 때 팬 차트뿐 아니라 동인·
 * 성적표까지 새 응답으로 갈리는지 보려면 쌍마다 값이 달라야 한다.
 */
const BUNDLE_BY_PAIR: Readonly<Record<string, ForecastBundle>> = {
  USDKRW: FORECAST_API_FIXTURE,
  USDJPY: {
    ...FORECAST_API_FIXTURE,
    forecast: {
      ...FORECAST_API_FIXTURE.forecast,
      pairCode: "USDJPY",
      interval80: { lo: 140.25, hi: 152.75, widthPct: 0.08 },
      volatility: { regime: "stress", vol30d: 0.19, volPercentile5y: 0.97 },
    },
    factors: {
      pairCode: "USDJPY",
      factors: [
        { key: "boj", label: "일본 정책 기조", contributionPp: 0.5, direction: "bearish" },
      ],
    },
    performance: {
      ...FORECAST_API_FIXTURE.performance,
      pairCode: "USDJPY",
      model: { hitRate: 0.55, mae: 0.042, coverage80: 0.79, avgWidth: 0.08 },
    },
  },
  EURUSD: {
    ...FORECAST_API_FIXTURE,
    forecast: {
      ...FORECAST_API_FIXTURE.forecast,
      pairCode: "EURUSD",
      interval80: { lo: 1.02, hi: 1.14, widthPct: 0.11 },
    },
    factors: {
      pairCode: "EURUSD",
      factors: [
        { key: "ecb", label: "유로존 금리", contributionPp: 0.3, direction: "bullish" },
      ],
    },
    performance: {
      ...FORECAST_API_FIXTURE.performance,
      pairCode: "EURUSD",
      model: { hitRate: 0.58, mae: 0.027, coverage80: 0.85, avgWidth: 0.06 },
    },
  },
};

function loaderByPair() {
  return vi.fn((pairCode: string) =>
    Promise.resolve(BUNDLE_BY_PAIR[pairCode] ?? FORECAST_API_FIXTURE),
  );
}

function explanationResult(regime?: string): ApiResult<ExplainResult> {
  return {
    data: {
      explanation: {
        sentences: ["최근 30일 변동성 기준 범위입니다."],
        sentenceCount: 1,
        explainLevel: "basic",
        explainDomain: "general",
        fallback: false,
      },
      verification: { numericMatch: true, blockedPhrases: [] },
    },
    meta: { asOf: "2026-09-06T22:14:01.070Z", regime },
  };
}

function explanationRequester(regime?: string) {
  return vi.fn().mockResolvedValue(explanationResult(regime));
}

describe("ForecastScreen", () => {
  it("통화쌍 드롭다운, 전망 기간 토글, 팬 차트, 요약 카드 및 플래너 이동을 렌더링하고 동작한다", async () => {
    const onNavigate = vi.fn();
    const loader = loaderByPair();

    render(
      <ForecastScreen
        loader={loader}
        onNavigate={onNavigate}
        explanationRequester={explanationRequester()}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "시뮬레이션 팬 차트 (USD/KRW)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("80% 범위 (향후 30일)")).toBeInTheDocument();
    expect(screen.getByText("1,350.00 ~ 1,450.00")).toBeInTheDocument();
    expect(screen.getByText("5년 중 63백분위")).toBeInTheDocument();
    expect(screen.getByText("1% 움직일 때 ₩12,000")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "전망 동인" })).toBeInTheDocument();
    expect(screen.getByText("금리 차")).toBeInTheDocument();
    expect(screen.getByText("미국 물가 발표")).toBeInTheDocument();
    expect(screen.getByText("3.1%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "향후 90일" }));
    await waitFor(() => expect(loader).toHaveBeenLastCalledWith("USDKRW", 90));
    expect(await screen.findByText("80% 범위 (향후 90일)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /내 계획에 적용하기/ }));
    expect(onNavigate).toHaveBeenCalledWith("planner");
  });

  it("전망 기간 컨트롤은 무엇에 대한 기간인지 라벨과 보조 설명으로 알린다", async () => {
    render(
      <ForecastScreen
        loader={loaderByPair()}
        explanationRequester={explanationRequester()}
      />,
    );

    const group = await screen.findByRole("group", { name: "전망 기간" });
    expect(group).toBeInTheDocument();
    expect(
      screen.getByText(
        "선택한 기간만큼 앞으로의 환율 범위를 팬 차트와 요약 카드에 표시합니다.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "향후 30일" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "향후 90일" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("통화쌍 3종을 전환하면 팬 차트·동인·성적표가 모두 갱신된다", async () => {
    const loader = loaderByPair();
    render(
      <ForecastScreen
        loader={loader}
        explanationRequester={explanationRequester()}
      />,
    );

    // 통화쌍을 바꾸면 화면이 로딩 상태로 돌아갔다 다시 그려지므로 매번 다시 찾는다.
    const select = await screen.findByLabelText("통화쌍");
    expect(select).toHaveValue("USDKRW");
    expect(screen.getByRole("option", { name: "USD/JPY" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "EUR/USD" })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "USDJPY" } });
    await waitFor(() => expect(loader).toHaveBeenLastCalledWith("USDJPY", 30));
    expect(
      await screen.findByRole("heading", { name: "시뮬레이션 팬 차트 (USD/JPY)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("140.25 ~ 152.75")).toBeInTheDocument();
    expect(screen.getByText("일본 정책 기조")).toBeInTheDocument();
    expect(screen.getByText("55%")).toBeInTheDocument();
    // 통화쌍을 이루는 두 통화의 일정이 함께 보인다.
    expect(screen.getByText("일본 정책 회의")).toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText("통화쌍"), {
      target: { value: "EURUSD" },
    });
    await waitFor(() => expect(loader).toHaveBeenLastCalledWith("EURUSD", 30));
    expect(
      await screen.findByRole("heading", { name: "시뮬레이션 팬 차트 (EUR/USD)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1.02 ~ 1.14")).toBeInTheDocument();
    expect(screen.getByText("유로존 금리")).toBeInTheDocument();
    expect(screen.getByText("58%")).toBeInTheDocument();
  });

  it("목록에 없는 통화쌍 값이 오면 기본 통화쌍으로 되돌린다", async () => {
    const loader = loaderByPair();
    render(
      <ForecastScreen
        loader={loader}
        explanationRequester={explanationRequester()}
      />,
    );

    fireEvent.change(await screen.findByLabelText("통화쌍"), {
      target: { value: "USDJPY" },
    });
    await waitFor(() => expect(loader).toHaveBeenLastCalledWith("USDJPY", 30));

    fireEvent.change(await screen.findByLabelText("통화쌍"), {
      target: { value: "XXXYYY" },
    });
    await waitFor(() => expect(loader).toHaveBeenLastCalledWith("USDKRW", 30));
  });

  it("팬 차트 하단에 AI 설명을 붙이고 서버가 준 근거 수치로 요청한다", async () => {
    const requester = explanationRequester();
    render(
      <ForecastScreen
        loader={loaderByPair()}
        explanationRequester={requester}
      />,
    );

    expect(
      await screen.findByText("최근 30일 변동성 기준 범위입니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "USD/KRW 향후 30일 범위 설명" }),
    ).toBeInTheDocument();
    expect(requester).toHaveBeenCalledWith({
      surface: "forecast_summary",
      facts: {
        pair_code: "USDKRW",
        horizon_days: 30,
        band_lower: 1_350,
        band_upper: 1_450,
        vol_30d: 0.08,
        vol_percentile_5y: 0.63,
        regime: "normal",
      },
    });
  });

  it("응답 meta의 국면을 배지로 반영하고, 국면이 없으면 배지를 그리지 않는다", async () => {
    const { unmount } = render(
      <ForecastScreen
        loader={loaderByPair()}
        explanationRequester={explanationRequester("stress")}
      />,
    );
    expect(await screen.findByText("급변")).toBeInTheDocument();
    expect(screen.getByText("시장 국면")).toBeInTheDocument();
    unmount();

    render(
      <ForecastScreen
        loader={loaderByPair()}
        explanationRequester={explanationRequester()}
      />,
    );
    expect(
      await screen.findByText("최근 30일 변동성 기준 범위입니다."),
    ).toBeInTheDocument();
    expect(screen.queryByText("시장 국면")).not.toBeInTheDocument();
  });

  it("AI 설명이 실패하면 메시지와 재시도 버튼을 보여준다", async () => {
    const requester = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("설명 서버 점검 중입니다.", 503, "UNAVAILABLE"))
      .mockResolvedValue(explanationResult());
    render(
      <ForecastScreen loader={loaderByPair()} explanationRequester={requester} />,
    );

    expect(
      await screen.findByText("설명 서버 점검 중입니다."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(
      await screen.findByText("최근 30일 변동성 기준 범위입니다."),
    ).toBeInTheDocument();
  });

  it("onNavigate prop 없이도 에러 없이 렌더링되고 동작한다", async () => {
    render(
      <ForecastScreen
        loader={loaderByPair()}
        explanationRequester={explanationRequester()}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /내 계획에 적용하기/ }),
    );
    expect(await screen.findByLabelText("통화쌍")).toHaveValue("USDKRW");
  });

  it("동인과 일정이 비어 있으면 안내 문구를 보여준다", async () => {
    render(
      <ForecastScreen
        explanationRequester={explanationRequester()}
        loader={vi.fn().mockResolvedValue({
          ...EMPTY_FORECAST_API_FIXTURE,
          forecast: FORECAST_API_FIXTURE.forecast,
        })}
      />,
    );
    expect(
      await screen.findByText("이 통화쌍의 동인 데이터가 아직 제공되지 않습니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("예정된 일정이 없습니다.")).toBeInTheDocument();
  });

  it("변동성 국면이 확대되면 백분위를 경고 색으로 표시한다", async () => {
    render(
      <ForecastScreen
        explanationRequester={explanationRequester()}
        loader={vi.fn().mockResolvedValue({
          ...FORECAST_API_FIXTURE,
          forecast: {
            ...FORECAST_API_FIXTURE.forecast,
            volatility: {
              ...FORECAST_API_FIXTURE.forecast.volatility,
              regime: "elevated",
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
    render(
      <ForecastScreen loader={loader} explanationRequester={explanationRequester()} />,
    );

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
