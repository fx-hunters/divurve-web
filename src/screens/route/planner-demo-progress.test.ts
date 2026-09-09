import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyPlannerDemoScenario,
  EMPTY_PLANNER_DEMO_PROGRESS,
  getPlannerDemoGoalProgress,
  PLANNER_DEMO_PROGRESS_KEY,
  readPlannerDemoProgress,
  recordPlannerDemoSequence,
  writePlannerDemoProgress,
} from "./planner-demo-progress";

describe("planner demo progress", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("목표별 기록과 적용 시나리오를 현재 세션에 분리해 보관한다", () => {
    const withUsd = recordPlannerDemoSequence(
      EMPTY_PLANNER_DEMO_PROGRESS,
      "usd-goal",
      1,
    );
    const duplicate = recordPlannerDemoSequence(withUsd, "usd-goal", 1);
    const withJpy = recordPlannerDemoSequence(duplicate, "jpy-goal", 2);
    const applied = applyPlannerDemoScenario(withJpy, "usd-goal", "reducedBudget");

    expect(duplicate).toBe(withUsd);
    expect(getPlannerDemoGoalProgress(applied, "usd-goal")).toEqual({
      recordedSequences: [1],
      appliedScenarioId: "reducedBudget",
    });
    expect(getPlannerDemoGoalProgress(applied, "jpy-goal")).toEqual({
      recordedSequences: [2],
      appliedScenarioId: null,
    });
    expect(recordPlannerDemoSequence(applied, "usd-goal", 0)).toBe(applied);
    expect(applyPlannerDemoScenario(applied, "usd-goal", "reducedBudget")).toBe(
      applied,
    );

    writePlannerDemoProgress(applied);
    expect(readPlannerDemoProgress()).toEqual(applied);
  });

  it("손상되거나 이전 형식인 값은 빈 상태로 복구하고 유효한 항목만 읽는다", () => {
    sessionStorage.setItem(PLANNER_DEMO_PROGRESS_KEY, "not-json");
    expect(readPlannerDemoProgress()).toBe(EMPTY_PLANNER_DEMO_PROGRESS);

    sessionStorage.setItem(
      PLANNER_DEMO_PROGRESS_KEY,
      JSON.stringify({ version: 2, goals: {} }),
    );
    expect(readPlannerDemoProgress()).toBe(EMPTY_PLANNER_DEMO_PROGRESS);

    sessionStorage.setItem(
      PLANNER_DEMO_PROGRESS_KEY,
      JSON.stringify({
        version: 1,
        goals: {
          valid: {
            recordedSequences: [2, 1, 2, 0, "3"],
            appliedScenarioId: "missedRound",
          },
          invalid: null,
        },
      }),
    );
    expect(readPlannerDemoProgress()).toEqual({
      version: 1,
      goals: {
        valid: {
          recordedSequences: [1, 2],
          appliedScenarioId: "missedRound",
        },
      },
    });
  });

  it("브라우저 저장소가 막혀도 읽기와 쓰기가 화면을 중단하지 않는다", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readPlannerDemoProgress()).toBe(EMPTY_PLANNER_DEMO_PROGRESS);
    getItem.mockRestore();

    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => writePlannerDemoProgress(EMPTY_PLANNER_DEMO_PROGRESS)).not.toThrow();
    setItem.mockRestore();
  });
});
