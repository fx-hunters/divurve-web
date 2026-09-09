import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import { presentPlannerOverview } from "./planner-api-presenter";
import type { PlannerViewModel } from "./planner-api-types";
import {
  usePlannerJourneyFlow,
  type JourneyStage,
  type PlannerJourneyOperations,
} from "./use-planner-journey-flow";
import { writePlannerStepSelection } from "./planner-ui-selection";

const baseView = presentPlannerOverview(PLANNER_API_FIXTURE);
const scenario = baseView.scenarioOptions![1]!;
const baseGoalId = baseView.selectedGoal!.id;

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

/**
 * 단계를 주소가 들고 있는 실제 구성을 흉내 낸다.
 *
 * 훅은 이동을 요청만 하고 스스로 단계를 바꾸지 않으므로, 이동 요청이 왔는지를
 * 검사하고 필요하면 `rerender`로 "주소가 따라온" 상태를 만든다.
 */
function renderFlow(
  view: PlannerViewModel,
  ops: PlannerJourneyOperations,
  initialStage: JourneyStage = "goal",
) {
  const onOpenGoalSelect = vi.fn();
  const onOpenGoalStage = vi.fn();
  const rendered = renderHook(
    ({ stage }: { readonly stage: JourneyStage }) =>
      usePlannerJourneyFlow(view, ops, {
        stage,
        onOpenGoalSelect,
        onOpenGoalStage,
      }),
    { initialProps: { stage: initialStage } },
  );
  return { ...rendered, onOpenGoalSelect, onOpenGoalStage };
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
  it("목표를 선택하면 그 목표의 메인 단계로 이동을 요청한다", async () => {
    const ops = operations();
    const { result, rerender, onOpenGoalStage } = renderFlow(baseView, ops);

    expect(result.current.stage).toBe("goal");
    expect(result.current.selectedSequence).toBe(baseView.nextAction?.sequence);

    act(() => result.current.selectGoal("goal-usd"));
    expect(ops.onSelectGoal).toHaveBeenCalledWith("goal-usd");
    expect(onOpenGoalStage).toHaveBeenCalledWith("goal-usd", "main");

    rerender({ stage: "main" });
    expect(result.current.stage).toBe("main");
    await act(async () => result.current.complete(145, 1_400));
    expect(ops.onComplete).toHaveBeenCalledWith(145, 1_400);
  });

  it("목록에서 고르기만 하면 이동하지 않는다", () => {
    const ops = operations();
    const { result, onOpenGoalStage } = renderFlow(baseView, ops);

    act(() => result.current.chooseGoal("goal-jpy"));
    expect(ops.onSelectGoal).toHaveBeenCalledWith("goal-jpy");
    expect(onOpenGoalStage).not.toHaveBeenCalled();
  });

  it("활성 계획이 없으면 preview와 명시적 create 뒤 각각 이동을 요청한다", async () => {
    const ops = operations();
    const view = withoutPlan(baseView);
    const { result, onOpenGoalStage } = renderFlow(view, ops, "main");

    expect(result.current.selectedSequence).toBeNull();
    await act(async () => result.current.continueFromStatus());
    expect(ops.onPreviewPlan).toHaveBeenCalledOnce();
    expect(onOpenGoalStage).toHaveBeenCalledWith(baseGoalId, "planSetup");

    await act(async () => result.current.createPlan());
    expect(ops.onCreatePlan).toHaveBeenCalledOnce();
    expect(onOpenGoalStage).toHaveBeenLastCalledWith(baseGoalId, "main");
  });

  it("저장 전 preview는 다시 계산하지 않고, 뒤로 가면 폐기한다", async () => {
    const ops = operations();
    const view: PlannerViewModel = {
      ...baseView,
      plan: { ...baseView.plan!, planSource: "preview", id: null },
      nextAction: null,
    };
    const { result, onOpenGoalStage } = renderFlow(view, ops, "main");

    await act(async () => result.current.continueFromStatus());
    expect(onOpenGoalStage).toHaveBeenCalledWith(baseGoalId, "planSetup");
    expect(ops.onPreviewPlan).not.toHaveBeenCalled();

    act(() => result.current.returnFromPlanSetup());
    expect(ops.onDiscardPlanPreview).toHaveBeenCalledOnce();
    expect(onOpenGoalStage).toHaveBeenLastCalledWith(baseGoalId, "main");
  });

  it("활성 계획이 있으면 계산 없이 메인으로 되돌린다", async () => {
    const ops = operations();
    const { result, onOpenGoalStage } = renderFlow(baseView, ops, "history");

    await act(async () => result.current.continueFromStatus());
    expect(ops.onPreviewPlan).not.toHaveBeenCalled();
    expect(onOpenGoalStage).toHaveBeenCalledWith(baseGoalId, "main");
  });

  it("실패한 비동기 동작은 이동을 요청하지 않는다", async () => {
    const ops = operations({
      onPreviewPlan: vi.fn().mockResolvedValue(false),
      onCreatePlan: vi.fn().mockResolvedValue(false),
      onComplete: vi.fn().mockResolvedValue(false),
      onRecordDemo: vi.fn().mockResolvedValue(false),
      onSkip: vi.fn().mockResolvedValue(false),
      onApplyScenario: vi.fn().mockResolvedValue(false),
    });
    const { result, onOpenGoalStage } = renderFlow(
      withoutPlan(baseView),
      ops,
      "main",
    );

    await act(async () => result.current.continueFromStatus());
    await act(async () => result.current.createPlan());
    await act(async () => result.current.complete(1, 1));
    await act(async () => result.current.recordDemo());
    await act(async () => result.current.skip());
    await act(async () => result.current.applyScenario());
    expect(onOpenGoalStage).not.toHaveBeenCalled();
    expect(result.current.selectedScenarioId).toBeNull();
  });

  it("이력과 목표 목록으로 나가는 이동을 각각 위임한다", () => {
    const ops = operations();
    const { result, onOpenGoalSelect, onOpenGoalStage } = renderFlow(
      baseView,
      ops,
      "main",
    );

    act(() => result.current.openHistory());
    expect(onOpenGoalStage).toHaveBeenCalledWith(baseGoalId, "history");

    act(() => result.current.backToGoals());
    expect(onOpenGoalSelect).toHaveBeenCalledOnce();
  });

  it("시나리오 선택·해제와 적용 동작을 위임한다", async () => {
    const ops = operations();
    const { result } = renderFlow(baseView, ops, "main");

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
    const { result } = renderFlow(baseView, ops, "main");
    await act(async () => result.current.recordDemo());
    expect(ops.onRecordDemo).toHaveBeenCalledOnce();

    await act(async () => result.current.skip());
    expect(result.current.selectedScenarioId).toBe("missedRound");
  });

  it("선택 회차가 없으면 첫 회차를 초기 선택한다", () => {
    const view: PlannerViewModel = {
      ...baseView,
      nextAction: null,
    };
    const { result } = renderFlow(view, operations(), "main");
    expect(result.current.selectedSequence).toBe(view.steps[0]?.sequence);
    act(() => result.current.setSelectedSequence(99));
    expect(result.current.selectedSequence).toBe(99);
  });

  it("같은 목표의 저장된 회차를 복원하고 해제도 반영한다", () => {
    writePlannerStepSelection(baseGoalId, 1);
    const { result } = renderFlow(baseView, operations(), "main");

    expect(result.current.selectedSequence).toBe(1);
    act(() => result.current.setSelectedSequence(null));
    expect(result.current.selectedSequence).toBeNull();
  });

  it("목표가 없으면 회차를 저장하지도, 단계를 열지도 않는다", () => {
    const view = withoutPlan({ ...baseView, selectedGoal: null });
    const { result, onOpenGoalStage } = renderFlow(view, operations(), "main");

    act(() => result.current.setSelectedSequence(3));
    expect(result.current.selectedSequence).toBe(3);
    expect(window.sessionStorage.length).toBe(0);

    act(() => result.current.enterSelectedGoal());
    expect(onOpenGoalStage).not.toHaveBeenCalled();
  });
});
