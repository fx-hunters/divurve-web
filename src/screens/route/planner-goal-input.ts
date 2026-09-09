import type {
  PlannerGoalCreateRequest,
  PlannerGoalKind,
  PlannerGoalPurpose,
} from "../../api/planner-contract";

export interface PlannerGoalDraft {
  readonly name: string;
  readonly kind: PlannerGoalKind;
  readonly purpose: PlannerGoalPurpose;
  readonly currencyCode: "USD" | "JPY" | "EUR";
  readonly targetAmount: string;
  readonly targetDate: string;
  readonly recurInterval: "weekly" | "biweekly" | "monthly";
  readonly budgetAmount: string;
  readonly budgetPeriod: "monthly";
}

export interface PlannerGoalInput {
  readonly name: string;
  readonly kind: PlannerGoalKind;
  readonly purpose: PlannerGoalPurpose;
  readonly currencyCode: "USD" | "JPY" | "EUR";
  readonly targetAmount: number;
  readonly targetDate: string;
  readonly recurInterval: "weekly" | "biweekly" | "monthly";
  readonly budgetAmount: number;
  readonly budgetPeriod: "monthly" | null;
}

export interface PlannerLocalGoal {
  readonly id: string;
  readonly input: PlannerGoalInput;
}

export type PlannerGoalValidation =
  | { readonly isValid: true; readonly value: PlannerGoalInput }
  | { readonly isValid: false; readonly message: string; readonly field: keyof PlannerGoalDraft };

export const INITIAL_PLANNER_GOAL_DRAFT: PlannerGoalDraft = {
  name: "",
  kind: "deadline",
  purpose: "TRAVEL",
  currencyCode: "USD",
  targetAmount: "",
  targetDate: "",
  recurInterval: "monthly",
  budgetAmount: "",
  budgetPeriod: "monthly",
};

export const DEADLINE_PURPOSES: readonly {
  readonly value: PlannerGoalPurpose;
  readonly label: string;
}[] = [
  { value: "TRAVEL", label: "여행" },
  { value: "TUITION", label: "학비·송금" },
  { value: "ONE_TIME_PURCHASE", label: "해외 결제" },
];

export function validatePlannerGoalDraft(
  draft: PlannerGoalDraft,
  today: string,
  canCreateRecurring: boolean,
): PlannerGoalValidation {
  const name = draft.name.trim();
  if (name.length === 0) {
    return { isValid: false, message: "목표 이름을 입력해 주세요.", field: "name" };
  }
  if (draft.kind === "recurring" && !canCreateRecurring) {
    return {
      isValid: false,
      message: "현재 서버 계약에서는 반복형 목표 저장을 지원하지 않습니다.",
      field: "kind",
    };
  }
  const targetAmount = Number(draft.targetAmount);
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return {
      isValid: false,
      message: "목표 외화 금액은 0보다 큰 값으로 입력해 주세요.",
      field: "targetAmount",
    };
  }
  if (draft.targetDate.length === 0 || draft.targetDate < today) {
    return {
      isValid: false,
      message: "오늘 이후의 목표 날짜를 선택해 주세요.",
      field: "targetDate",
    };
  }
  const budgetAmount = draft.budgetAmount.trim() === "" ? 0 : Number(draft.budgetAmount);
  if (!Number.isFinite(budgetAmount) || budgetAmount < 0) {
    return {
      isValid: false,
      message: "사용 가능 금액은 0 이상의 원화 금액으로 입력해 주세요.",
      field: "budgetAmount",
    };
  }
  if (draft.kind === "recurring" && budgetAmount <= 0) {
    return {
      isValid: false,
      message: "반복형 목표에는 회차별 사용 가능 금액이 필요합니다.",
      field: "budgetAmount",
    };
  }
  return {
    isValid: true,
    value: {
      name,
      kind: draft.kind,
      purpose:
        draft.kind === "recurring" ? "STOCK_ACCUMULATION" : draft.purpose,
      currencyCode: draft.currencyCode,
      targetAmount,
      targetDate: draft.targetDate,
      recurInterval: draft.recurInterval,
      budgetAmount,
      budgetPeriod: budgetAmount > 0 ? draft.budgetPeriod : null,
    },
  };
}

export function toPlannerGoalCreateRequest(
  input: PlannerGoalInput,
): PlannerGoalCreateRequest {
  return {
    name: input.name,
    kind: input.kind,
    purpose: input.purpose,
    currencyCode: input.currencyCode,
    targetAmount: input.targetAmount,
    targetDate: input.targetDate,
    recurInterval: input.recurInterval,
    budgetAmount: input.budgetAmount,
    budgetCurrencyCode: "KRW",
    budgetPeriod: input.budgetPeriod,
    isSpeculative: false,
  };
}
