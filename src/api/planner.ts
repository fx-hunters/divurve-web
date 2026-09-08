import { ApiError, request } from "./client";
import type {
  ActivePlanResponse,
  GoalListResponse,
  GoalResponse,
  StepCompleteRequest,
  StepCompleteResponse,
  StepSkipResponse,
} from "./generated/divurve-api";

export interface PlannerApiItem {
  readonly goal: GoalResponse;
  readonly activePlan: ActivePlanResponse | null;
}

export interface PlannerApiOverview {
  readonly items: readonly PlannerApiItem[];
}

/**
 * 계획 버전 하나. 백엔드 `PlanVersionListResponse.Version` 과 같은 형태다.
 *
 * 응답이 `NON_NULL` 직렬화라 값이 없는 필드는 키 자체가 오지 않는다.
 * snake_case → camelCase 변환은 `api/client.ts` 경계가 이미 끝냈다(AGENTS.md §4).
 */
export interface PlanVersion {
  readonly planId: string;
  readonly version: number;
  /** 계획 상태. 백엔드 `PlanStatus` 의 소문자 리터럴을 그대로 쓴다. */
  readonly status: string;
  readonly reason?: string;
  readonly planEndDate?: string;
  /** 이 계획을 대체한 계획 id. 최신 버전에는 없다. */
  readonly supersededBy?: string;
  readonly createdAt?: string;
}

export interface PlanVersionListResponse {
  readonly versions: readonly PlanVersion[];
}

async function fetchActivePlan(goalId: string): Promise<ActivePlanResponse | null> {
  try {
    return await request<ActivePlanResponse>(
      `/api/v1/goals/${encodeURIComponent(goalId)}/plans/active`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function fetchPlannerOverview(): Promise<PlannerApiOverview> {
  const { goals } = await request<GoalListResponse>("/api/v1/goals");
  const items = await Promise.all(
    goals.map(async (goal) => ({
      goal,
      activePlan: await fetchActivePlan(goal.id),
    })),
  );
  return { items };
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
export function fetchPlanDetail(planId: string): Promise<ActivePlanResponse> {
  return request<ActivePlanResponse>(
    `/api/v1/plans/${encodeURIComponent(planId)}`,
  );
}

export function completePlanStep(
  planId: string,
  sequence: number,
  input: StepCompleteRequest,
): Promise<StepCompleteResponse> {
  return request<StepCompleteResponse>(
    `/api/v1/plans/${encodeURIComponent(planId)}/steps/${sequence}/complete`,
    { method: "POST", body: input },
  );
}

export function skipPlanStep(
  planId: string,
  sequence: number,
): Promise<StepSkipResponse> {
  return request<StepSkipResponse>(
    `/api/v1/plans/${encodeURIComponent(planId)}/steps/${sequence}/skip`,
    { method: "POST" },
  );
}
