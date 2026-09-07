import { describe, expect, it } from "vitest";
import {
  NOT_MEASURED_XRAY_API_FIXTURE,
  STRESS_RUN_FIXTURE,
  XRAY_API_FIXTURE,
} from "../../test/api-fixtures";
import {
  toAsOfLabel,
  toConcentrationStatusLabel,
  toDateLabel,
  toPercent,
  toShockLabel,
  toStressRunResult,
  toXRayDashboardData,
} from "./xray-presenter";

describe("표시용 변환", () => {
  it("비율을 소수 첫째 자리 퍼센트로 바꾼다", () => {
    expect(toPercent(0.7512)).toBe(75.1);
    expect(toPercent(0)).toBe(0);
  });

  it("집중도 판정 코드를 한국어 라벨로 바꾸고, 모르는 값은 그대로 둔다", () => {
    expect(toConcentrationStatusLabel("over")).toBe("기준선 초과");
    expect(toConcentrationStatusLabel("ok")).toBe("적정");
    expect(toConcentrationStatusLabel("watch")).toBe("관찰");
    expect(toConcentrationStatusLabel("unknown")).toBe("판정 불가");
    expect(toConcentrationStatusLabel("brand_new")).toBe("brand_new");
  });

  it("날짜는 로케일 형식으로, 없거나 해석 불가하면 그대로 둔다", () => {
    expect(toDateLabel("2026-08-20")).toMatch(/2026/);
    expect(toDateLabel("모름")).toBe("모름");
    expect(toDateLabel(undefined)).toBeUndefined();
  });

  it("기준 시각은 로케일 형식으로, 해석 불가하면 원문 그대로 둔다", () => {
    expect(toAsOfLabel("2026-09-06T22:32:19.043Z")).toMatch(/2026/);
    expect(toAsOfLabel("모름")).toBe("모름");
  });

  it("충격 라벨은 부호를 붙여 표시한다", () => {
    expect(toShockLabel(-0.2, 0.1)).toBe("주가 -20%, 환율 +10% 충격 가정");
    expect(toShockLabel(0.2, -0.1)).toBe("주가 +20%, 환율 -10% 충격 가정");
  });
});

describe("toXRayDashboardData", () => {
  it("서버 값을 화면 뷰 데이터로 옮긴다", () => {
    const data = toXRayDashboardData(XRAY_API_FIXTURE);

    expect(data.totalAssetKrw).toBe(20_000_000);
    expect(data.krwAmount).toBe(12_000_000);
    expect(data.fxKrw).toBe(8_000_000);
    expect(data.fxRatioPct).toBe(40);
    expect(data.fxSensitivity1pctKrw).toBe(80_000);
    expect(data.exposure).toEqual([
      { currencyCode: "USD", krw: 6_000_000, sharePct: 75 },
      { currencyCode: "JPY", krw: 2_000_000, sharePct: 25 },
    ]);
    expect(data.pnl.costBasisKrw).toBe(5_500_000);
    expect(data.pnl.totalValuationKrw).toBe(6_000_000);
    expect(data.pnl.totalReturnPct).toBe(9);
    expect(data.pnl.rows).toHaveLength(4);
    expect(data.pnl.rows[0]).toEqual({
      key: "asset",
      label: "자산 가격 효과",
      krw: 320_000,
      contributionPct: 5.8,
    });
    expect(data.pnl.holdings).toEqual([
      { ticker: "AAPL", krw: 3_200_000, returnPct: 15 },
      { ticker: "VOO", krw: 2_800_000, returnPct: -2 },
    ]);
    expect(data.asOfLabel).toMatch(/2026/);
  });

  it("시나리오를 서버가 준 정렬 순서대로 늘어놓는다", () => {
    const data = toXRayDashboardData(XRAY_API_FIXTURE);
    expect(data.scenarios.map((scenario) => scenario.code)).toEqual([
      "equity_down_krw_weak",
      "equity_down_krw_strong",
    ]);
    expect(data.scenarios[0]).toEqual({
      code: "equity_down_krw_weak",
      label: "주가 하락 + 원화 약세",
      equityShockPct: -20,
      fxShockPct: 10,
      referenceEvent: "2020년 3월 변동성 급등 참고",
      assumptionNote: "해외주식 평가액에 주가 충격을 먼저 적용합니다.",
    });
  });

  it("위험성향이 측정된 계정은 기준선과 등급을 함께 낸다", () => {
    const { concentration } = toXRayDashboardData(XRAY_API_FIXTURE);
    expect(concentration).toEqual({
      topCurrencyCode: "USD",
      sharePct: 75,
      status: "over",
      statusLabel: "기준선 초과",
      thresholdPct: 60,
      gapPp: 15,
      riskProfileStatus: "measured",
      gradeLabel: "중립형",
      diagnosedOnLabel: expect.stringMatching(/2026/),
      basisNote:
        "참고 기준선은 MVP 가설값이며 통계적으로 검증된 배분 기준이 아닙니다.",
    });
  });

  it("위험성향 미측정 계정은 기준선·등급 없이 변환된다", () => {
    const data = toXRayDashboardData(NOT_MEASURED_XRAY_API_FIXTURE);
    expect(data.exposure).toEqual([]);
    expect(data.scenarios).toEqual([]);
    expect(data.pnl.rows).toEqual([]);
    expect(data.pnl.holdings).toEqual([]);
    expect(data.concentration).toEqual({
      topCurrencyCode: undefined,
      sharePct: undefined,
      status: "unknown",
      statusLabel: "판정 불가",
      thresholdPct: undefined,
      gapPp: undefined,
      riskProfileStatus: "not_measured",
      gradeLabel: undefined,
      diagnosedOnLabel: undefined,
      basisNote: "참고 기준선은 MVP 가설값입니다.",
    });
  });
});

describe("toStressRunResult", () => {
  it("실행 결과를 화면 표시 값으로 옮긴다", () => {
    expect(toStressRunResult(STRESS_RUN_FIXTURE)).toEqual({
      scenarioCode: "equity_down_krw_weak",
      label: "주가 하락 + 원화 약세",
      shockLabel: "주가 -20%, 환율 +10% 충격 가정",
      totalEffectKrw: -520_000,
      equityEffectKrw: -1_200_000,
      fxEffectKrw: 680_000,
      afterFxAssetKrw: 7_480_000,
      conditionalNote: "주가와 환율이 동시에 움직이는 가정입니다.",
    });
  });
});
