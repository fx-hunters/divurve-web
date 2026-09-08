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

/**
 * 데이터가 없는 블록도 생략되지 않고 이 상태로만 구분된다.
 *
 * `route_pending`은 목표 Route 기능 플래그와 함께 사라졌다(divurve-api#84) —
 * 계산이 확정돼 "아직 준비 중"인 상태가 더는 발생하지 않는다.
 */
export type HomeBlockState = "filled" | "empty" | "not_measured";

/**
 * 시장 국면 배지 3종. 백엔드 `RegimeBadgeMapper.Badge`가 국면 4종
 * (`calm`·`normal`·`elevated`·`stress`)을 이 3종으로 옮겨 실어 준다. 매핑 책임은
 * 서버에 있으므로 프론트는 이 값을 그대로 그리기만 한다(API 명세 v2 §2).
 */
export type HomeBadge = "normal" | "caution" | "turbulent";

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
    /** 어휘는 `HomeBadge`. 응답은 런타임 검증을 거치지 않아 문자열로 받고 표시 계층에서 좁힌다. */
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
  };
  readonly attention: {
    /** 어휘는 `HomeBadge`. `today.badge`와 같은 이유로 문자열로 받는다. */
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

/**
 * X-Ray·적합도 화면이 읽는 서버 Enum 어휘.
 *
 * 값은 백엔드 스키마의 `allowableValues` 를 그대로 옮긴 것이며, 임의로 늘리지 않는다
 * (AGENTS.md §4). 라벨·판정 테이블은 `Record<string, T>` 가 아니라 이 유니온을 키로 하는
 * `Record<유니온, T>` 로 선언한다 — 어휘가 빠지거나 서버에 없는 코드를 적으면
 * `tsc --noEmit` 이 잡는다. `?? fallback` 으로 모르는 코드를 흘려보내면 경고가 영구히
 * 꺼져도 아무도 모른다(이슈 #45·#53·#54가 모두 같은 형태였다).
 */

/** `XrayResponse.Concentration.status` · `FitResponse.Concentration.status`. */
export type ConcentrationStatus =
  | "above_threshold"
  | "within_threshold"
  | "unknown";

/** `FitResponse.RiskProfile.status`. 진단 전에도 200 + `not_measured` 로 온다. */
export type RiskProfileStatus = "not_measured" | "simple_done" | "detail_done";

/**
 * 위험성향 등급. `FitResponse.RiskProfile.grade` 와
 * `HomeSummaryResponse.ProfileFitDto.grade`·`RiskProfileResponse.grade` 가 같은 4종을 쓴다.
 * 한글 표기는 서버가 `gradeLabel` 로 함께 준다.
 */
export type RiskGrade = "stable" | "balanced" | "aggressive" | "challenging";

/** `FitResponse.Relation.code`. 사실값만 담고 판단 문구는 담지 않는다. */
export type FitRelationCode =
  | "concentration_above_profile"
  | "concentration_within_profile"
  | "risk_profile_not_measured";

/** `AttributionResponse.Component.key`. 한글 이름은 서버가 `label` 로 함께 준다. */
export type AttributionComponentKey = "asset" | "fx" | "interaction" | "cost";

/** `StressRunResponse.interpretationCode`. 주가 효과와 환율 효과의 관계. */
export type StressInterpretationCode =
  | "fx_cushions_equity_loss"
  | "fx_offsets_equity_loss"
  | "equity_and_fx_both_negative"
  | "fx_reduces_equity_gain"
  | "equity_and_fx_both_positive";

export interface XrayExposure {
  readonly currencyCode: string;
  readonly krw: number;
  readonly share: number;
}

/** 서버는 값이 없는 필드를 키째 생략하므로 대부분 optional이다. */
export interface XrayConcentration {
  readonly topCurrencyCode?: string;
  readonly share?: number;
  readonly status: ConcentrationStatus;
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
  readonly key: AttributionComponentKey;
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
  readonly status: RiskProfileStatus;
  readonly grade?: RiskGrade;
  readonly gradeLabel?: string;
  readonly diagnosedOn?: string;
}

export interface FitRelation {
  readonly code: FitRelationCode;
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
  readonly interpretationCode: StressInterpretationCode;
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
  /** 진단 전에도 200 + `not_measured` 로 내려온다. */
  readonly status: RiskProfileStatus;
  readonly grade?: RiskGrade;
  /** 서버가 만든 한글 표기. 화면 표시는 `grade` 로 판정하고 이 값에 기대지 않는다. */
  readonly gradeLabel?: string;
  readonly score?: number;
  readonly diagnosedOn?: string;
  readonly concentrationThreshold?: number;
  readonly simple?: RiskProfileSimple;
  readonly detail?: RiskProfileDetail;
  readonly limitationNote?: string;
}

/**
 * 알림 종류. 백엔드 `NotificationsResponse.NotificationDto.kind`의
 * `allowableValues` 6종(ERD `notification_type` ENUM)과 같은 리터럴이다.
 */
export type NotificationKind =
  | "step_due"
  | "regime_shift"
  | "deadline_near"
  | "target_zone"
  | "safe_mode"
  | "concentration";

export interface NotificationDto {
  readonly id: string;
  readonly kind: NotificationKind;
  readonly title: string;
  /** 알림 본문. 백엔드 JSON `body`. */
  readonly body: string;
  readonly createdAt: string;
  /** 읽음 여부. 백엔드 JSON `is_read` → `client.ts`가 camelCase로 바꾼다. */
  readonly isRead: boolean;
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

/**
 * 계획 상태 (백엔드 `PlanStatus`, 플래너 명세 §13.1).
 *
 * 저장 값은 소문자다. 새 값이 생기면 라벨 테이블이 컴파일 에러로 알린다.
 */
export type PlanStatusCode =
  | "draft"
  | "active"
  | "needs_review"
  | "completed"
  | "paused"
  | "superseded";

/**
 * 회차 상태 (백엔드 `PlanStepStatus`, 플래너 명세 §13.2).
 *
 * `scheduled → due → completed`, 또는 `due → skipped`. 예전 `pending` 은
 * `scheduled` 로 바뀌었다(백엔드 주석).
 */
export type PlanStepStatusCode = "scheduled" | "due" | "completed" | "skipped";

/**
 * 예산 가능 상태 (백엔드 `BudgetState`, 명세 §9.6). 이 값만 대문자로 온다.
 *
 * `COVERED_IN_RANGE` 는 목표 달성을 뜻하지 않는다 — 현재 환율 범위 안에서
 * 예산으로 감당된다는 조건부 판정이다.
 */
export type PlanBudgetState =
  | "COVERED_IN_RANGE"
  | "RANGE_SENSITIVE"
  | "CONSTRAINT_ADJUSTMENT_REQUIRED"
  | "BUDGET_NOT_PROVIDED";

/** 계획 경고 코드 (명세 §20·§21-8). 저장된 계획 조회에서는 항상 빈 배열이다. */
export type PlanWarningCode =
  | "BUDGET_SHORTFALL"
  | "TARGET_ALREADY_MET"
  | "FORECAST_UNAVAILABLE";

/** 조정 선택지 코드 (백엔드 `AdjustmentOption`, 명세 §15·§17). */
export type PlanAdjustmentOption =
  | "CHANGE_ROUND_BUDGET"
  | "CHANGE_TARGET_AMOUNT"
  | "CHANGE_TARGET_DATE"
  | "PAUSE_PLAN";

/** 환율 범위별 예상 원화 비용 (명세 §9.3). */
export interface PlanCostRange {
  readonly lowKrw: number;
  readonly baseKrw: number;
  readonly highKrw: number;
}

/** 같은 예산으로 확보할 수 있는 외화 범위 (명세 §10.2). 비용과 방향이 반대다. */
export interface PlanAcquisitionRange {
  readonly low: number;
  readonly base: number;
  readonly high: number;
}

/**
 * 계산 기준·가정·출처 (명세 §11.1).
 *
 * `PlanResponseMapper` 는 V16 이전에 저장된 계획에 이 값을 지어내지 않고 통째로
 * 비운다. 그래서 저장된 계획 조회에서는 없을 수 있다.
 */
export interface PlanCalculationMeta {
  readonly calculatedAt: string;
  readonly rateAsOf: string;
  /** 구간을 얻지 못했으면 오지 않는다. */
  readonly forecastAsOf?: string;
  readonly policyVersion: string;
  readonly currencyCode: string;
  /** 원본 고시 단위(JPY 100). 환율은 이미 1단위로 정규화돼 있다. */
  readonly quoteUnit: number;
  /** 계산에 쓴 환율 범위(외화 1단위당 원화). 방향 전망이 아니다. */
  readonly rates: {
    readonly low: number;
    readonly base: number;
    readonly high: number;
  };
  readonly spreadRatio: number;
  readonly feeKrw: number;
}

/** 목표 요약 (명세 §11.2). */
export interface PlanGoalSummary {
  /** `deadline` / `recurring`. */
  readonly goalType: string;
  readonly purpose: string;
  readonly currencyCode: string;
  /** 마감형 목표 외화 총액. 정기형은 오지 않는다. */
  readonly targetAmount?: number;
  /** 정기형 회차 예산. 마감형은 오지 않는다. */
  readonly roundBudgetKrw?: number;
  readonly allocatedHoldingAmount: number;
  readonly remainingAmount: number;
  readonly targetDate?: string;
}

/** 계획 요약 (명세 §11.3). 회차 수·다음 행동은 전부 서버가 센 값이다. */
export interface PlanSummary {
  readonly status: PlanStatusCode;
  /** 계획 종료일 — 마감 버퍼를 뺀 날 (명세 §9.4). */
  readonly planEndDate?: string;
  readonly totalRounds: number;
  readonly completedRounds: number;
  readonly scheduledRounds: number;
  readonly skippedRounds: number;
  /** 지금 확인·기록할 회차 번호. 남은 회차가 없으면 오지 않는다. */
  readonly nextActionSeq?: number;
  /** 비용 요약이 없는 과거 계획에는 오지 않는다. */
  readonly estimatedCost?: PlanCostRange;
  /** 정기형이거나 비용 요약이 없으면 오지 않는다. */
  readonly budgetState?: PlanBudgetState;
  /** 정기형 점검 시점의 누적 확보 외화 범위 (명세 §10.3). */
  readonly cumulativeAcquisition?: PlanAcquisitionRange;
}

/** 회차 (명세 §11.4). */
export interface PlanStep {
  readonly seq: number;
  readonly scheduledDate: string;
  readonly amount: number;
  /** 정기형 회차 예산. 마감형은 오지 않는다. */
  readonly budgetKrw?: number;
  readonly estimatedCost?: PlanCostRange;
  /** 정기형 확보 가능 외화 범위. 마감형은 오지 않는다. */
  readonly acquisition?: PlanAcquisitionRange;
  readonly executedAmount: number;
  readonly executedRate?: number;
  readonly executedDate?: string;
  readonly status: PlanStepStatusCode;
  /** 지금 확인·기록할 다음 행동인지. `summary.nextActionSeq` 와 같은 회차를 가리킨다. */
  readonly nextAction: boolean;
}

/**
 * 계획 응답 (백엔드 `PlanResponse`, 플래너 명세 §11).
 *
 * 미리보기와 확정·조회가 **같은 구조**를 쓴다. 미리보기에는 아직 저장 전이라
 * `planId`·`version` 이 없다.
 */
export interface PlanResponse {
  /** 저장된 계획 ID. 미리보기에는 없다. */
  readonly planId?: string;
  /** 목표 ID. 목표 저장 전 미리보기에는 없다. */
  readonly goalId?: string;
  /** 계획 버전. 미리보기에는 없다. */
  readonly version?: number;
  readonly calculationMeta?: PlanCalculationMeta;
  readonly goal: PlanGoalSummary;
  readonly summary: PlanSummary;
  readonly steps: readonly PlanStep[];
  readonly warnings: readonly PlanWarningCode[];
  /** 이 계획이 보장하는 것과 보장하지 않는 것 (명세 §2·§26). 서버 문장을 그대로 쓴다. */
  readonly disclaimer: string;
}

export interface StepCompleteRequest {
  readonly executedAmount: number;
  readonly executedRate: number;
}

export interface StepCompleteResponse {
  readonly seq: number;
  readonly status: PlanStepStatusCode;
  readonly executedAmount: number;
  readonly executedRate?: number;
  readonly executedDate?: string;
  readonly remainingAmount: number;
  /** 남은 회차가 없으면 오지 않는다. */
  readonly nextActionSeq?: number;
  /** 이미 반영된 요청의 재전송이었는지. 참이면 아무것도 저장되지 않았다 (§21-12). */
  readonly alreadyApplied: boolean;
}

/**
 * 회차 건너뛰기 응답 (백엔드 `StepSkipResponse`, 명세 §15).
 *
 * **변경 계획 미리보기이며 아무것도 저장되지 않는다.** `applied` 는 항상
 * `false` 다 — 승인 전에는 계획이 바뀌지 않는다(§21-9).
 */
export interface StepSkipResponse {
  readonly seq: number;
  readonly applied: boolean;
  readonly amountBefore: number;
  readonly amountAfter: number;
  readonly remainingAmount: number;
  readonly remainingRounds: number;
  /** 계산 근거가 없으면 오지 않는다. */
  readonly perRoundCostKrw?: number;
  readonly exceedsBudget: boolean;
  readonly adjustmentOptions: readonly PlanAdjustmentOption[];
}
