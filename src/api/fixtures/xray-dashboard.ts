import type { ImportedAssetSummary } from "../../types/assets";
import type { XRayDashboardData } from "../../types/xray";

export const DEMO_XRAY_DATA: XRayDashboardData = {
  fxRatioPct: 64,
  fxKrw: 64000000,
  krwAmount: 36000000,
  exposureBreakdown: {
    usd: 85,
    jpy: 10,
    eur: 5,
    baselinePct: 60,
  },
  scheduledExpenditure: {
    title: "미국 주식 정기매수",
    dateLabel: "매월 25일",
    amountUsd: 1200,
  },
  fxSensitivity1PctKrw: 640000,
  pnl: {
    costBasisKrw: 58000000,
    stockReturnKrw: 4200000,
    stockReturnPct: 7.2,
    fxReturnKrw: 2100000,
    fxReturnPct: 3.6,
    interactionKrw: -150000,
    interactionPct: -0.2,
    totalValuationKrw: 64150000,
    totalReturnPct: 10.6,
    stockHoldings: [
      { symbol: "AAPL", returnPct: 12.4 },
      { symbol: "TSLA", returnPct: -3.2 },
    ],
  },
  scenarios: [
    {
      id: "2008",
      label: "2008 금융위기",
      stockShockPct: -30,
      fxShockPct: 15,
      resultKrw: 52400000,
      title: "주가 -30%, 환율 +15% 충격 가정",
      defenseMessage: "포트폴리오 방어 효과 작동",
    },
    {
      id: "2020",
      label: "2020 팬데믹",
      stockShockPct: -25,
      fxShockPct: 8,
      resultKrw: 54800000,
      title: "주가 -25%, 환율 +8% 충격 가정",
      defenseMessage: "단기 급락 후 달러 강세 완충",
    },
    {
      id: "custom",
      label: "직접 설정",
      stockShockPct: -20,
      fxShockPct: 10,
      resultKrw: 56100000,
      title: "주가 -20%, 환율 +10% 시나리오",
      defenseMessage: "사용자 맞춤 시나리오 적용",
    },
  ],
  concentrationPct: 85,
  concentrationBaselinePct: 60,
  currencyTraits: [
    {
      currency: "USD",
      volatility: "보통",
      liquidity: "매우 높음",
      diversificationContribution: "낮음",
      isHighContribution: false,
    },
    {
      currency: "JPY",
      volatility: "높음",
      liquidity: "높음",
      diversificationContribution: "매우 높음",
      isHighContribution: true,
    },
    {
      currency: "EUR",
      volatility: "보통",
      liquidity: "높음",
      diversificationContribution: "높음",
      isHighContribution: true,
    },
  ],
};

export const MOCK_IMPORTED_ASSET_SUMMARY: ImportedAssetSummary = {
  assetSource: "mock_import",
  sourceLabel: "체험용 자산 데이터",
  foreignAssetLabel: "외화·해외자산",
  foreignAssetValue: "64,000,000원",
  krwAssetLabel: "원화 자산",
  krwAssetValue: "36,000,000원",
  currenciesLabel: "USD · JPY · EUR",
  importedAtLabel: "방금 불러옴",
};
