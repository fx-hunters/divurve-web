/**
 * Swagger `/v3/api-docs`에서 확인한 API 계약 중 프론트에서 사용하는 타입.
 * 응답 키 변환은 `api/client.ts`에서 수행되므로 camelCase만 사용한다.
 */

export interface TokenResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
  readonly isDemo: boolean;
  readonly onboarded: boolean;
}

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface SignupRequest {
  readonly email: string;
  readonly password: string;
  readonly name: string;
  readonly onboardingPurpose?: string;
}

export interface RefreshRequest {
  readonly refreshToken: string;
}

export type HomeBlockKey =
  | "today"
  | "profile_fit"
  | "fx_status"
  | "goals_route"
  | "attention"
  | "forecast";

/** 데이터가 없는 블록도 생략되지 않고 이 상태로만 구분된다. */
export type HomeBlockState =
  | "filled"
  | "empty"
  | "route_pending"
  | "not_measured";

export interface HomeBlock {
  readonly order: number;
  readonly key: HomeBlockKey;
  readonly state: HomeBlockState;
}

export interface HomeActiveGoal {
  readonly id: string;
  readonly name: string;
  readonly currencyCode: string;
  readonly targetAmount: number;
  readonly targetDate: string;
  readonly status: string;
}

export interface HomeUpcomingEvent {
  readonly date: string;
  readonly title: string;
  readonly currencyCode: string;
  readonly importance: string;
}

/** 서버는 값이 없는 필드를 키째 생략하므로 하위 필드는 대부분 optional이다. */
export interface HomeSummaryResponse {
  readonly blocks: readonly HomeBlock[];
  readonly today: {
    readonly headlineCode?: string;
    readonly badge?: string;
  };
  readonly profileFit: {
    readonly grade?: string;
    readonly concentrationStatus?: string;
  };
  readonly fxStatus: {
    readonly fxRatio?: number;
    readonly topCurrencyCode?: string;
    readonly dayChangeKrw?: number;
    readonly sensitivity1pctKrw?: number;
  };
  readonly goalsRoute: {
    readonly activeGoals: readonly HomeActiveGoal[];
    readonly routeEnabled: boolean;
  };
  readonly attention: {
    readonly regimeBadge?: string;
    readonly upcomingEvents: readonly HomeUpcomingEvent[];
  };
  readonly forecast: {
    readonly pairCode?: string;
    readonly currentRate?: number;
    readonly interval80?: {
      readonly lo?: number;
      readonly hi?: number;
    };
  };
}

export interface ForecastHistory {
  readonly d: string;
  readonly rate: number;
}

export interface ForecastBandPoint {
  readonly d: string;
  readonly p50Lo: number;
  readonly p50Hi: number;
  readonly p80Lo: number;
  readonly p80Hi: number;
}

export interface ForecastModelPoint {
  readonly d: string;
  readonly rate: number;
}

export interface ForecastResponse {
  readonly pairCode: string;
  readonly horizonDays: number;
  readonly baseDate: string;
  readonly currentRate: number;
  readonly baseRate: number;
  readonly history: readonly ForecastHistory[];
  readonly band: readonly ForecastBandPoint[];
  readonly modelPath: readonly ForecastModelPoint[];
  readonly interval80: {
    readonly lo: number;
    readonly hi: number;
    readonly widthPct: number;
  };
  readonly volatility: {
    readonly regime: string;
    readonly vol30d: number;
    readonly volPercentile5y: number;
  };
  readonly userImpact: {
    readonly assetKrw: number;
    readonly per1pctKrw: number;
  };
  readonly labels: {
    readonly band: string;
    readonly modelPath: string;
  };
  readonly modelInfo: {
    readonly intervalLevels: readonly number[];
    readonly assumptions: string;
    readonly limitations: string;
  };
  readonly uncertaintyNote: string;
  readonly disclaimer: string;
}

export interface ForecastFactor {
  readonly key: string;
  readonly label: string;
  readonly contributionPp: number;
  readonly direction: string;
}

export interface FactorsResponse {
  readonly pairCode: string;
  readonly factors: readonly ForecastFactor[];
}

export interface ModelPerformanceResponse {
  readonly pairCode: string;
  readonly horizonDays: number;
  readonly model: {
    readonly hitRate: number;
    readonly mae: number;
    readonly coverage80: number;
    readonly avgWidth: number;
  };
  readonly randomWalk: {
    readonly hitRate: number;
    readonly mae: number;
  };
  readonly rwImprovement: number;
  readonly validation: {
    readonly method: string;
    readonly folds: number;
    readonly leakageGuard: boolean;
  };
  readonly note: string;
  readonly evaluatedAt: string;
}

export interface ForecastEvent {
  readonly date: string;
  readonly title: string;
  readonly currencyCode: string;
  readonly importance: string;
}

export interface EventsResponse {
  readonly events: readonly ForecastEvent[];
}

export interface ForecastBundle {
  readonly forecast: ForecastResponse;
  readonly factors: FactorsResponse;
  readonly performance: ModelPerformanceResponse;
  readonly events: EventsResponse;
  /** 서버가 응답 meta로 알려준 기준 시각(ISO 8601). */
  readonly asOf: string;
}

export interface XrayExposure {
  readonly currencyCode: string;
  readonly krw: number;
  readonly share: number;
}

/** 서버는 값이 없는 필드를 키째 생략하므로 대부분 optional이다. */
export interface XrayConcentration {
  readonly topCurrencyCode?: string;
  readonly share?: number;
  readonly status: string;
}

export interface XraySensitivity {
  readonly totalKrw: number;
  readonly byCurrency: Readonly<Record<string, number>>;
}

export interface XrayResponse {
  readonly totalAssetKrw: number;
  readonly krwAssetKrw: number;
  readonly fxAssetKrw: number;
  readonly fxRatio: number;
  readonly exposure: readonly XrayExposure[];
  readonly concentration: XrayConcentration;
  readonly dayChangeKrw?: number;
  readonly sensitivity1pct: XraySensitivity;
}

export interface AttributionComponent {
  readonly key: string;
  readonly label: string;
  readonly krw: number;
  readonly contributionPp: number;
}

export interface AttributionHolding {
  readonly ticker: string;
  readonly krw: number;
  readonly localReturn: number;
  readonly fxReturn: number;
  readonly krwReturn: number;
}

export interface AttributionResponse {
  readonly currencyCode?: string;
  readonly costBasisKrw: number;
  readonly currentKrw: number;
  readonly totalReturn: number;
  readonly components: readonly AttributionComponent[];
  readonly byHolding: readonly AttributionHolding[];
}

export interface FitRiskProfile {
  readonly status: string;
  readonly grade?: string;
  readonly gradeLabel?: string;
  readonly diagnosedOn?: string;
}

export interface FitRelation {
  readonly code: string;
  readonly facts: {
    readonly share?: number;
    /** 위험성향이 측정된 계정에만 채워진다. */
    readonly threshold?: number;
    readonly gapPp?: number;
  };
}

export interface FitResponse {
  readonly riskProfile: FitRiskProfile;
  readonly concentration: XrayConcentration;
  readonly relation: FitRelation;
  readonly basisNote: string;
}

export interface StressScenario {
  readonly scenarioCode: string;
  readonly nameKo: string;
  readonly equityShockPct: number;
  readonly fxShockPct: number;
  readonly referenceEvent: string;
  readonly assumptionNote: string;
  readonly isDefault: boolean;
  readonly sortOrder: number;
}

export interface StressScenarioListResponse {
  readonly scenarios: readonly StressScenario[];
}

export interface StressRunRequest {
  readonly scenarioCode: string;
}

export interface StressRunResponse {
  readonly id: string;
  readonly scenario: {
    readonly scenarioCode: string;
    readonly nameKo: string;
    readonly referenceEvent: string;
    readonly assumptionNote: string;
  };
  readonly baseDate: string;
  readonly shock: {
    readonly equityShockPct: number;
    readonly fxShockPct: number;
  };
  readonly before: {
    readonly equityAssetKrw: number;
    readonly fxAssetKrw: number;
  };
  readonly effects: {
    readonly equityEffectKrw: number;
    readonly fxEffectKrw: number;
    readonly totalEffectKrw: number;
  };
  readonly after: {
    readonly fxAssetKrw: number;
  };
  readonly interpretationCode: string;
  readonly conditionalNote: string;
}

export interface FitPreviewRequest {
  readonly currencyCode: string;
  readonly deltaShare: number;
}

export interface FitPreviewResponse {
  readonly assumption: string;
  readonly exposure: {
    readonly before: Readonly<Record<string, number>>;
    readonly after: Readonly<Record<string, number>>;
  };
  readonly concentration: XrayConcentration;
  readonly sensitivity1pct: {
    readonly before: Readonly<Record<string, number>>;
    readonly after: Readonly<Record<string, number>>;
  };
}

export interface XrayBundle {
  readonly overview: XrayResponse;
  readonly attribution: AttributionResponse;
  readonly fit: FitResponse;
  readonly scenarios: StressScenarioListResponse;
  /** 서버가 응답 meta로 알려준 기준 시각(ISO 8601). */
  readonly asOf: string;
}

export interface ProfileResponse {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly isDemo: boolean;
  readonly onboarded: boolean;
  readonly onboardedAt?: string;
}

/** 알림 설정 항목. `SettingsResponse`와 `SettingsUpdateRequest`가 공유한다. */
export type NotificationSettingKey =
  | "notifyStepDue"
  | "notifyRegimeShift"
  | "notifyDeadlineNear"
  | "notifyTargetZone"
  | "notifyConcentration";

export interface SettingsResponse {
  readonly defaultBankCode?: string;
  readonly fxDiscountRatio: number;
  readonly explainLevel: string;
  readonly explainDomain: string;
  readonly baseSpreadRatio: number;
  readonly effectiveSpreadRatio: number;
  readonly notifyStepDue: boolean;
  readonly notifyRegimeShift: boolean;
  readonly notifyDeadlineNear: boolean;
  readonly notifyTargetZone: boolean;
  readonly notifyConcentration: boolean;
}

export interface RiskProfileSimple {
  readonly answers: Readonly<Record<string, unknown>>;
  readonly rationale?: readonly unknown[];
  readonly mixedResponseNote?: string;
}

export interface RiskProfileDetail {
  readonly completed: boolean;
  readonly answered: Readonly<Record<string, unknown>>;
  readonly nextQuestion?: string;
  readonly titleModifier?: string;
}

export interface RiskProfileResponse {
  /** 예: "not_measured". 진단 전에도 200으로 내려온다. */
  readonly status: string;
  readonly grade?: string;
  readonly gradeLabel?: string;
  readonly score?: number;
  readonly diagnosedOn?: string;
  readonly concentrationThreshold?: number;
  readonly simple?: RiskProfileSimple;
  readonly detail?: RiskProfileDetail;
  readonly limitationNote?: string;
}

export interface NotificationDto {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly message: string;
  readonly createdAt: string;
  readonly read: boolean;
}

export interface NotificationsResponse {
  readonly notifications: readonly NotificationDto[];
}

export interface MyPageBundle {
  readonly profile: ProfileResponse;
  readonly settings: SettingsResponse;
  /** 진단 전에도 `status: "not_measured"`로 내려온다. 404일 때만 null. */
  readonly riskProfile: RiskProfileResponse | null;
  readonly notifications: NotificationsResponse;
}

export interface SettingsUpdateRequest {
  readonly defaultBankCode?: string;
  readonly fxDiscountRatio?: number;
  readonly explainLevel?: string;
  readonly explainDomain?: string;
  readonly notifyStepDue?: boolean;
  readonly notifyRegimeShift?: boolean;
  readonly notifyDeadlineNear?: boolean;
  readonly notifyTargetZone?: boolean;
  readonly notifyConcentration?: boolean;
}

export interface GoalResponse {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly purpose: string;
  readonly currencyCode: string;
  readonly targetAmount: number;
  readonly targetDate?: string;
  readonly recurInterval?: string;
  readonly budgetAmount?: number;
  readonly budgetCurrencyCode?: string;
  readonly budgetPeriod?: string;
  readonly isSpeculative: boolean;
  readonly status: string;
  readonly heldAmount: number;
  readonly suggested?: {
    readonly safeRatio: number;
    readonly floor: number;
    readonly splitCount: number;
  };
}

export interface GoalListResponse {
  readonly goals: readonly GoalResponse[];
}

export interface PlanStep {
  readonly seq: number;
  readonly scheduledDate: string;
  readonly amount: number;
  readonly krwEstimate: number;
  readonly executedAmount?: number;
  readonly status: string;
}

export interface ActivePlanResponse {
  readonly id: string;
  readonly goalId: string;
  readonly version: number;
  readonly isActive: boolean;
  readonly reason: string;
  readonly safeRatio: number;
  readonly splitCount: number;
  readonly opportunityAmount: number;
  readonly opportunityTriggerRate: number;
  readonly steps: readonly PlanStep[];
}

export interface StepCompleteRequest {
  readonly executedAmount: number;
  readonly executedRate: number;
}

export interface StepCompleteResponse {
  readonly seq: number;
  readonly status: string;
  readonly executedAmount: number;
  readonly executedRate: number;
  readonly remainingAmount: number;
}

export interface StepSkipResponse {
  readonly redistributed: {
    readonly perStepBefore: number;
    readonly perStepAfter: number;
    readonly increasePct: number;
  };
  readonly achieveProb: {
    readonly before: number;
    readonly after: number;
  };
  readonly consecutiveSkips: number;
  readonly safeModeTriggered: boolean;
  readonly newPlanVersion: number;
}
