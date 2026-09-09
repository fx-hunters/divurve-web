import type { ApiResult } from "../api/client";
import type {
  FitPreviewResponse,
  ForecastBundle,
  HomeSummaryResponse,
  MyPageBundle,
  NotificationDto,
  SettingsResponse,
  StressRunResponse,
} from "../api/generated/divurve-api";
import type { PlannerApiOverview } from "../api/planner";
import type { XrayApiBundle } from "../api/xray";
import type { ImportedAssetSummary } from "../types/assets";

/** 온보딩 2단계가 표시하는 자산 요약. 금액은 환율에 따라 달라지므로 예시일 뿐이다. */
export const IMPORTED_ASSET_SUMMARY_FIXTURE: ImportedAssetSummary = {
  totalAssetKrw: 100_058_000,
  fxAssetKrw: 64_058_000,
  krwAssetKrw: 36_000_000,
  currencyCodes: ["USD", "JPY", "EUR"],
  asOf: "2026-09-07T09:30:00Z",
  isSampleData: true,
  hasAssets: true,
  holdings: [
    { id: "holding-1", ticker: "AAPL", currencyCode: "USD", quantity: 12 },
  ],
  deposits: [
    { id: "deposit-1", currencyCode: "JPY", amount: 400_000 },
  ],
  krwAssets: [
    { id: "krw-1", kind: "cash", label: "생활비 통장", amountKrw: 12_000_000 },
  ],
};

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
    model: { mae: 0.031, coverage80: 0.82, avgWidth: 0.073 },
    randomWalk: { mae: 0.035 },
    rwImprovement: 0.14,
    validation: { method: "rolling_walk_forward", folds: 5, leakageGuard: true },
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

export const XRAY_API_FIXTURE: XrayApiBundle = {
  isSampleData: true,
  overview: {
    totalAssetKrw: 20_000_000,
    krwAssetKrw: 12_000_000,
    fxAssetKrw: 8_000_000,
    fxRatio: 0.4,
    exposure: [
      { currencyCode: "USD", krw: 6_000_000, share: 0.75 },
      { currencyCode: "JPY", krw: 2_000_000, share: 0.25 },
    ],
    concentration: {
      topCurrencyCode: "USD",
      share: 0.75,
      status: "above_threshold",
    },
    dayChangeKrw: 30_000,
    sensitivity1pct: { totalKrw: 80_000, byCurrency: { USD: 60_000 } },
  },
  attribution: {
    currencyCode: "USD",
    costBasisKrw: 5_500_000,
    currentKrw: 6_000_000,
    totalReturn: 0.09,
    components: [
      // `contribution_pp` 는 서버가 0~1 비율로 준다(`GET /xray/attribution` 실제 응답 확인).
      { key: "asset", label: "자산 가격 효과", krw: 320_000, contributionPp: 0.058 },
      { key: "fx", label: "환율 효과", krw: 180_000, contributionPp: 0.032 },
      { key: "interaction", label: "상호작용", krw: -20_000, contributionPp: -0.004 },
      { key: "cost", label: "비용", krw: 0, contributionPp: 0 },
    ],
    byHolding: [
      { ticker: "AAPL", krw: 3_200_000, localReturn: 0.12, fxReturn: 0.03, krwReturn: 0.15 },
      { ticker: "VOO", krw: 2_800_000, localReturn: 0.04, fxReturn: 0.03, krwReturn: -0.02 },
    ],
  },
  fit: {
    riskProfile: {
      status: "simple_done",
      grade: "balanced",
      gradeLabel: "균형항로형",
      diagnosedOn: "2026-08-20",
    },
    concentration: {
      topCurrencyCode: "USD",
      share: 0.75,
      status: "above_threshold",
    },
    relation: {
      // `gap_pp` 는 서버가 준 `share − threshold` 로 이미 0~1 비율이다.
      code: "concentration_above_profile",
      facts: { share: 0.75, threshold: 0.6, gapPp: 0.15 },
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
export const NOT_MEASURED_XRAY_API_FIXTURE: XrayApiBundle = {
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
  interpretationCode: "fx_cushions_equity_loss",
  conditionalNote: "주가와 환율이 동시에 움직이는 가정입니다.",
};

/**
 * 실제 응답(`POST /api/v1/fit/preview`, 2026-09-08). JPY 를 10%p 늘린 가정이다.
 * `concentration` 이 `{before, after, threshold}` 인 것이 이 응답의 핵심이다 —
 * 예전 픽스처는 `/xray` 의 `concentration` 모양을 베껴 와 실제와 달랐다.
 */
export const FIT_PREVIEW_FIXTURE: FitPreviewResponse = {
  assumption:
    "외화자산 총액 61,704,920원을 고정한 채 JPY 비중만 10%p 높인 가정입니다.",
  exposure: {
    before: { USD: 0.9182, JPY: 0.0565, EUR: 0.0253 },
    after: { USD: 0.8209, JPY: 0.1565, EUR: 0.0226 },
  },
  concentration: {
    before: {
      topCurrencyCode: "USD",
      share: 0.9182,
      status: "above_threshold",
    },
    after: {
      topCurrencyCode: "USD",
      share: 0.8209,
      status: "above_threshold",
    },
    threshold: 0.6,
  },
  sensitivity1pct: {
    before: { USD: 566_577, JPY: 34_862, EUR: 15_610, total_krw: 617_049 },
    after: { USD: 506_534, JPY: 96_557, EUR: 13_958, total_krw: 617_049 },
  },
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

/**
 * `GET /api/v1/notifications` 응답.
 *
 * 2026-09-08 데모 세션 토큰으로 받은 **실제 응답을 그대로** 옮겼다
 * (`client.ts`가 `is_read`→`isRead`로 바꾼 뒤의 형태). FE 타입에서 역산하지
 * 않는다 — 필드명이 어긋난 채로 커버리지 100%가 유지된 것이 이슈 #52다.
 */
export const NOTIFICATIONS_FIXTURE: readonly NotificationDto[] = [
  {
    id: "0fc0bc6e-9277-4ed3-8d98-4b10ee2eb802",
    kind: "target_zone",
    title: "목표 구간에 가까워지고 있어요",
    body: "미국 대학원 학비 목표가 목표 금액의 약 70%에 도달했습니다.",
    createdAt: "2026-09-08T04:26:39.969510Z",
    isRead: false,
  },
];

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
    // 실제 응답(2026-09-08). status·grade·gradeLabel 모두 서버가 보낸 값 그대로다.
    status: "simple_done",
    grade: "balanced",
    gradeLabel: "균형항로형",
    score: 4,
    diagnosedOn: "2026-09-08",
    concentrationThreshold: 0.6,
    limitationNote:
      "이 판정은 해커톤 MVP용 가설이며 통계적으로 검증된 금융회사 표준 진단이 아닙니다.",
  },
  notifications: { notifications: NOTIFICATIONS_FIXTURE },
};

/**
 * 플래너 픽스처.
 *
 * 계획 부분은 실제 백엔드 응답(`POST /api/v1/plans/preview`, 2026-09-08)과
 * `PlanResponse` DTO 를 그대로 옮겼다 — 프론트 타입에서 역산하지 않는다.
 * 예전 픽스처가 프론트 타입 기준이라 계약 드리프트(H2)가 커버리지 100% 인
 * 채로 살아남았다.
 *
 * 저장된 계획 조회는 `planId`·`version` 이 있고 `warnings` 가 빈 배열이며
 * (`PlanResponseMapper.toPlanResponse`), 미리보기는 그 반대다.
 */
/**
 * 서버가 모든 계획 응답에 실어 보내는 고지 문장 (백엔드 `PlanResponse.DISCLAIMER`,
 * 명세 §2·§26). 프론트가 다시 쓰지 않고 응답 값을 그대로 표시한다.
 */
export const PLAN_DISCLAIMER =
  "이 계획은 조건부 계산 결과이며 목표 달성이나 환율 범위를 보장하지 않습니다. " +
  "Divurve 는 환전을 실행하지 않으며 환율 방향이나 매매 시점을 추천하지 않습니다.";

export const PLANNER_API_FIXTURE: PlannerApiOverview = {
  isDemo: false,
  isSampleData: true,
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
        planId: "plan-usd",
        goalId: "goal-usd",
        version: 2,
        calculationMeta: {
          calculatedAt: "2026-09-08T04:34:58.567601733Z",
          rateAsOf: "2026-09-08T00:00:00Z",
          forecastAsOf: "2026-09-08T00:00:00Z",
          policyVersion: "plan-2026.09.1-equal-split",
          currencyCode: "USD",
          quoteUnit: 1,
          rates: { low: 1_313.2211410234067, base: 1_342.6, high: 1_372.6361110781652 },
          spreadRatio: 0.009625000000000002,
          feeKrw: 10_000,
        },
        goal: {
          goalType: "deadline",
          purpose: "investment",
          currencyCode: "USD",
          targetAmount: 3_000,
          roundBudgetKrw: null,
          // 저장된 Plan 응답은 완료 회차를 이미 포함한 현재 목표 확보액을 반환한다.
          allocatedHoldingAmount: 1_405,
          remainingAmount: 1_595,
          targetDate: "2026-12-31",
        },
        summary: {
          status: "active",
          planEndDate: "2026-12-26",
          totalRounds: 2,
          completedRounds: 1,
          scheduledRounds: 1,
          skippedRounds: 0,
          nextActionSeq: 2,
          estimatedCost: { lowKrw: 380_834, baseKrw: 389_354, highKrw: 398_064 },
          budgetState: "COVERED_IN_RANGE",
          cumulativeAcquisition: null,
        },
        steps: [
          {
            seq: 1,
            scheduledDate: "2026-09-01",
            amount: 145,
            budgetKrw: null,
            estimatedCost: { lowKrw: 190_417, baseKrw: 194_677, highKrw: 199_032 },
            acquisition: null,
            executedAmount: 145,
            executedRate: 1_395,
            executedDate: "2026-09-01",
            status: "completed",
            nextAction: false,
          },
          {
            seq: 2,
            scheduledDate: "2026-09-12",
            amount: 145,
            budgetKrw: null,
            estimatedCost: { lowKrw: 190_417, baseKrw: 194_677, highKrw: 199_032 },
            acquisition: null,
            executedAmount: 0,
            executedRate: null,
            executedDate: null,
            status: "due",
            nextAction: true,
          },
        ],
        warnings: [],
        disclaimer: PLAN_DISCLAIMER,
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

/**
 * `GET /api/v1/home/summary` 실제 응답 형태 그대로다(2026-09 데모 세션에서 확인).
 * `goals_route` 의 키는 `active_goals` 하나뿐이며, `route_enabled`·`route_pending`
 * 은 divurve-api#84 에서 사라졌다. 배지 어휘는 `normal`·`caution`·`turbulent` 3종.
 */
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
      // 서버가 원화 평가액 내림차순으로 정렬해 준다(NFR-UI-01).
      exposure: [
        { currencyCode: "USD", krw: 15_790_000, share: 0.6388 },
        { currencyCode: "JPY", krw: 8_926_000, share: 0.3612 },
      ],
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
      // 스파크라인용. 홈 요약은 날짜 키가 `date` 다(`/forecast` 는 `d`).
      history: [
        { date: "2026-09-02", rate: 1_351.2 },
        { date: "2026-09-03", rate: 1_377.8 },
        { date: "2026-09-04", rate: 1_365.1 },
        { date: "2026-09-05", rate: 1_382.4 },
      ],
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
      { order: 4, key: "goals_route", state: "empty" },
      { order: 5, key: "attention", state: "filled" },
      { order: 6, key: "forecast", state: "filled" },
    ],
    today: { headlineCode: "vol_normal_usd", badge: "normal" },
    profileFit: { concentrationStatus: "unknown" },
    fxStatus: {
      fxRatio: 1.0,
      topCurrencyCode: "USD",
      sensitivity1pctKrw: 93_806,
      exposure: [{ currencyCode: "USD", krw: 9_380_550, share: 1.0 }],
    },
    goalsRoute: { activeGoals: [] },
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
    goalsRoute: { activeGoals: [] },
    attention: { upcomingEvents: [] },
    forecast: {},
  },
  meta: { asOf: "2026-09-06T22:32:09.924Z" },
};
