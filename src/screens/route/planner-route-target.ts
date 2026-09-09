/**
 * 플래너 화면이 주소로부터 받는 위치.
 *
 * `app/app-routing.ts`의 같은 이름 타입과 형태가 같지만 여기서 따로 선언한다 —
 * 의존성은 app → screens 한 방향으로만 흐른다(AGENTS.md §7.1). 형태가 같으므로
 * 호출부는 변환 없이 그대로 넘긴다.
 */
export type PlannerScreenSource = "api" | "demo";

/** 목표 하나를 고른 뒤의 단계. */
export type PlannerScreenStage = "main" | "planSetup" | "history" | "edit";

export type PlannerScreenTarget =
  | { readonly kind: "goalSelect" }
  | {
      readonly kind: "goal";
      readonly goalId: string;
      readonly stage: PlannerScreenStage;
    }
  | {
      readonly kind: "planDetail";
      readonly goalId: string;
      readonly planId: string;
    };

export const PLANNER_GOAL_SELECT: PlannerScreenTarget = { kind: "goalSelect" };

/** 주소가 가리키는 목표. 목표 선택 화면에서는 없다. */
export function plannerTargetGoalId(target: PlannerScreenTarget): string | null {
  return target.kind === "goalSelect" ? null : target.goalId;
}
