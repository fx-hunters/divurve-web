export type CurrencyCode = "USD" | "JPY" | "EUR";

export type RouteTone = "default" | "primary" | "normal" | "warn" | "danger";
export type PlannerKind = "recurring" | "deadline";
export type PlannerScenarioId = "expectedRange" | "rapidRise" | "decline" | "missedRound" | "reducedBudget";
export type PlannerCheckpointStatus = "complete" | "next" | "upcoming" | "destination";
export type PlannerStage = "intro" | "entering" | "journey" | "scenarioPreview" | "confirmChange" | "recorded";

export interface RouteDataNotice {
  readonly source: "mock";
  readonly sourceLabel: string;
  readonly asOfLabel: string;
  readonly notice: string;
}

export interface PlannerIntroContent {
  readonly title: string;
  readonly description: string;
  readonly newPlanLabel: string;
  readonly demoActionLabel: string;
  readonly creationNotice: string;
}

export interface PlannerGoalOption {
  readonly id: string;
  readonly kind: PlannerKind;
  readonly name: string;
  readonly purposeLabel: string;
  readonly summary: string;
  readonly currencyCode: CurrencyCode;
  readonly primaryValueLabel: string;
  readonly secondaryValueLabel: string;
  readonly diagnosisNote: string;
}

export interface RouteFlowStep {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly tone: RouteTone;
}

export interface RouteGoalSummary {
  readonly name: string;
  readonly purposeLabel: string;
  readonly currencyCode: CurrencyCode;
  readonly targetAmountLabel: string;
  readonly targetDateLabel: string;
  readonly securedAmountLabel: string;
  readonly remainingPeriodLabel: string;
  readonly progressPercent: number;
  readonly progressLabel: string;
  readonly diagnosisLabel: string;
  readonly primaryMetricLabel: string;
  readonly primaryMetricValue: string;
}

export interface RoutePlanSummary {
  readonly title: string;
  readonly statusLabel: string;
  readonly statusTone: RouteTone;
  readonly description: string;
  readonly nextRoundLabel: string;
  readonly roundCountLabel: string;
  readonly cadenceLabel: string;
  readonly destinationLabel: string;
}

export interface RouteBucketItem {
  readonly id: string;
  readonly kind: "safe" | "opportunity";
  readonly label: string;
  readonly ratioLabel: string;
  readonly amountLabel: string;
  readonly description: string;
  readonly widthPercent: number;
}

export interface RouteBucketSummary {
  readonly totalLabel: string;
  readonly notice: string;
  readonly items: readonly RouteBucketItem[];
}

export interface RouteRoundItem {
  readonly id: string;
  readonly sequenceLabel: string;
  readonly scheduledDateLabel: string;
  readonly bucketLabel: string;
  readonly amountLabel: string;
  readonly statusLabel: string;
  readonly statusTone: RouteTone;
}

export interface RouteRoundSummary {
  readonly totalLabel: string;
  readonly notice: string;
  readonly items: readonly RouteRoundItem[];
}

export interface RouteCurveAmountStep {
  readonly id: string;
  readonly sequence: number;
  readonly scheduledDate: string;
  readonly amount: number;
  readonly status: "completed" | "next" | "upcoming" | "skipped";
  readonly executedAmount: number;
  readonly executedDate: string | null;
}

/** 데모 Curve에 사용할 명시적 날짜·외화 금액. 장식 좌표와 분리한다. */
export interface RouteCurveAmountData {
  readonly currentDate: string;
  readonly allocatedAmount: number;
  readonly targetAmount: number | null;
  readonly targetDate: string | null;
  readonly notice: string;
  readonly steps: readonly RouteCurveAmountStep[];
}

export interface PlannerCurve {
  readonly id: string;
  readonly path: string;
  readonly accessibleLabel: string;
}

export interface PlannerCheckpointData {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly title: string;
  readonly detail: string;
  readonly amountLabel: string;
  readonly status: PlannerCheckpointStatus;
  readonly statusLabel: string;
  readonly appearDelayMs: number;
}

export interface PlannerAction {
  readonly eyebrow: string;
  readonly title: string;
  readonly dueLabel: string;
  readonly amountLabel: string;
  readonly description: string;
  readonly recordLabel: string;
  readonly skipLabel: string;
  readonly scenarioLabel: string;
  readonly reasonLabel: string;
}

export interface PlannerScenario {
  readonly id: PlannerScenarioId;
  readonly label: string;
  readonly summary: string;
  readonly changeReason: string;
  readonly nextAction: string;
  readonly tone: RouteTone;
  readonly curve: PlannerCurve;
  /** 체험 응답에 날짜·외화 금액 변화가 명시된 경우에만 사용하는 대체 경로 데이터. */
  readonly curveData?: RouteCurveAmountData;
  readonly checkpoints: readonly PlannerCheckpointData[];
  readonly changedCheckpointIds: readonly string[];
  readonly applyLabel: string;
}

export interface PlannerRecordedState {
  readonly announcement: string;
  readonly currentStatusLabel: string;
  readonly nextCheckpointId: string;
  readonly nextCheckpointStatusLabel: string;
  readonly action: PlannerAction;
}

export interface PlannerReasonProfile {
  readonly id: string;
  readonly label: string;
  readonly levelLabel: string;
  readonly paragraphs: readonly string[];
}

export interface PlannerExplanation {
  readonly title: string;
  readonly summary: string;
  readonly aiNotice: string;
  readonly profiles: readonly [PlannerReasonProfile, ...PlannerReasonProfile[]];
  readonly tbdTitle: string;
  readonly tbdItems: readonly string[];
}

export interface PlannerPlan {
  readonly id: string;
  readonly kind: PlannerKind;
  readonly introOption: PlannerGoalOption;
  readonly flowSteps: readonly RouteFlowStep[];
  readonly goal: RouteGoalSummary;
  readonly plan: RoutePlanSummary;
  readonly buckets: RouteBucketSummary;
  readonly rounds: RouteRoundSummary;
  readonly curveData: RouteCurveAmountData;
  readonly baseScenarioId: PlannerScenarioId;
  readonly scenarios: readonly [PlannerScenario, ...PlannerScenario[]];
  readonly action: PlannerAction;
  readonly recordedState: PlannerRecordedState;
  readonly explanation: PlannerExplanation;
}

export interface RoutePlanData {
  readonly dataNotice: RouteDataNotice;
  readonly intro: PlannerIntroContent;
  readonly plans: readonly [PlannerPlan, ...PlannerPlan[]];
}
