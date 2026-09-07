import type { ApiResult } from "../api/client";
import type {
  FitPreviewResponse,
  ForecastBundle,
  HomeSummaryResponse,
  MyPageBundle,
  SettingsResponse,
  StressRunResponse,
  XrayBundle,
} from "../api/generated/divurve-api";
import type { PlannerApiOverview } from "../api/planner";

export const FORECAST_API_FIXTURE: ForecastBundle = {
  forecast: {
    pairCode: "USDKRW",
    horizonDays: 30,
    baseDate: "2026-09-04",
    currentRate: 1_400,
    baseRate: 1_395,
    history: [
      { d: "2026-09-01", rate: 1_390 },
      { d: "2026-09-02", rate: 1_400 },
    ],
    band: [
      {
        d: "2026-09-02",
        p50Lo: 1_380,
        p50Hi: 1_420,
        p80Lo: 1_360,
        p80Hi: 1_440,
      },
      {
        d: "2026-09-30",
        p50Lo: 1_370,
        p50Hi: 1_430,
        p80Lo: 1_350,
        p80Hi: 1_450,
      },
    ],
    modelPath: [
      { d: "2026-09-02", rate: 1_401 },
      { d: "2026-09-30", rate: 1_410 },
    ],
    interval80: { lo: 1_350, hi: 1_450, widthPct: 0.071 },
    volatility: { regime: "normal", vol30d: 0.08, volPercentile5y: 0.63 },
    userImpact: { assetKrw: 1_200_000, per1pctKrw: 12_000 },
    labels: { band: "예측 범위 / 불확실성 구간", modelPath: "모델의 참고 중심 경로" },
    modelInfo: {
      intervalLevels: [0.5, 0.8],
      assumptions: "드리프트 0 기준선에 30일 변동성을 적용한 구간입니다.",
      limitations: "실제 환율은 구간을 벗어날 수 있습니다.",
    },
    uncertaintyNote: "USDKRW 변동성은 5년 분포의 평시 범위입니다.",
    disclaimer: "서버 제공 범위이며 결과를 보장하지 않습니다.",
  },
  factors: {
    pairCode: "USDKRW",
    factors: [
      { key: "rate", label: "금리 차", contributionPp: 0.4, direction: "bullish" },
      { key: "risk", label: "위험 선호", contributionPp: -0.2, direction: "BEARISH" },
      { key: "flow", label: "수급", contributionPp: 0, direction: "neutral" },
    ],
  },
  performance: {
    pairCode: "USDKRW",
    horizonDays: 30,
    model: { hitRate: 0.61, mae: 0.031, coverage80: 0.82, avgWidth: 0.073 },
    randomWalk: { hitRate: 0.5, mae: 0.035 },
    rwImprovement: 0.14,
    validation: { method: "walk-forward", folds: 5, leakageGuard: true },
    note: "과거 검증 결과입니다.",
    evaluatedAt: "2026-09-04T00:00:00Z",
  },
  events: {
    events: [
      {
        date: "2026-09-12",
        title: "미국 물가 발표",
        currencyCode: "USD",
        importance: "High",
      },
      {
        date: "2026-09-15",
        title: "일본 정책 회의",
        currencyCode: "JPY",
        importance: "Medium",
      },
    ],
  },
  asOf: "2026-09-06T22:14:01.070Z",
};

export const EMPTY_FORECAST_API_FIXTURE: ForecastBundle = {
  ...FORECAST_API_FIXTURE,
  forecast: {
    ...FORECAST_API_FIXTURE.forecast,
    history: [],
    band: [],
    modelPath: [],
  },
  factors: { pairCode: "USDKRW", factors: [] },
  events: { events: [] },
};

export const XRAY_API_FIXTURE: XrayBundle = {
  overview: {
    totalAssetKrw: 20_000_000,
    krwAssetKrw: 12_000_000,
    fxAssetKrw: 8_000_000,
    fxRatio: 0.4,
    exposure: [
      { currencyCode: "USD", krw: 6_000_000, share: 0.75 },
      { currencyCode: "JPY", krw: 2_000_000, share: 0.25 },
    ],
    concentration: { topCurrencyCode: "USD", share: 0.75, status: "over" },
    dayChangeKrw: 30_000,
    sensitivity1pct: { totalKrw: 80_000, byCurrency: { USD: 60_000 } },
  },
  attribution: {
    currencyCode: "USD",
    costBasisKrw: 5_500_000,
    currentKrw: 6_000_000,
    totalReturn: 0.09,
    components: [
      { key: "asset", label: "자산 가격 효과", krw: 320_000, contributionPp: 5.8 },
      { key: "fx", label: "환율 효과", krw: 180_000, contributionPp: 3.2 },
      { key: "interaction", label: "상호작용", krw: -20_000, contributionPp: -0.4 },
      { key: "cost", label: "비용", krw: 0, contributionPp: 0 },
    ],
    byHolding: [
      { ticker: "AAPL", krw: 3_200_000, localReturn: 0.12, fxReturn: 0.03, krwReturn: 0.15 },
      { ticker: "VOO", krw: 2_800_000, localReturn: 0.04, fxReturn: 0.03, krwReturn: -0.02 },
    ],
  },
  fit: {
    riskProfile: {
      status: "measured",
      grade: "B",
      gradeLabel: "중립형",
      diagnosedOn: "2026-08-20",
    },
    concentration: { topCurrencyCode: "USD", share: 0.75, status: "over" },
    relation: {
      code: "concentration_over_threshold",
      facts: { share: 0.75, threshold: 0.6, gapPp: 15 },
    },
    basisNote: "참고 기준선은 MVP 가설값이며 통계적으로 검증된 배분 기준이 아닙니다.",
  },
  scenarios: {
    scenarios: [
      {
        scenarioCode: "equity_down_krw_strong",
        nameKo: "주가 하락 + 원화 강세",
        equityShockPct: -0.2,
        fxShockPct: -0.1,
        referenceEvent: "2008년 금융위기 이후 원화 반등 국면 참고",
        assumptionNote: "해외주식 평가액에 주가 충격을 먼저 적용합니다.",
        isDefault: true,
        sortOrder: 2,
      },
      {
        scenarioCode: "equity_down_krw_weak",
        nameKo: "주가 하락 + 원화 약세",
        equityShockPct: -0.2,
        fxShockPct: 0.1,
        referenceEvent: "2020년 3월 변동성 급등 참고",
        assumptionNote: "해외주식 평가액에 주가 충격을 먼저 적용합니다.",
        isDefault: true,
        sortOrder: 1,
      },
    ],
  },
  asOf: "2026-09-06T22:32:19.043Z",
};

/** 위험성향 미측정 + 자산 없음 계정. 서버는 값이 없는 필드를 키째 생략한다. */
export const NOT_MEASURED_XRAY_API_FIXTURE: XrayBundle = {
  ...XRAY_API_FIXTURE,
  overview: {
    ...XRAY_API_FIXTURE.overview,
    exposure: [],
    concentration: { status: "unknown" },
  },
  attribution: {
    ...XRAY_API_FIXTURE.attribution,
    components: [],
    byHolding: [],
  },
  fit: {
    riskProfile: { status: "not_measured" },
    concentration: { status: "unknown" },
    relation: { code: "risk_profile_not_measured", facts: {} },
    basisNote: "참고 기준선은 MVP 가설값입니다.",
  },
  scenarios: { scenarios: [] },
};

export const STRESS_RUN_FIXTURE: StressRunResponse = {
  id: "run-1",
  scenario: {
    scenarioCode: "equity_down_krw_weak",
    nameKo: "주가 하락 + 원화 약세",
    referenceEvent: "2020년 3월 변동성 급등 참고",
    assumptionNote: "해외주식 평가액에 주가 충격을 먼저 적용합니다.",
  },
  baseDate: "2026-09-04",
  shock: { equityShockPct: -0.2, fxShockPct: 0.1 },
  before: { equityAssetKrw: 6_000_000, fxAssetKrw: 8_000_000 },
  effects: {
    equityEffectKrw: -1_200_000,
    fxEffectKrw: 680_000,
    totalEffectKrw: -520_000,
  },
  after: { fxAssetKrw: 7_480_000 },
  interpretationCode: "loss_within_range",
  conditionalNote: "주가와 환율이 동시에 움직이는 가정입니다.",
};

export const FIT_PREVIEW_FIXTURE: FitPreviewResponse = {
  assumption: "앞으로의 매수만 조정한다고 가정합니다.",
  exposure: { before: { USD: 0.75 }, after: { USD: 0.68 } },
  concentration: { topCurrencyCode: "USD", share: 0.68, status: "watch" },
  sensitivity1pct: { before: { USD: 60_000 }, after: { USD: 54_000 } },
};

export const MY_PAGE_SETTINGS_FIXTURE: SettingsResponse = {
  defaultBankCode: "001",
  fxDiscountRatio: 0.8,
  explainLevel: "simple",
  explainDomain: "plain",
  baseSpreadRatio: 0.01,
  effectiveSpreadRatio: 0.002,
  notifyStepDue: true,
  notifyRegimeShift: true,
  notifyDeadlineNear: true,
  notifyTargetZone: false,
  notifyConcentration: true,
};

export const MY_PAGE_API_FIXTURE: MyPageBundle = {
  profile: {
    userId: "user-1",
    email: "planner@example.com",
    name: "플래너 사용자",
    isDemo: false,
    onboarded: true,
    onboardedAt: "2026-09-01T00:00:00Z",
  },
  settings: MY_PAGE_SETTINGS_FIXTURE,
  riskProfile: {
    status: "measured",
    grade: "balanced",
    gradeLabel: "균형 항로형",
    score: 72,
    diagnosedOn: "2026-08-15",
    concentrationThreshold: 0.5,
    limitationNote:
      "이 판정은 해커톤 MVP용 가설이며 통계적으로 검증된 금융회사 표준 진단이 아닙니다.",
  },
  notifications: {
    notifications: [
      {
        id: "notice-1",
        type: "plan",
        title: "회차 확인",
        message: "다음 준비 일정을 확인하세요.",
        createdAt: "2026-09-07T00:00:00Z",
        read: false,
      },
    ],
  },
};

export const PLANNER_API_FIXTURE: PlannerApiOverview = {
  items: [
    {
      goal: {
        id: "goal-usd",
        name: "미국 ETF 준비",
        kind: "recurring",
        purpose: "investment",
        currencyCode: "USD",
        targetAmount: 3_000,
        targetDate: "2026-12-31",
        isSpeculative: false,
        status: "active",
        heldAmount: 1_260,
      },
      activePlan: {
        id: "plan-usd",
        goalId: "goal-usd",
        version: 2,
        isActive: true,
        reason: "서버가 반환한 계획 설명입니다.",
        safeRatio: 0.6,
        splitCount: 3,
        opportunityAmount: 200,
        opportunityTriggerRate: 1_350,
        steps: [
          {
            seq: 1,
            scheduledDate: "2026-09-01",
            amount: 145,
            krwEstimate: 203_000,
            executedAmount: 145,
            status: "completed",
          },
          {
            seq: 2,
            scheduledDate: "2026-09-12",
            amount: 145,
            krwEstimate: 203_000,
            status: "pending",
          },
        ],
      },
    },
    {
      goal: {
        id: "goal-jpy",
        name: "일본 여행 준비",
        kind: "deadline",
        purpose: "travel",
        currencyCode: "JPY",
        targetAmount: 180_000,
        isSpeculative: false,
        status: "active",
        heldAmount: 40_000,
      },
      activePlan: null,
    },
  ],
};

export const HOME_SUMMARY_FIXTURE: ApiResult<HomeSummaryResponse> = {
  data: {
    blocks: [
      { order: 1, key: "today", state: "filled" },
      { order: 2, key: "profile_fit", state: "filled" },
      { order: 3, key: "fx_status", state: "filled" },
      { order: 4, key: "goals_route", state: "filled" },
      { order: 5, key: "attention", state: "filled" },
      { order: 6, key: "forecast", state: "filled" },
    ],
    today: { headlineCode: "vol_elevated_usd", badge: "caution" },
    profileFit: { grade: "balanced", concentrationStatus: "above_threshold" },
    fxStatus: {
      fxRatio: 0.361,
      topCurrencyCode: "USD",
      dayChangeKrw: 84_000,
      sensitivity1pctKrw: 247_200,
    },
    goalsRoute: {
      activeGoals: [
        {
          id: "goal-1",
          name: "도쿄 여행",
          currencyCode: "JPY",
          targetAmount: 300_000,
          targetDate: "2026-12-20",
          status: "active",
        },
      ],
      routeEnabled: true,
    },
    attention: {
      regimeBadge: "caution",
      upcomingEvents: [
        {
          date: "2026-09-09",
          title: "Federal Funds Rate Decision",
          currencyCode: "USD",
          importance: "High",
        },
        {
          date: "2026-09-18",
          title: "Retail Sales",
          currencyCode: "USD",
          importance: "Medium",
        },
      ],
    },
    forecast: {
      pairCode: "USDKRW",
      currentRate: 1_382.4,
      interval80: { lo: 1_330.6, hi: 1_389.02 },
    },
  },
  meta: { asOf: "2026-09-06T22:32:09.924Z" },
};

/** 위험성향 미측정 + 자산·목표 없음. 서버는 값 없는 필드를 키째 생략한다. */
export const SPARSE_HOME_SUMMARY_FIXTURE: ApiResult<HomeSummaryResponse> = {
  data: {
    blocks: [
      { order: 1, key: "today", state: "filled" },
      { order: 2, key: "profile_fit", state: "not_measured" },
      { order: 3, key: "fx_status", state: "filled" },
      { order: 4, key: "goals_route", state: "route_pending" },
      { order: 5, key: "attention", state: "filled" },
      { order: 6, key: "forecast", state: "filled" },
    ],
    today: { headlineCode: "vol_normal_usd", badge: "normal" },
    profileFit: { concentrationStatus: "unknown" },
    fxStatus: {
      fxRatio: 1.0,
      topCurrencyCode: "USD",
      sensitivity1pctKrw: 93_806,
    },
    goalsRoute: { activeGoals: [], routeEnabled: false },
    attention: { regimeBadge: "normal", upcomingEvents: [] },
    forecast: {
      pairCode: "USDKRW",
      currentRate: 1_359.5,
      interval80: { lo: 1_330.6, hi: 1_389.02 },
    },
  },
  meta: { asOf: "2026-09-06T22:32:09.924Z" },
};

/** 모든 블록이 비어 있는 계정. 홈은 빈 화면으로 떨어진다. */
export const EMPTY_HOME_SUMMARY_FIXTURE: ApiResult<HomeSummaryResponse> = {
  data: {
    blocks: [
      { order: 1, key: "today", state: "empty" },
      { order: 2, key: "profile_fit", state: "empty" },
      { order: 3, key: "fx_status", state: "empty" },
      { order: 4, key: "goals_route", state: "empty" },
      { order: 5, key: "attention", state: "empty" },
      { order: 6, key: "forecast", state: "empty" },
    ],
    today: {},
    profileFit: {},
    fxStatus: {},
    goalsRoute: { activeGoals: [], routeEnabled: false },
    attention: { upcomingEvents: [] },
    forecast: {},
  },
  meta: { asOf: "2026-09-06T22:32:09.924Z" },
};
