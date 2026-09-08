import { describe, expect, it } from "vitest";
import type { ApiResult } from "../../api/client";
import type { ForecastResponse } from "../../api/generated/divurve-api";
import { FORECAST_API_FIXTURE, HOME_SUMMARY_FIXTURE } from "../../test/api-fixtures";
import {
  resolveMarketPairCode,
  toCurrencyColor,
  toDisplaySnapshot,
  toForecastMarketSnapshot,
  toMarketFacts,
  toMarketRateLabel,
  toMarketView,
  toSummaryMarketSnapshot,
} from "./home-market";

const FORECAST_RESULT: ApiResult<ForecastResponse> = {
  data: FORECAST_API_FIXTURE.forecast,
  meta: { asOf: FORECAST_API_FIXTURE.asOf },
};

describe("resolveMarketPairCode", () => {
  it("백엔드가 지원하는 통화쌍만 통과시키고 나머지는 기본값으로 되돌린다", () => {
    expect(resolveMarketPairCode("USDJPY")).toBe("USDJPY");
    expect(resolveMarketPairCode("EURUSD")).toBe("EURUSD");
    expect(resolveMarketPairCode("GBPKRW")).toBe("USDKRW");
    expect(resolveMarketPairCode(undefined)).toBe("USDKRW");
  });
});

describe("toCurrencyColor", () => {
  it("USD·JPY·EUR은 고정 배정 토큰을, 그 밖의 통화는 중립색을 쓴다", () => {
    expect(toCurrencyColor("USD")).toBe("var(--usd)");
    expect(toCurrencyColor("JPY")).toBe("var(--jpy)");
    expect(toCurrencyColor("EUR")).toBe("var(--eur)");
    expect(toCurrencyColor("KRW")).toBe("var(--text-muted)");
  });
});

describe("toMarketRateLabel", () => {
  it("EURUSD만 소수 네 자리로 표시한다", () => {
    expect(toMarketRateLabel("USDKRW", 1_382.4)).toBe("1,382.40");
    expect(toMarketRateLabel("USDJPY", 147.5)).toBe("147.50");
    expect(toMarketRateLabel("EURUSD", 1.08543)).toBe("1.0854");
  });
});

describe("toSummaryMarketSnapshot", () => {
  it("홈 요약이 준 forecast 블록과 meta의 regime을 그대로 옮긴다", () => {
    expect(
      toSummaryMarketSnapshot({
        ...HOME_SUMMARY_FIXTURE,
        meta: { ...HOME_SUMMARY_FIXTURE.meta, regime: "elevated" },
      }),
    ).toEqual({
      pairCode: "USDKRW",
      currentRate: 1_382.4,
      lower: 1_330.6,
      upper: 1_389.02,
      regime: "elevated",
      history: [
        { date: "2026-09-02", rate: 1_351.2 },
        { date: "2026-09-03", rate: 1_377.8 },
        { date: "2026-09-04", rate: 1_365.1 },
        { date: "2026-09-05", rate: 1_382.4 },
      ],
    });
  });

  it("범위가 없으면 상하단을 비운 채로 넘긴다", () => {
    expect(
      toSummaryMarketSnapshot({
        data: { ...HOME_SUMMARY_FIXTURE.data, forecast: {} },
        meta: { asOf: "2026-09-06T22:32:09.924Z" },
      }),
    ).toEqual({
      pairCode: "USDKRW",
      currentRate: undefined,
      lower: undefined,
      upper: undefined,
      regime: undefined,
      // 키가 없으면 빈 배열로 접는다 — 카드가 길이만 보고 선을 감춘다.
      history: [],
    });
  });
});

describe("toForecastMarketSnapshot", () => {
  it("forecast 응답의 현재 환율·80% 범위·regime을 옮긴다", () => {
    expect(toForecastMarketSnapshot(FORECAST_RESULT)).toEqual({
      pairCode: "USDKRW",
      currentRate: 1_400,
      lower: 1_350,
      upper: 1_450,
      regime: "normal",
      // `/forecast` 는 `d`, 홈 요약은 `date` 라 여기서 이름을 맞춘다.
      history: [
        { date: "2026-09-01", rate: 1_390 },
        { date: "2026-09-02", rate: 1_400 },
      ],
    });
  });
});

describe("toDisplaySnapshot", () => {
  const summary = {
    pairCode: "USDKRW",
    currentRate: 1_382.4,
    lower: 1_330.6,
    upper: 1_389.02,
  } as const;

  it("조회가 끝나면 받은 값을 쓴다", () => {
    const snapshot = { pairCode: "USDJPY", currentRate: 147.5 } as const;
    expect(
      toDisplaySnapshot(summary, "USDJPY", { status: "ready", snapshot }),
    ).toBe(snapshot);
  });

  it("같은 통화쌍을 다시 부르는 중에는 홈 요약 값을 그대로 둔다", () => {
    expect(toDisplaySnapshot(summary, "USDKRW", { status: "loading" })).toBe(
      summary,
    );
  });

  it("다른 통화쌍을 고른 뒤에는 이전 수치를 보여주지 않는다", () => {
    expect(toDisplaySnapshot(summary, "EURUSD", { status: "loading" })).toEqual({
      pairCode: "EURUSD",
    });
  });
});

describe("toMarketView", () => {
  it("통화쌍에 맞는 기호와 포맷으로 표시 모델을 만든다", () => {
    expect(
      toMarketView({
        pairCode: "EURUSD",
        currentRate: 1.08543,
        lower: 1.0512,
        upper: 1.1204,
      }),
    ).toEqual({
      pairCode: "EURUSD",
      baseCurrencyCode: "EUR",
      quoteCurrencyCode: "USD",
      quoteSymbol: "$",
      currentRateLabel: "1.0854",
      lowerLabel: "1.0512",
      upperLabel: "1.1204",
      sparklineRates: [],
    });
  });

  it("수치가 없으면 라벨도 비운다", () => {
    expect(toMarketView({ pairCode: "USDJPY" })).toEqual({
      pairCode: "USDJPY",
      baseCurrencyCode: "USD",
      quoteCurrencyCode: "JPY",
      quoteSymbol: "¥",
      currentRateLabel: undefined,
      lowerLabel: undefined,
      upperLabel: undefined,
      sparklineRates: [],
    });
  });
});

describe("toMarketFacts", () => {
  it("엔진이 준 수치를 백엔드 계약 키로 그대로 싣는다", () => {
    expect(
      toMarketFacts({
        pairCode: "USDKRW",
        currentRate: 1_382.4,
        lower: 1_330.6,
        upper: 1_389.02,
        regime: "elevated",
      }),
    ).toEqual({
      pair_code: "USDKRW",
      current_rate: 1_382.4,
      interval_80_lo: 1_330.6,
      interval_80_hi: 1_389.02,
      regime: "elevated",
    });
  });

  it("regime이 없으면 키를 넣지 않는다", () => {
    expect(toMarketFacts({ pairCode: "USDJPY", currentRate: 147.5 })).toEqual({
      pair_code: "USDJPY",
      current_rate: 147.5,
    });
  });

  it("수치가 하나도 없으면 요청하지 않도록 null을 준다", () => {
    expect(toMarketFacts({ pairCode: "USDKRW" })).toBeNull();
  });
});

describe("toMarketView 의 스파크라인", () => {
  it("관측값을 시간순 그대로 환율 수열로 넘긴다", () => {
    expect(
      toMarketView({
        pairCode: "USDKRW",
        history: [
          { date: "2026-09-01", rate: 1_390 },
          { date: "2026-09-02", rate: 1_400 },
        ],
      }).sparklineRates,
    ).toEqual([1_390, 1_400]);
  });

  it("점이 하나면 선을 그릴 수 없어 비운다", () => {
    expect(
      toMarketView({
        pairCode: "USDKRW",
        history: [{ date: "2026-09-01", rate: 1_390 }],
      }).sparklineRates,
    ).toEqual([]);
  });

  it("값이 전부 같으면 진폭이 0이라 비운다 — 평평한 선으로 오해를 주지 않는다", () => {
    expect(
      toMarketView({
        pairCode: "USDKRW",
        history: [
          { date: "2026-09-01", rate: 1_390 },
          { date: "2026-09-02", rate: 1_390 },
        ],
      }).sparklineRates,
    ).toEqual([]);
  });
});
