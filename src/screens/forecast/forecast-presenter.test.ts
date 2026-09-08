import { describe, expect, it } from "vitest";
import type { ForecastBundle } from "../../api/generated/divurve-api";
import {
  EMPTY_FORECAST_API_FIXTURE,
  FORECAST_API_FIXTURE,
} from "../../test/api-fixtures";
import { FORECAST_PAIRS } from "../../types/forecast";
import {
  currencyColor,
  directionType,
  toAsOfLabel,
  toExplanationFacts,
  toFanChartData,
  toImpactLabel,
  toPair,
  toPairForecastInfo,
  toPairLabel,
  toPercentileLabel,
  toPeriodLabel,
  toRateLabel,
  toRegimeBadge,
} from "./forecast-presenter";

const [USD_KRW, USD_JPY, EUR_USD] = FORECAST_PAIRS;

function withRegime(regime: string): ForecastBundle {
  return {
    ...FORECAST_API_FIXTURE,
    forecast: {
      ...FORECAST_API_FIXTURE.forecast,
      volatility: { ...FORECAST_API_FIXTURE.forecast.volatility, regime },
    },
  };
}

describe("toFanChartData", () => {
  it("history·band·modelPath를 날짜 기준으로 합친다", () => {
    expect(toFanChartData(FORECAST_API_FIXTURE)).toEqual([
      {
        day: "2026-09-01",
        price: 1_390,
        projected: null,
        range80Upper: null,
        range80Lower: null,
        range50Upper: null,
        range50Lower: null,
      },
      {
        day: "2026-09-02",
        price: 1_400,
        projected: 1_401,
        range80Upper: 1_440,
        range80Lower: 1_360,
        range50Upper: 1_420,
        range50Lower: 1_380,
      },
      {
        day: "2026-09-30",
        price: null,
        projected: 1_410,
        range80Upper: 1_450,
        range80Lower: 1_350,
        range50Upper: 1_430,
        range50Lower: 1_370,
      },
    ]);
  });

  it("모든 계열이 비면 빈 배열을 낸다", () => {
    expect(toFanChartData(EMPTY_FORECAST_API_FIXTURE)).toEqual([]);
  });
});

describe("선택지 표시", () => {
  it("통화쌍을 기준/표시통화 표기로 바꾼다", () => {
    expect(toPairLabel(USD_KRW)).toBe("USD/KRW");
    expect(toPairLabel(USD_JPY)).toBe("USD/JPY");
    expect(toPairLabel(EUR_USD)).toBe("EUR/USD");
  });

  it("드롭다운이 돌려준 코드를 통화쌍으로 되돌리고, 모르는 코드는 기본 쌍으로 둔다", () => {
    expect(toPair("EURUSD")).toBe(EUR_USD);
    expect(toPair("XXXYYY")).toBe(USD_KRW);
  });

  it("전망 기간은 앞으로의 구간임을 문구로 밝힌다", () => {
    expect(toPeriodLabel(30)).toBe("향후 30일");
    expect(toPeriodLabel(90)).toBe("향후 90일");
  });

  it("통화 색은 고정 배정하고 배정이 없는 통화는 중립색으로 둔다", () => {
    expect(currencyColor("USD")).toBe("var(--usd)");
    expect(currencyColor("JPY")).toBe("var(--jpy)");
    expect(currencyColor("EUR")).toBe("var(--eur)");
    expect(currencyColor("KRW")).toBe("var(--text-muted)");
  });
});

describe("표시용 변환", () => {
  it("변동성 백분위를 5년 분포 기준 문구로 만든다", () => {
    expect(toPercentileLabel(0.63)).toBe("5년 중 63백분위");
  });

  it("환율은 통화와 무관하게 소수 두 자리로 표시한다", () => {
    expect(toRateLabel(1_330.6027933279192)).toBe("1,330.60");
    expect(toRateLabel(8.712)).toBe("8.71");
  });

  it("1% 변동 영향액을 로케일 형식으로 표시한다", () => {
    expect(toImpactLabel(12_000)).toBe("12,000");
  });

  it("기준 시각은 로케일 형식으로, 해석 불가하면 원문 그대로 둔다", () => {
    expect(toAsOfLabel("2026-09-06T22:14:01.070Z")).toMatch(/2026/);
    expect(toAsOfLabel("모름")).toBe("모름");
  });

  it("동인 방향을 톤으로 매핑한다", () => {
    expect(directionType("BEARISH")).toBe("danger");
    expect(directionType("bullish")).toBe("normal");
    expect(directionType("neutral")).toBe("muted");
  });
});

describe("toRegimeBadge", () => {
  it("국면 코드를 명세 §2 어휘로 옮긴다", () => {
    expect(toRegimeBadge("calm")).toEqual({ label: "정상", tone: "normal" });
    expect(toRegimeBadge("normal")).toEqual({ label: "정상", tone: "normal" });
    expect(toRegimeBadge("elevated")).toEqual({ label: "주의", tone: "warn" });
    expect(toRegimeBadge("stress")).toEqual({ label: "급변", tone: "danger" });
  });

  it("국면이 없거나 모르는 코드면 배지를 만들지 않는다", () => {
    expect(toRegimeBadge(undefined)).toBeNull();
    expect(toRegimeBadge("unknown")).toBeNull();
  });
});

describe("toPairForecastInfo", () => {
  it("서버 값을 화면 뷰 데이터로 옮긴다", () => {
    const info = toPairForecastInfo(FORECAST_API_FIXTURE, USD_KRW);

    expect(info.summary).toEqual({
      upperLabel: "1,450.00",
      lowerLabel: "1,350.00",
      impact: "12,000",
      percentile: "5년 중 63백분위",
      isPercentileWarn: false,
    });
    // 최대 기여도(0.4)가 72px, 절반(0.2)이 36px, 0은 0px이다.
    expect(info.drivers).toEqual([
      { name: "금리 차", type: "normal", barWidthPx: 72 },
      { name: "위험 선호", type: "danger", barWidthPx: 36 },
      { name: "수급", type: "muted", barWidthPx: 0 },
    ]);
    expect(info.events).toEqual([
      { title: "미국 물가 발표", dateLabel: "2026-09-12", severity: "고변동성" },
    ]);
    expect(info.modelScore).toEqual({
      hitRatePct: 61,
      maePct: 3.1,
      inclusion80Pct: 82,
      randomWalkImprovementPct: 14,
    });
    expect(info.uncertaintyNote).toBe(
      "USDKRW 변동성은 5년 분포의 평시 범위입니다.",
    );
  });

  it("통화쌍을 이루는 두 통화의 일정만 남기고 중요도가 낮으면 중변동성으로 표시한다", () => {
    const info = toPairForecastInfo(FORECAST_API_FIXTURE, USD_JPY);
    expect(info.events).toEqual([
      { title: "미국 물가 발표", dateLabel: "2026-09-12", severity: "고변동성" },
      { title: "일본 정책 회의", dateLabel: "2026-09-15", severity: "중변동성" },
    ]);
  });

  it("모든 동인의 기여도가 0이면 막대 폭도 0으로 둔다", () => {
    const bundle: ForecastBundle = {
      ...FORECAST_API_FIXTURE,
      factors: {
        pairCode: "USDKRW",
        factors: [
          { key: "a", label: "금리 차", contributionPp: 0, direction: "neutral" },
          { key: "b", label: "수급", contributionPp: 0, direction: "neutral" },
        ],
      },
    };
    expect(toPairForecastInfo(bundle, USD_KRW).drivers).toEqual([
      { name: "금리 차", type: "muted", barWidthPx: 0 },
      { name: "수급", type: "muted", barWidthPx: 0 },
    ]);
  });

  it("동인과 일정이 비어 있어도 안전하게 변환한다", () => {
    const info = toPairForecastInfo(EMPTY_FORECAST_API_FIXTURE, USD_KRW);
    expect(info.drivers).toEqual([]);
    expect(info.events).toEqual([]);
  });

  it.each(["elevated", "stress"])(
    "변동성 국면이 %s이면 백분위를 경고 톤으로 표시한다",
    (regime) => {
      expect(
        toPairForecastInfo(withRegime(regime), USD_KRW).summary.isPercentileWarn,
      ).toBe(true);
    },
  );

  it.each(["calm", "normal", "unknown"])(
    "변동성 국면이 %s이면 평상 톤으로 둔다",
    (regime) => {
      expect(
        toPairForecastInfo(withRegime(regime), USD_KRW).summary.isPercentileWarn,
      ).toBe(false);
    },
  );
});

describe("toExplanationFacts", () => {
  it("서버가 준 값을 가공 없이 백엔드 계약 표기로 싣는다", () => {
    expect(toExplanationFacts(FORECAST_API_FIXTURE)).toEqual({
      pair_code: "USDKRW",
      horizon_days: 30,
      band_lower: 1_350,
      band_upper: 1_450,
      vol_30d: 0.08,
      vol_percentile_5y: 0.63,
      regime: "normal",
    });
  });
});
