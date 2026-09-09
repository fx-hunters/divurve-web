import { act, render } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { loadRoutePlan } from "../../api/route";
import type { RoutePlanData } from "../../types/route";
import { readPlannerDemoProgress } from "./planner-demo-progress";
import { PlannerDemoScreen } from "./planner-demo-screen";

let captured: {
  readonly onRecordDemo: () => Promise<boolean>;
  readonly onApplyScenario: () => Promise<boolean>;
} | null = null;

vi.mock("./planner-journey-screen", () => ({
  PlannerJourneyScreen: (props: typeof captured) => {
    captured = props;
    return <div data-testid="planner-journey-stub" />;
  },
}));

let data: RoutePlanData;
const navigation = { stage: "main" as const, onOpenGoalSelect: vi.fn(), onOpenGoalStage: vi.fn() };

function mapNonEmpty<T>(
  items: readonly [T, ...T[]],
  mapper: (item: T) => T,
): readonly [T, ...T[]] {
  const [first, ...rest] = items;
  return [mapper(first), ...rest.map(mapper)];
}

beforeAll(async () => {
  const loaded = await loadRoutePlan();
  if (loaded === null) throw new Error("데모 플래너 fixture가 필요합니다.");
  data = loaded;
});

beforeEach(() => {
  captured = null;
  window.sessionStorage.clear();
});

describe("PlannerDemoScreen", () => {
  it("기록 중복 요청을 거절하고 완료한 회차만 저장한다", async () => {
    render(<PlannerDemoScreen data={data} goalId={null} navigation={navigation} />);
    if (captured === null) throw new Error("여정 콜백이 필요합니다.");

    let first!: Promise<boolean>;
    let duplicate!: Promise<boolean>;
    await act(async () => {
      first = captured!.onRecordDemo();
      duplicate = captured!.onRecordDemo();
      await first;
    });

    await expect(first).resolves.toBe(true);
    await expect(duplicate).resolves.toBe(false);
    expect(readPlannerDemoProgress().goals["usd-etf-recurring-demo"])
      .toMatchObject({ recordedSequences: [1] });

    // 새 렌더에서 사용자가 2회차를 누른 것은 1회차 중복 요청이 아니다.
    await act(async () => {
      expect(await captured!.onRecordDemo()).toBe(true);
    });
    expect(readPlannerDemoProgress().goals["usd-etf-recurring-demo"])
      .toMatchObject({ recordedSequences: [1, 2] });
  });

  it("다음 회차가 없는 데모에서는 기록을 거절하고 비교 없이 적용하지 않는다", async () => {
    const completedData: RoutePlanData = {
      ...data,
      plans: mapNonEmpty(data.plans, (plan) => ({
        ...plan,
        curveData: {
          ...plan.curveData,
          steps: plan.curveData.steps.map((step) => ({
            ...step,
            status: "completed" as const,
          })),
        },
      })),
    };
    render(<PlannerDemoScreen data={completedData} goalId={null} navigation={navigation} />);
    if (captured === null) throw new Error("여정 콜백이 필요합니다.");

    await expect(captured.onRecordDemo()).resolves.toBe(false);
    await expect(captured.onApplyScenario()).resolves.toBe(false);
    expect(readPlannerDemoProgress().goals).toEqual({});
  });
});
