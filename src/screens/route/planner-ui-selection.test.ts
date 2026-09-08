import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PLANNER_UI_SELECTION_KEY,
  readPlannerUiSelection,
  writePlannerGoalSelection,
  writePlannerStepSelection,
} from "./planner-ui-selection";

describe("planner-ui-selection", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("선택이 없거나 JSON이 손상되면 빈 선택을 반환한다", () => {
    expect(readPlannerUiSelection()).toEqual({ goalId: null, sequence: null });
    window.sessionStorage.setItem(PLANNER_UI_SELECTION_KEY, "{");
    expect(readPlannerUiSelection()).toEqual({ goalId: null, sequence: null });
  });

  it.each(["null", "1", '"goal"'])(
    "객체가 아닌 %s 저장값을 무시한다",
    (raw) => {
      window.sessionStorage.setItem(PLANNER_UI_SELECTION_KEY, raw);
      expect(readPlannerUiSelection()).toEqual({ goalId: null, sequence: null });
    },
  );

  it("목표 선택을 저장하면 이전 회차 선택을 비운다", () => {
    writePlannerStepSelection("old-goal", 3);
    writePlannerGoalSelection("new-goal");
    expect(readPlannerUiSelection()).toEqual({
      goalId: "new-goal",
      sequence: null,
    });
  });

  it("양의 정수 회차만 복원한다", () => {
    for (const sequence of [0, -1, 1.5, "2", null]) {
      window.sessionStorage.setItem(
        PLANNER_UI_SELECTION_KEY,
        JSON.stringify({ goalId: 10, sequence }),
      );
      expect(readPlannerUiSelection()).toEqual({
        goalId: null,
        sequence: null,
      });
    }
    writePlannerStepSelection("goal-usd", 2);
    expect(readPlannerUiSelection()).toEqual({
      goalId: "goal-usd",
      sequence: 2,
    });
  });

  it("목표가 없으면 회차 선택을 저장하지 않는다", () => {
    writePlannerStepSelection(null, 2);
    expect(window.sessionStorage.getItem(PLANNER_UI_SELECTION_KEY)).toBeNull();
  });

  it("브라우저 저장소 접근이 막혀도 읽기와 화면 동작을 방해하지 않는다", () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(readPlannerUiSelection()).toEqual({ goalId: null, sequence: null });
    getItem.mockRestore();

    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(() => writePlannerGoalSelection("goal-usd")).not.toThrow();
    expect(() => writePlannerStepSelection("goal-usd", 2)).not.toThrow();
    setItem.mockRestore();
  });
});
