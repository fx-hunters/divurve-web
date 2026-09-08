export const PLANNER_UI_SELECTION_KEY = "divurve_planner_ui_selection";

export interface PlannerUiSelection {
  readonly goalId: string | null;
  readonly sequence: number | null;
}

const EMPTY_SELECTION: PlannerUiSelection = { goalId: null, sequence: null };

export function readPlannerUiSelection(): PlannerUiSelection {
  try {
    const raw = sessionStorage.getItem(PLANNER_UI_SELECTION_KEY);
    if (raw === null) return EMPTY_SELECTION;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return EMPTY_SELECTION;
    const record = parsed as Record<string, unknown>;
    return {
      goalId: typeof record.goalId === "string" ? record.goalId : null,
      sequence:
        typeof record.sequence === "number" &&
        Number.isInteger(record.sequence) &&
        record.sequence > 0
          ? record.sequence
          : null,
    };
  } catch {
    return EMPTY_SELECTION;
  }
}

export function writePlannerGoalSelection(goalId: string): void {
  try {
    sessionStorage.setItem(
      PLANNER_UI_SELECTION_KEY,
      JSON.stringify({ goalId, sequence: null }),
    );
  } catch {
    // 브라우저 저장소가 막혀도 현재 화면 상태는 계속 사용할 수 있다.
  }
}

export function writePlannerStepSelection(
  goalId: string | null,
  sequence: number,
): void {
  if (goalId === null) return;
  try {
    sessionStorage.setItem(
      PLANNER_UI_SELECTION_KEY,
      JSON.stringify({ goalId, sequence }),
    );
  } catch {
    // 브라우저 저장소가 막혀도 현재 화면 상태는 계속 사용할 수 있다.
  }
}
