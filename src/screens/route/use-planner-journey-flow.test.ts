import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import { presentPlannerOverview } from "./planner-api-presenter";
import type { PlannerViewModel } from "./planner-api-types";
import {
  usePlannerJourneyFlow,
  type PlannerJourneyOperations,
} from "./use-planner-journey-flow";
import { writePlannerStepSelection } from "./planner-ui-selection";

const baseView = presentPlannerOverview(PLANNER_API_FIXTURE);
const scenario = baseView.scenarioOptions![1]!;

function operations(
  overrides: Partial<PlannerJourneyOperations> = {},
): PlannerJourneyOperations {
  return {
    onSelectGoal: vi.fn(),
    onPreviewPlan: vi.fn().mockResolvedValue(true),
    onDiscardPlanPreview: vi.fn(),
    onCreatePlan: vi.fn().mockResolvedValue(true),
    onComplete: vi.fn().mockResolvedValue(true),
    onRecordDemo: vi.fn().mockResolvedValue(true),
    onSkip: vi.fn().mockResolvedValue(true),
    onPreviewScenario: vi.fn().mockResolvedValue(true),
    onClearScenario: vi.fn(),
    onApplyScenario: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function withoutPlan(view: PlannerViewModel): PlannerViewModel {
  return {
    ...view,
    plan: null,
    curveNodes: [],
    curve: null,
    steps: [],
    nextAction: null,
  };
}

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("usePlannerJourneyFlow", () => {
  it("목표를 선택하면 통합 여정을 열고 완료 동작을 위임한다", async () => {
    const ops = operations();
    const { result } = renderHook(() => usePlannerJourneyFlow(baseView, ops));

    expect(result.current.selectedSequence).toBe(baseView.nextAction?.sequence);
    act(() => result.current.selectGoal("goal-usd"));
    expect(ops.onSelectGoal).toHaveBeenCalledWith("goal-usd");
    expect(result.current.stage).toBe("main");

    await act(async () => result.current.complete(145, 1_400));
    expect(result.current.stage).toBe("main");
    expect(ops.onComplete).toHaveBeenCalledWith(145, 1_400);
  });

  it("활성 계획이 없으면 preview와 명시적 create 성공 뒤 Curve로 이동한다", async () => {
    const ops = operations();
    const view = withoutPlan(baseView);
    const { result } = renderHook(() => usePlannerJourneyFlow(view, ops));

    expect(result.current.selectedSequence).toBeNull();
    act(() => result.current.selectGoal("goal-usd"));
    await act(async () => result.current.continueFromStatus());
    expect(ops.onPreviewPlan).toHaveBeenCalledOnce();
    expect(result.current.stage).toBe("planSetup");
    await act(async () => result.current.createPlan());
    expect(ops.onCreatePlan).toHaveBeenCalledOnce();
    expect(result.current.stage).toBe("main");
  });

  it("저장 전 preview는 생성 확인을 유지하고 뒤로 가면 폐기한다", async () => {
    const ops = operations();
    const view: PlannerViewModel = {
      ...baseView,
      plan: { ...baseView.plan!, planSource: "preview", id: null },
      nextAction: null,
    };
    const { result } = renderHook(() => usePlannerJourneyFlow(view, ops));

    act(() => result.current.setStage("main"));
    await act(async () => result.current.continueFromStatus());
    expect(result.current.stage).toBe("planSetup");
    expect(ops.onPreviewPlan).not.toHaveBeenCalled();

    act(() => result.current.returnFromPlanSetup());
    expect(ops.onDiscardPlanPreview).toHaveBeenCalledOnce();
    expect(result.current.stage).toBe("main");
  });

  it("실패한 비동기 동작은 현재 장면을 유지한다", async () => {
    const ops = operations({
      onPreviewPlan: vi.fn().mockResolvedValue(false),
      onCreatePlan: vi.fn().mockResolvedValue(false),
      onComplete: vi.fn().mockResolvedValue(false),
      onRecordDemo: vi.fn().mockResolvedValue(false),
      onSkip: vi.fn().mockResolvedValue(false),
      onApplyScenario: vi.fn().mockResolvedValue(false),
    });
    const { result } = renderHook(() =>
      usePlannerJourneyFlow(withoutPlan(baseView), ops),
    );

    act(() => result.current.setStage("main"));
    await act(async () => result.current.continueFromStatus());
    expect(result.current.stage).toBe("main");
    act(() => result.current.setStage("planSetup"));
    await act(async () => result.current.createPlan());
    expect(result.current.stage).toBe("planSetup");
    await act(async () => result.current.complete(1, 1));
    await act(async () => result.current.recordDemo());
    await act(async () => result.current.skip());
    expect(result.current.stage).toBe("planSetup");
    act(() => result.current.setStage("main"));
    await act(async () => result.current.applyScenario());
    expect(result.current.stage).toBe("main");
  });

  it("시나리오 선택·해제와 적용 동작을 위임한다", async () => {
    const ops = operations();
    const { result } = renderHook(() => usePlannerJourneyFlow(baseView, ops));

    await act(async () => result.current.previewScenario(scenario, 180_000));
    expect(result.current.selectedScenarioId).toBe(scenario.id);
    expect(ops.onPreviewScenario).toHaveBeenCalledWith(scenario, 180_000);
    act(() => result.current.clearScenario());
    expect(result.current.selectedScenarioId).toBeNull();
    expect(ops.onClearScenario).toHaveBeenCalledOnce();

    await act(async () => result.current.applyScenario());
    expect(ops.onApplyScenario).toHaveBeenCalledOnce();
  });

  it("데모 기록과 건너뛰기 성공을 위임한다", async () => {
    const ops = operations();
    const { result } = renderHook(() => usePlannerJourneyFlow(baseView, ops));
    await act(async () => result.current.recordDemo());
    expect(ops.onRecordDemo).toHaveBeenCalledOnce();

    await act(async () => result.current.skip());
    expect(result.current.stage).toBe("goal");
    expect(result.current.selectedScenarioId).toBe("missedRound");
  });

  it("선택 회차가 없으면 첫 회차를 초기 선택한다", () => {
    const view: PlannerViewModel = {
      ...baseView,
      nextAction: null,
    };
    const { result } = renderHook(() =>
      usePlannerJourneyFlow(view, operations()),
    );
    expect(result.current.selectedSequence).toBe(view.steps[0]?.sequence);
    act(() => result.current.setSelectedSequence(99));
    expect(result.current.selectedSequence).toBe(99);
  });

  it("같은 목표의 저장된 회차를 복원하고 활성 계획은 바로 통합 화면을 연다", async () => {
    writePlannerStepSelection(baseView.selectedGoal!.id, 1);
    const ops = operations();
    const { result } = renderHook(() => usePlannerJourneyFlow(baseView, ops));

    expect(result.current.selectedSequence).toBe(1);
    act(() => result.current.setStage("history"));
    await act(async () => result.current.continueFromStatus());
    expect(result.current.stage).toBe("main");
    expect(ops.onPreviewPlan).not.toHaveBeenCalled();
    act(() => result.current.setSelectedSequence(null));
    expect(result.current.selectedSequence).toBeNull();
  });

  it("목표가 없는 방어 상태에서는 회차 선택을 브라우저 저장소에 쓰지 않는다", () => {
    const view = withoutPlan({ ...baseView, selectedGoal: null });
    const { result } = renderHook(() => usePlannerJourneyFlow(view, operations()));
    act(() => result.current.setSelectedSequence(3));
    expect(result.current.selectedSequence).toBe(3);
    expect(window.sessionStorage.length).toBe(0);
  });
});
