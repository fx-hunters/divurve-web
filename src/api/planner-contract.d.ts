export interface PlannerPlanRequest {
  readonly goalId: string;
  readonly currencyCode: string;
}

export type PlannerGoalKind = "deadline" | "recurring";

export type PlannerGoalPurpose =
  | "TRAVEL"
  | "TUITION"
  | "ONE_TIME_PURCHASE"
  | "STOCK_ACCUMULATION";

/** 현재 GoalCreateRequest가 실제로 받는 필드만 표현한다. */
export interface PlannerGoalCreateRequest {
  readonly name: string;
  readonly kind: PlannerGoalKind;
  readonly purpose: PlannerGoalPurpose;
  readonly currencyCode: string;
  readonly targetAmount: number;
  readonly targetDate: string | null;
  readonly recurInterval: string | null;
  readonly budgetAmount: number;
  readonly budgetCurrencyCode: "KRW";
  readonly budgetPeriod: string | null;
  readonly isSpeculative: false;
}

export interface PlannerCostRange {
  readonly lowKrw: number;
  readonly baseKrw: number;
  readonly highKrw: number;
}

export interface PlannerAcquisitionRange {
  readonly low: number;
  readonly base: number;
  readonly high: number;
}

export interface PlannerCalculationMeta {
  readonly calculatedAt: string;
  readonly rateAsOf: string;
  readonly forecastAsOf: string | null;
  readonly policyVersion: string;
  readonly currencyCode: string;
  readonly quoteUnit: number;
  readonly rates: {
    readonly low: number;
    readonly base: number;
    readonly high: number;
  };
  readonly spreadRatio: number;
  readonly feeKrw: number;
}

export interface PlannerPlanGoal {
  readonly goalType: string;
  readonly purpose: string;
  readonly currencyCode: string;
  readonly targetAmount: number | null;
  readonly roundBudgetKrw: number | null;
  readonly allocatedHoldingAmount: number;
  readonly remainingAmount: number;
  readonly targetDate: string;
}

export interface PlannerPlanSummary {
  readonly status: string;
  readonly planEndDate: string;
  readonly totalRounds: number;
  readonly completedRounds: number;
  readonly scheduledRounds: number;
  readonly skippedRounds: number;
  readonly nextActionSeq: number | null;
  readonly estimatedCost: PlannerCostRange | null;
  readonly budgetState: string | null;
  readonly cumulativeAcquisition: PlannerAcquisitionRange | null;
}

export interface PlannerPlanStep {
  readonly seq: number;
  readonly scheduledDate: string;
  readonly amount: number;
  readonly budgetKrw: number | null;
  readonly estimatedCost: PlannerCostRange | null;
  readonly acquisition: PlannerAcquisitionRange | null;
  readonly executedAmount: number;
  readonly executedRate: number | null;
  readonly executedDate: string | null;
  readonly status: string;
  readonly nextAction: boolean;
}

export interface PlannerPlanResponse {
  readonly planId: string | null;
  readonly goalId: string | null;
  readonly version: number | null;
  readonly calculationMeta: PlannerCalculationMeta;
  readonly goal: PlannerPlanGoal;
  readonly summary: PlannerPlanSummary;
  readonly steps: readonly PlannerPlanStep[];
  readonly warnings: readonly string[];
  readonly disclaimer: string;
}

export interface PlannerStepCompleteRequest {
  readonly executedAmount: number;
  readonly executedRate: number;
  readonly executedDate: string;
  readonly executionKey: string;
}

export interface PlannerStepCompleteResponse {
  readonly seq: number;
  readonly status: string;
  readonly executedAmount: number;
  readonly executedRate: number;
  readonly executedDate: string;
  readonly remainingAmount: number;
  readonly nextActionSeq: number | null;
  readonly alreadyApplied: boolean;
}

export interface PlannerStepSkipResponse {
  readonly seq: number;
  readonly applied: false;
  readonly amountBefore: number;
  readonly amountAfter: number;
  readonly remainingAmount: number;
  readonly remainingRounds: number;
  readonly perRoundCostKrw: number | null;
  readonly exceedsBudget: boolean;
  readonly adjustmentOptions: readonly string[];
}

export type PlannerScenarioCode =
  | "RATE_UP"
  | "RATE_DOWN"
  | "STEP_SKIPPED"
  | "BUDGET_DECREASED"
  | "TARGET_DATE_CHANGED"
  | "TARGET_AMOUNT_CHANGED"
  | "HOLDING_ADDED";

export interface PlannerScenarioPreviewRequest {
  readonly scenarioCode: PlannerScenarioCode;
  readonly skippedSeq?: number;
  readonly newBudgetKrw?: number;
  readonly newTargetDate?: string;
  readonly newTargetAmount?: number;
  readonly addedHoldingAmount?: number;
}

export interface PlannerScenarioSide {
  readonly remainingAmount: number;
  readonly targetDate: string;
  readonly totalRounds: number;
  readonly openRounds: number;
  readonly perRoundAmount: number | null;
  readonly roundBudgetKrw: number | null;
  readonly costRange: PlannerCostRange | null;
}

export interface PlannerScenarioStepChange {
  readonly seq: number;
  readonly changeType: string;
  readonly dateBefore: string | null;
  readonly dateAfter: string | null;
  readonly amountBefore: number | null;
  readonly amountAfter: number | null;
}

export interface PlannerScenarioPreviewResponse {
  readonly basePlanId: string;
  readonly baseVersion: number;
  readonly draftPlanId: string;
  readonly draftVersion: number;
  readonly changeReasonCode: string;
  readonly priorityConstraint: string;
  readonly before: PlannerScenarioSide;
  readonly after: PlannerScenarioSide;
  readonly changedSteps: readonly PlannerScenarioStepChange[];
  readonly keptConstraints: readonly string[];
  readonly brokenConstraints: readonly string[];
  readonly budgetState: string;
  readonly adjustmentOptions: readonly string[];
  readonly warnings: readonly string[];
}
