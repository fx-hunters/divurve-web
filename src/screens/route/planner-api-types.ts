import type {
  ActivePlanResponse,
  GoalResponse,
  PlanStep,
} from "../../api/generated/divurve-api";

export type PlannerNodeStatus =
  | "completed"
  | "next"
  | "upcoming"
  | "skipped"
  | "destination";

export interface PlannerGoalItemViewModel {
  readonly id: string;
  readonly name: string;
  readonly currencyCode: string;
  readonly isSelected: boolean;
}

export interface PlannerGoalSummaryViewModel {
  readonly id: string;
  readonly name: string;
  readonly currencyCode: string;
  readonly targetAmount: number;
  readonly heldAmount: number;
  readonly targetDate: string | null;
  readonly targetDateLabel: string;
  readonly targetAmountLabel: string;
  readonly heldAmountLabel: string;
  readonly progressPercent: number;
  /** ProgressBar 왼쪽에 표시할 진행 설명. 퍼센트는 progressPercent를 사용한다. */
  readonly progressLabel: string;
}

export interface PlannerPlanSummaryViewModel {
  readonly id: string;
  readonly version: number;
  readonly reason: string;
  readonly safeRatio: number;
  readonly safeRatioLabel: string;
  readonly splitCount: number;
  readonly isActive: boolean;
}

export interface PlannerCurveNodeViewModel {
  readonly id: string;
  readonly sequence: number;
  readonly x: number;
  readonly y: number;
  readonly status: PlannerNodeStatus;
  readonly statusLabel: string;
  readonly roundLabel: string;
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
  readonly path: string;
  readonly nodes: readonly PlannerCurveNodeViewModel[];
  readonly destination: PlannerDestinationNodeViewModel | null;
}

export interface PlannerStepViewModel {
  readonly sequence: number;
  readonly scheduledDate: string;
  readonly amount: number;
  readonly amountLabel: string;
  readonly executedAmount: number | null;
  readonly status: PlannerNodeStatus;
  readonly statusLabel: string;
  readonly sequenceLabel: string;
}

export interface PlannerNextActionViewModel {
  readonly planId: string;
  readonly sequence: number;
  readonly scheduledDate: string;
  readonly amount: number;
  readonly amountLabel: string;
}

export interface PlannerViewModel {
  readonly goalItems: readonly PlannerGoalItemViewModel[];
  readonly selectedGoal: PlannerGoalSummaryViewModel | null;
  readonly plan: PlannerPlanSummaryViewModel | null;
  readonly curveNodes: readonly PlannerCurveNodeViewModel[];
  readonly curve: PlannerCurveViewModel | null;
  readonly steps: readonly PlannerStepViewModel[];
  readonly nextAction: PlannerNextActionViewModel | null;
  readonly dataSource: { readonly kind: "server"; readonly label: string };
  readonly supportedActions: {
    readonly canCompleteStep: boolean;
    readonly canSkipStep: boolean;
  };
  readonly unsupportedAreas: readonly string[];
}

export interface ExecutedStepInput {
  readonly executedAmount: number;
  readonly executedRate: number;
}

export type ExecutedStepValidation =
  | { readonly isValid: true; readonly value: ExecutedStepInput }
  | { readonly isValid: false; readonly message: string };

export interface PlannerSourceItem {
  readonly goal: GoalResponse;
  readonly activePlan: ActivePlanResponse | null;
}

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

export type PlannerSourceStep = PlanStep;
