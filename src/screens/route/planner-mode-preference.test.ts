import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPlannerDemoPreference,
  PLANNER_MODE_PREFERENCE_KEY,
  readPlannerDemoPreference,
  writePlannerDemoPreference,
} from "./planner-mode-preference";

describe("planner mode preference", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("회원이 명시적으로 고른 데모 보기만 현재 세션에 저장하고 해제한다", () => {
    expect(readPlannerDemoPreference()).toBe(false);
    writePlannerDemoPreference();
    expect(readPlannerDemoPreference()).toBe(true);
    expect(sessionStorage.getItem(PLANNER_MODE_PREFERENCE_KEY)).toBe("demo");
    clearPlannerDemoPreference();
    expect(readPlannerDemoPreference()).toBe(false);
  });

  it("알 수 없는 값과 차단된 저장소를 데모 선택으로 해석하지 않는다", () => {
    sessionStorage.setItem(PLANNER_MODE_PREFERENCE_KEY, "api");
    expect(readPlannerDemoPreference()).toBe(false);

    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readPlannerDemoPreference()).toBe(false);
    getItem.mockRestore();

    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => writePlannerDemoPreference()).not.toThrow();
    setItem.mockRestore();

    const removeItem = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => clearPlannerDemoPreference()).not.toThrow();
    removeItem.mockRestore();
  });
});
