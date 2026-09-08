import { ApiError, request } from "./client";
import type {
  GoalListResponse,
  GoalResponse,
  PlanResponse,
  PlanStatusCode,
  StepCompleteRequest,
  StepCompleteResponse,
  StepSkipResponse,
} from "./generated/divurve-api";

export interface PlannerApiItem {
  readonly goal: GoalResponse;
  readonly activePlan: PlanResponse | null;
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
  readonly status: PlanStatusCode;
  readonly reason?: string;
  readonly planEndDate?: string;
  /** 이 계획을 대체한 계획 id. 최신 버전에는 없다. */
  readonly supersededBy?: string;
  readonly createdAt?: string;
}

export interface PlanVersionListResponse {
  readonly versions: readonly PlanVersion[];
}

async function fetchActivePlan(goalId: string): Promise<PlanResponse | null> {
  try {
    return await request<PlanResponse>(
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
export function fetchPlanDetail(planId: string): Promise<PlanResponse> {
  return request<PlanResponse>(
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

/**
 * 회차 건너뛰기(`POST /api/v1/plans/{id}/steps/{seq}/skip`).
 *
 * **미리보기다.** 백엔드 `PlanController.skipStep` 는 "건너뛴 뒤의 변경 계획을
 * 미리보기로 반환한다. 계획을 즉시 덮어쓰지 않는다"고 못박고 응답 `applied` 는
 * 항상 `false` 다(명세 §15·§21-9). 호출해도 활성 계획은 그대로이므로 재조회할
 * 것이 없다.
 */
export function skipPlanStep(
  planId: string,
  sequence: number,
): Promise<StepSkipResponse> {
  return request<StepSkipResponse>(
    `/api/v1/plans/${encodeURIComponent(planId)}/steps/${sequence}/skip`,
    { method: "POST" },
  );
}
