export const PLANNER_MODE_PREFERENCE_KEY =
  "divurve_planner_mode_preference";

const DEMO_PREFERENCE = "demo";

/** 회원이 명시적으로 선택한 데모 보기 상태만 현재 브라우저 세션에 보관한다. */
export function readPlannerDemoPreference(): boolean {
  try {
    return sessionStorage.getItem(PLANNER_MODE_PREFERENCE_KEY) === DEMO_PREFERENCE;
  } catch {
    return false;
  }
}

export function writePlannerDemoPreference(): void {
  try {
    sessionStorage.setItem(PLANNER_MODE_PREFERENCE_KEY, DEMO_PREFERENCE);
  } catch {
    // 저장소가 막혀도 현재 마운트의 로컬 UI 상태는 유지한다.
  }
}

export function clearPlannerDemoPreference(): void {
  try {
    sessionStorage.removeItem(PLANNER_MODE_PREFERENCE_KEY);
  } catch {
    // 저장소가 막힌 환경에서는 현재 마운트의 로컬 UI 상태만 해제한다.
  }
}
