import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError, type ApiResult } from "../../api/client";
import type { ForecastResponse } from "../../api/generated/divurve-api";
import { FORECAST_API_FIXTURE } from "../../test/api-fixtures";
import type { HomeMarketSnapshot } from "./home-market";
import {
  EXPLANATION_TOGGLE_STORAGE_KEY,
  MarketSummarySection,
} from "./market-summary-section";

const SUMMARY_SNAPSHOT: HomeMarketSnapshot = {
  pairCode: "USDKRW",
  currentRate: 1_382.4,
  lower: 1_330.6,
  upper: 1_389.02,
  regime: "elevated",
};

const JPY_RESULT: ApiResult<ForecastResponse> = {
  data: {
    ...FORECAST_API_FIXTURE.forecast,
    pairCode: "USDJPY",
    currentRate: 147.52,
    interval80: { lo: 142.1, hi: 152.8, widthPct: 0.07 },
    volatility: { ...FORECAST_API_FIXTURE.forecast.volatility, regime: "normal" },
  },
  meta: { asOf: FORECAST_API_FIXTURE.asOf },
};

function explanationResult(sentence: string) {
  return {
    data: {
      explanation: {
        sentences: [sentence],
        sentenceCount: 1,
        explainLevel: "basic",
        explainDomain: "general",
        fallback: false,
      },
      verification: { numericMatch: true, blockedPhrases: [] },
    },
    meta: { asOf: "2026-09-06T22:32:09.924Z" },
  };
}

describe("MarketSummarySection", () => {
  it("홈 요약 값으로 먼저 그리고, 그 값을 근거로 AI 설명을 요청한다", async () => {
    const loadMarket = vi.fn();
    const explainRequester = vi
      .fn()
      .mockResolvedValue(explanationResult("현재 환율은 1,382.40원입니다."));

    render(
      <MarketSummarySection
        summarySnapshot={SUMMARY_SNAPSHOT}
        loadMarket={loadMarket}
        explainRequester={explainRequester}
      />,
    );

    expect(screen.getByText("1,382.40")).toBeInTheDocument();
    // 홈 요약이 이미 준 값이므로 시세를 다시 부르지 않는다.
    expect(loadMarket).not.toHaveBeenCalled();

    expect(
      await screen.findByText("현재 환율은 1,382.40원입니다."),
    ).toBeInTheDocument();
    expect(explainRequester).toHaveBeenCalledWith({
      surface: "home_market_summary",
      facts: {
        pair_code: "USDKRW",
        current_rate: 1_382.4,
        interval_80_lo: 1_330.6,
        interval_80_hi: 1_389.02,
        regime: "elevated",
      },
    });
  });

  it("통화쌍을 바꾸면 그 통화쌍 시세를 다시 조회해 표시한다", async () => {
    const loadMarket = vi.fn().mockResolvedValue(JPY_RESULT);
    const explainRequester = vi
      .fn()
      .mockResolvedValue(explanationResult("설명 문장입니다."));

    render(
      <MarketSummarySection
        summarySnapshot={SUMMARY_SNAPSHOT}
        loadMarket={loadMarket}
        explainRequester={explainRequester}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "통화쌍" }), {
      target: { value: "USDJPY" },
    });

    expect(loadMarket).toHaveBeenCalledWith("USDJPY");
    // 이전 통화쌍의 수치를 그대로 두지 않는다.
    expect(screen.queryByText("1,382.40")).not.toBeInTheDocument();

    expect(await screen.findByText("147.52")).toBeInTheDocument();
    expect(screen.getByText("80% 범위 142.10 - 152.80")).toBeInTheDocument();
    await waitFor(() =>
      expect(explainRequester).toHaveBeenLastCalledWith({
        surface: "home_market_summary",
        facts: {
          pair_code: "USDJPY",
          current_rate: 147.52,
          interval_80_lo: 142.1,
          interval_80_hi: 152.8,
          regime: "normal",
        },
      }),
    );
  });

  it("시세 조회에 실패하면 메시지를 보여주고 다시 불러올 수 있다", async () => {
    const loadMarket = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("점검 중입니다.", 503, "UNAVAILABLE"))
      .mockResolvedValue(JPY_RESULT);

    render(
      <MarketSummarySection
        summarySnapshot={SUMMARY_SNAPSHOT}
        loadMarket={loadMarket}
        explainRequester={vi.fn().mockResolvedValue(explanationResult("설명"))}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "통화쌍" }), {
      target: { value: "USDJPY" },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("점검 중입니다.");

    fireEvent.click(screen.getByRole("button", { name: "시세 다시 불러오기" }));
    expect(await screen.findByText("147.52")).toBeInTheDocument();
  });

  it("근거 수치가 없으면 AI 설명을 요청하지 않는다", () => {
    const explainRequester = vi.fn();
    render(
      <MarketSummarySection
        summarySnapshot={{ pairCode: "EURUSD" }}
        loadMarket={vi.fn()}
        explainRequester={explainRequester}
      />,
    );

    expect(explainRequester).not.toHaveBeenCalled();
    expect(screen.queryByText("AI 시장 설명")).not.toBeInTheDocument();
  });

  it("AI 설명은 펼친 채로 시작하고, 접으면 그 선택을 기억한다", async () => {
    localStorage.removeItem(EXPLANATION_TOGGLE_STORAGE_KEY);
    const explainRequester = vi
      .fn()
      .mockResolvedValue(explanationResult("변동성이 평시 범위입니다."));

    render(
      <MarketSummarySection
        summarySnapshot={SUMMARY_SNAPSHOT}
        explainRequester={explainRequester}
      />,
    );

    const sentence = await screen.findByText("변동성이 평시 범위입니다.");
    expect(sentence).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "접기" }));

    expect(sentence).not.toBeVisible();
    expect(localStorage.getItem(EXPLANATION_TOGGLE_STORAGE_KEY)).toBe("closed");
    localStorage.removeItem(EXPLANATION_TOGGLE_STORAGE_KEY);
  });
});
