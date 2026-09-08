import type { PlannerApiItem } from "../../api/planner";
import type { PlannerScenarioCode } from "../../api/planner-contract";
import type { DataSourceKind } from "../../types/data-source";

export type PlannerStepNodeStatus =
  | "completed"
  | "next"
  | "upcoming"
  | "skipped";

export interface PlannerGoalItemViewModel {
  readonly id: string;
  readonly name: string;
  readonly currencyCode: string;
  readonly targetAmountLabel: string;
  readonly heldAmountLabel: string;
  readonly targetDateLabel: string;
  readonly isSelected: boolean;
  readonly planStatusLabel: string;
}

export interface PlannerGoalSummaryViewModel {
  readonly id: string;
  readonly name: string;
  readonly currencyCode: string;
  readonly targetAmount: number | null;
  readonly heldAmount: number | null;
  readonly targetDate: string | null;
  readonly targetDateLabel: string;
  readonly targetAmountLabel: string;
  readonly heldAmountLabel: string;
  readonly remainingAmountLabel: string;
  readonly heldAmountBasisLabel: string;
  readonly progressPercent: number;
  readonly progressLabel: string;
}

export interface PlannerPlanSummaryViewModel {
  readonly planSource: "active" | "preview";
  readonly id: string | null;
  readonly version: number | null;
  readonly versionLabel: string;
  readonly status: string;
  readonly statusLabel: string;
  readonly planEndDateLabel: string;
  readonly totalRounds: number;
  readonly completedRounds: number;
  readonly scheduledRounds: number;
  readonly skippedRounds: number;
  readonly nextActionSeq: number | null;
  readonly estimatedCostLabel: string | null;
  readonly budgetStateLabel: string | null;
  readonly policyVersion: string | null;
  readonly calculatedAtLabel: string | null;
  readonly rateAsOfLabel: string | null;
  readonly disclaimer: string;
  readonly warnings: readonly string[];
  readonly summaryText?: string;
}

export interface PlannerCurveNodeViewModel {
  readonly id: string;
  readonly sequence: number;
  readonly x: number;
  readonly y: number;
  readonly status: PlannerStepNodeStatus;
  readonly statusLabel: string;
  readonly roundLabel: string;
  readonly date: string;
  readonly dateLabel: string;
  readonly cumulativeAmount: number;
  readonly cumulativeAmountLabel: string;
  readonly roundAmount: number;
  readonly roundAmountLabel: string;
  readonly actionLabel: string;
}

export interface PlannerDestinationNodeViewModel {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly status: "destination";
  readonly statusLabel: string;
  readonly label: string;
  readonly targetAmountLabel: string;
  readonly targetDateLabel: string;
}

export interface PlannerCurveViewModel {
  readonly viewBox?: string;
  readonly accessibleLabel?: string;
  readonly path: string;
  readonly actualPath: string | null;
  readonly plannedPath: string | null;
  readonly nodes: readonly PlannerCurveNodeViewModel[];
  readonly destination: PlannerDestinationNodeViewModel | null;
  readonly currentPoint: {
    readonly x: number;
    readonly y: number;
    readonly date: string;
    readonly dateLabel: string;
    readonly amount: number;
    readonly amountLabel: string;
  } | null;
  readonly targetLineY: number | null;
  readonly yTicks: readonly {
    readonly y: number;
    readonly label: string;
  }[];
  readonly xStartLabel: string | null;
  readonly xEndLabel: string | null;
  readonly dataNotice: string | null;
  readonly currencyCode: string;
  readonly allocatedAmount: number;
  readonly targetAmount: number | null;
  readonly targetDate: string | null;
  readonly currentDate: string | null;
  readonly domain: {
    readonly minDate: number;
    readonly maxDate: number;
    readonly maxAmount: number;
  };
}

export interface PlannerStepViewModel {
  readonly sequence: number;
  readonly scheduledDate: string;
  readonly amount: number | null;
  readonly amountLabel: string;
  readonly budgetLabel: string | null;
  readonly estimatedCostLabel: string | null;
  readonly executedAmount: number | null;
  readonly cumulativeAmount: number;
  readonly cumulativeAmountLabel: string;
  readonly actionLabel: string;
  readonly calculationBasis: string;
  readonly status: PlannerStepNodeStatus;
  readonly statusLabel: string;
  readonly sequenceLabel: string;
}

export interface PlannerNextActionViewModel {
  readonly planId: string;
  readonly sequence: number;
  readonly scheduledDate: string;
  readonly amount: number | null;
  readonly amountLabel: string;
  readonly title?: string;
  readonly description?: string;
}

export interface PlannerScenarioOptionViewModel {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly scenarioCode: PlannerScenarioCode | null;
  readonly isCurrent: boolean;
  readonly requiresBudget: boolean;
}

export interface PlannerComparisonRowViewModel {
  readonly label: string;
  readonly before: string;
  readonly after: string;
}

export interface PlannerScenarioComparisonViewModel {
  readonly id: string;
  readonly label: string;
  readonly reason: string;
  readonly nextAction: string;
  readonly draftPlanId: string | null;
  readonly canRequestDraft?: boolean;
  readonly rows: readonly PlannerComparisonRowViewModel[];
  readonly baseCurve: PlannerCurveViewModel | null;
  readonly alternativeCurve: PlannerCurveViewModel | null;
  readonly changedNodeIds: readonly string[];
  readonly warnings: readonly string[];
}

export interface PlannerViewModel {
  readonly goalItems: readonly PlannerGoalItemViewModel[];
  readonly selectedGoal: PlannerGoalSummaryViewModel | null;
  readonly plan: PlannerPlanSummaryViewModel | null;
  readonly curveNodes: readonly PlannerCurveNodeViewModel[];
  readonly curve: PlannerCurveViewModel | null;
  readonly steps: readonly PlannerStepViewModel[];
  readonly nextAction: PlannerNextActionViewModel | null;
  readonly dataSource: { readonly kind: DataSourceKind; readonly label: string };
  readonly supportedActions: {
    readonly canPreviewPlan: boolean;
    readonly canCreatePlan: boolean;
    readonly canCompleteStep: boolean;
    readonly canSkipStep: boolean;
    readonly canPreviewScenario: boolean;
    readonly canApplyDraft: boolean;
  };
  readonly unsupportedAreas: readonly string[];
  readonly planAvailabilityMessage: string;
  readonly scenarioOptions?: readonly PlannerScenarioOptionViewModel[];
}

export interface ExecutedStepInput {
  readonly executedAmount: number;
  readonly executedRate: number;
}

export type ExecutedStepValidation =
  | { readonly isValid: true; readonly value: ExecutedStepInput }
  | { readonly isValid: false; readonly message: string };

export type PlannerSourceItem = PlannerApiItem;

export function validateExecutedStepInput(
  input: ExecutedStepInput,
): ExecutedStepValidation {
  if (!Number.isFinite(input.executedAmount) || input.executedAmount <= 0) {
    return {
      isValid: false,
      message: "실행 외화 금액은 0보다 큰 유한한 값이어야 합니다.",
    };
  }
  if (!Number.isFinite(input.executedRate) || input.executedRate <= 0) {
    return {
      isValid: false,
      message: "실행 환율은 0보다 큰 유한한 값이어야 합니다.",
    };
  }
  return { isValid: true, value: input };
}

/** 현재 데이터 공급처에서 제공하지 않는 Journey 동작의 명시적 경계. */
export function rejectUnsupportedPlannerOperation(): Promise<boolean> {
  return Promise.resolve(false);
}
