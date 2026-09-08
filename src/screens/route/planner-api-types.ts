import type {
  GoalResponse,
  PlanResponse,
  PlanStatusCode,
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

/**
 * 활성 계획 요약. 전부 서버 `PlanResponse.summary` 를 옮기기만 한다 —
 * 회차 수·다음 회차는 프론트에서 세지 않는다(AGENTS.md §1).
 *
 * 예전 이 타입에 있던 `safeRatio`·`splitCount`·`reason`·`isActive` 는 백엔드
 * 응답에 존재하지 않는 필드였다(점검 리포트 H2). 없는 값을 포매터에 넣어
 * `NaN%` 가 나오던 자리다.
 */
export interface PlannerPlanSummaryViewModel {
  /** 저장된 계획 id. 미리보기 응답에는 없으므로 null 일 수 있다. */
  readonly planId: string | null;
  readonly version: number | null;
  readonly versionLabel: string;
  readonly status: PlanStatusCode;
  readonly statusLabel: string;
  readonly totalRounds: number;
  readonly completedRounds: number;
  readonly scheduledRounds: number;
  readonly skippedRounds: number;
  readonly nextActionSeq: number | null;
  readonly planEndDateLabel: string;
  /** 예상 원화 비용 범위. 서버가 값을 주지 않으면 그 사실을 문구로 남긴다. */
  readonly estimatedCostLabel: string;
  readonly budgetStateLabel: string;
  /** 서버 경고 코드의 화면 문구. 모르는 코드는 원문을 그대로 노출한다. */
  readonly warnings: readonly string[];
  /** 서버가 실어 보낸 고지 문장 (명세 §2·§26). 프론트가 다시 쓰지 않는다. */
  readonly disclaimer: string;
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
  /** 실행한 외화 금액. 서버가 항상 보내며 미실행 회차는 0 이다. */
  readonly executedAmount: number;
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
  readonly activePlan: PlanResponse | null;
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
