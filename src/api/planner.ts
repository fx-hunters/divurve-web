import { ApiError, request, requestWithMeta } from "./client";
import type { GoalListResponse, GoalResponse } from "./generated/divurve-api";
import type {
  PlannerAcquisitionRange,
  PlannerCalculationMeta,
  PlannerCostRange,
  PlannerPlanGoal,
  PlannerPlanRequest,
  PlannerPlanResponse,
  PlannerPlanStep,
  PlannerPlanSummary,
  PlannerScenarioPreviewRequest,
  PlannerScenarioPreviewResponse,
  PlannerStepCompleteRequest,
  PlannerStepCompleteResponse,
  PlannerStepSkipResponse,
} from "./planner-contract";
import { fetchXrayOverview } from "./xray";

export interface PlannerApiItem {
  readonly goal: GoalResponse;
  readonly activePlan: PlannerPlanResponse | null;
}

export interface PlannerApiOverview {
  readonly items: readonly PlannerApiItem[];
  readonly isDemo?: boolean;
  readonly isSampleData?: boolean;
}

/** 서버가 반환하는 계획 버전 이력의 한 행. */
export interface PlanVersion {
  readonly planId: string;
  readonly version: number;
  readonly status: string;
  readonly reason?: string;
  readonly planEndDate?: string;
  readonly supersededBy?: string;
  readonly createdAt?: string;
}

export interface PlanVersionListResponse {
  readonly versions: readonly PlanVersion[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invalidResponse(field: string): never {
  throw new ApiError(
    `플래너 응답의 ${field} 값을 확인할 수 없습니다.`,
    200,
    "INVALID_RESPONSE",
    field,
  );
}

function requiredRecord(value: unknown, field: string): Record<string, unknown> {
  return isRecord(value) ? value : invalidResponse(field);
}

function requiredString(value: unknown, field: string): string {
  return typeof value === "string" ? value : invalidResponse(field);
}

function requiredNumber(value: unknown, field: string): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : invalidResponse(field);
}

function requiredBoolean(value: unknown, field: string): boolean {
  return typeof value === "boolean" ? value : invalidResponse(field);
}

function nullableString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  return requiredString(value, field);
}

function nullableNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null) return null;
  return requiredNumber(value, field);
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return invalidResponse(field);
  }
  return value;
}

function toCostRange(value: unknown, field: string): PlannerCostRange | null {
  if (value === undefined || value === null) return null;
  const row = requiredRecord(value, field);
  return {
    lowKrw: requiredNumber(row.lowKrw, `${field}.lowKrw`),
    baseKrw: requiredNumber(row.baseKrw, `${field}.baseKrw`),
    highKrw: requiredNumber(row.highKrw, `${field}.highKrw`),
  };
}

function toAcquisitionRange(
  value: unknown,
  field: string,
): PlannerAcquisitionRange | null {
  if (value === undefined || value === null) return null;
  const row = requiredRecord(value, field);
  return {
    low: requiredNumber(row.low, `${field}.low`),
    base: requiredNumber(row.base, `${field}.base`),
    high: requiredNumber(row.high, `${field}.high`),
  };
}

function toCalculationMeta(value: unknown): PlannerCalculationMeta {
  const row = requiredRecord(value, "calculationMeta");
  const rates = requiredRecord(row.rates, "calculationMeta.rates");
  return {
    calculatedAt: requiredString(row.calculatedAt, "calculationMeta.calculatedAt"),
    rateAsOf: requiredString(row.rateAsOf, "calculationMeta.rateAsOf"),
    forecastAsOf: nullableString(row.forecastAsOf, "calculationMeta.forecastAsOf"),
    policyVersion: requiredString(row.policyVersion, "calculationMeta.policyVersion"),
    currencyCode: requiredString(row.currencyCode, "calculationMeta.currencyCode"),
    quoteUnit: requiredNumber(row.quoteUnit, "calculationMeta.quoteUnit"),
    rates: {
      low: requiredNumber(rates.low, "calculationMeta.rates.low"),
      base: requiredNumber(rates.base, "calculationMeta.rates.base"),
      high: requiredNumber(rates.high, "calculationMeta.rates.high"),
    },
    spreadRatio: requiredNumber(row.spreadRatio, "calculationMeta.spreadRatio"),
    feeKrw: requiredNumber(row.feeKrw, "calculationMeta.feeKrw"),
  };
}

function toPlanGoal(value: unknown): PlannerPlanGoal {
  const row = requiredRecord(value, "goal");
  return {
    goalType: requiredString(row.goalType, "goal.goalType"),
    purpose: requiredString(row.purpose, "goal.purpose"),
    currencyCode: requiredString(row.currencyCode, "goal.currencyCode"),
    targetAmount: nullableNumber(row.targetAmount, "goal.targetAmount"),
    roundBudgetKrw: nullableNumber(row.roundBudgetKrw, "goal.roundBudgetKrw"),
    allocatedHoldingAmount: requiredNumber(
      row.allocatedHoldingAmount,
      "goal.allocatedHoldingAmount",
    ),
    remainingAmount: requiredNumber(row.remainingAmount, "goal.remainingAmount"),
    targetDate: requiredString(row.targetDate, "goal.targetDate"),
  };
}

function toPlanSummary(value: unknown): PlannerPlanSummary {
  const row = requiredRecord(value, "summary");
  return {
    status: requiredString(row.status, "summary.status"),
    planEndDate: requiredString(row.planEndDate, "summary.planEndDate"),
    totalRounds: requiredNumber(row.totalRounds, "summary.totalRounds"),
    completedRounds: requiredNumber(row.completedRounds, "summary.completedRounds"),
    scheduledRounds: requiredNumber(row.scheduledRounds, "summary.scheduledRounds"),
    skippedRounds: requiredNumber(row.skippedRounds, "summary.skippedRounds"),
    nextActionSeq: nullableNumber(row.nextActionSeq, "summary.nextActionSeq"),
    estimatedCost: toCostRange(row.estimatedCost, "summary.estimatedCost"),
    budgetState: nullableString(row.budgetState, "summary.budgetState"),
    cumulativeAcquisition: toAcquisitionRange(
      row.cumulativeAcquisition,
      "summary.cumulativeAcquisition",
    ),
  };
}

function toPlanStep(value: unknown, index: number): PlannerPlanStep {
  const field = `steps.${index}`;
  const row = requiredRecord(value, field);
  return {
    seq: requiredNumber(row.seq, `${field}.seq`),
    scheduledDate: requiredString(row.scheduledDate, `${field}.scheduledDate`),
    amount: requiredNumber(row.amount, `${field}.amount`),
    budgetKrw: nullableNumber(row.budgetKrw, `${field}.budgetKrw`),
    estimatedCost: toCostRange(row.estimatedCost, `${field}.estimatedCost`),
    acquisition: toAcquisitionRange(row.acquisition, `${field}.acquisition`),
    executedAmount: requiredNumber(row.executedAmount, `${field}.executedAmount`),
    executedRate: nullableNumber(row.executedRate, `${field}.executedRate`),
    executedDate: nullableString(row.executedDate, `${field}.executedDate`),
    status: requiredString(row.status, `${field}.status`),
    nextAction: requiredBoolean(row.nextAction, `${field}.nextAction`),
  };
}

/** 자동 생성 스냅샷과 분리된 최신 Plan 응답 런타임 경계. */
export function parsePlannerPlanResponse(value: unknown): PlannerPlanResponse {
  const row = requiredRecord(value, "plan");
  if (!Array.isArray(row.steps)) invalidResponse("steps");
  return {
    planId: nullableString(row.planId, "planId"),
    goalId: nullableString(row.goalId, "goalId"),
    version: nullableNumber(row.version, "version"),
    calculationMeta: toCalculationMeta(row.calculationMeta),
    goal: toPlanGoal(row.goal),
    summary: toPlanSummary(row.summary),
    steps: row.steps.map(toPlanStep),
    warnings: stringArray(row.warnings, "warnings"),
    disclaimer: requiredString(row.disclaimer, "disclaimer"),
  };
}

async function fetchActivePlan(goalId: string): Promise<PlannerPlanResponse | null> {
  try {
    const response = await request<unknown>(
      `/api/v1/goals/${encodeURIComponent(goalId)}/plans/active`,
    );
    return parsePlannerPlanResponse(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function fetchPlannerOverview(): Promise<PlannerApiOverview> {
  const [goalResult, xrayResult] = await Promise.all([
    requestWithMeta<GoalListResponse>("/api/v1/goals"),
    fetchXrayOverview(),
  ]);
  const items = await Promise.all(
    goalResult.data.goals.map(async (goal) => ({
      goal,
      activePlan: await fetchActivePlan(goal.id),
    })),
  );
  return {
    items,
    isDemo: goalResult.meta.isDemo ?? xrayResult.meta.isDemo,
    isSampleData:
      xrayResult.data.isSampleData ?? xrayResult.meta.isSampleData,
  };
}

function planRequest(goal: GoalResponse): PlannerPlanRequest {
  return { goalId: goal.id, currencyCode: goal.currencyCode };
}

async function requestPlan(
  path: string,
  init?: { readonly method: "POST"; readonly body?: unknown },
): Promise<PlannerPlanResponse> {
  const response =
    init === undefined
      ? await request<unknown>(path)
      : await request<unknown>(path, init);
  return parsePlannerPlanResponse(response);
}

export function previewGoalPlan(goal: GoalResponse): Promise<PlannerPlanResponse> {
  return requestPlan("/api/v1/plans/preview", {
    method: "POST",
    body: planRequest(goal),
  });
}

export function createGoalPlan(goal: GoalResponse): Promise<PlannerPlanResponse> {
  return requestPlan(
    `/api/v1/goals/${encodeURIComponent(goal.id)}/plans`,
    { method: "POST", body: planRequest(goal) },
  );
}

/**
 * 목표의 계획 버전 이력(`GET /api/v1/goals/{id}/plans`).
 *
 * 최신 버전이 먼저 온다. 과거 버전은 지워지지 않으므로 완료 회차 기록을
 * 되짚어 볼 때 쓴다.
 */
export async function fetchPlanVersions(
  goalId: string,
): Promise<readonly PlanVersion[]> {
  const { versions } = await request<PlanVersionListResponse>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/plans`,
  );
  return versions;
}

/** 계획 버전 하나의 상세(`GET /api/v1/plans/{id}`). 회차까지 함께 온다. */
export function fetchPlanDetail(planId: string): Promise<PlannerPlanResponse> {
  return requestPlan(`/api/v1/plans/${encodeURIComponent(planId)}`);
}

export function completePlanStep(
  planId: string,
  sequence: number,
  input: PlannerStepCompleteRequest,
): Promise<PlannerStepCompleteResponse> {
  return request<PlannerStepCompleteResponse>(
    `/api/v1/plans/${encodeURIComponent(planId)}/steps/${sequence}/complete`,
    { method: "POST", body: input },
  );
}

export function skipPlanStep(
  planId: string,
  sequence: number,
): Promise<PlannerStepSkipResponse> {
  return request<PlannerStepSkipResponse>(
    `/api/v1/plans/${encodeURIComponent(planId)}/steps/${sequence}/skip`,
    { method: "POST" },
  );
}

export function previewPlanScenario(
  planId: string,
  input: PlannerScenarioPreviewRequest,
): Promise<PlannerScenarioPreviewResponse> {
  return request<PlannerScenarioPreviewResponse>(
    `/api/v1/plans/${encodeURIComponent(planId)}/scenarios/preview`,
    { method: "POST", body: input },
  );
}

export function applyDraftPlan(draftPlanId: string): Promise<PlannerPlanResponse> {
  return requestPlan(
    `/api/v1/plans/${encodeURIComponent(draftPlanId)}/apply`,
    { method: "POST" },
  );
}

export function createPlannerExecutionKey(
  randomUuid: () => string = () => crypto.randomUUID(),
): string {
  return randomUuid();
}
