import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import { presentPlannerOverview } from "./planner-api-presenter";
import type {
  PlannerPlanSummaryViewModel,
  PlannerScenarioComparisonViewModel,
  PlannerViewModel,
} from "./planner-api-types";
import { PlannerJourneyDetail } from "./planner-journey-detail";
import {
  PlannerJourneyConfirm,
  PlannerJourneyResult,
} from "./planner-journey-outcome";
import { PlannerJourneyPlanSetup } from "./planner-journey-plan-setup";
import { PlannerJourneyScenario } from "./planner-journey-scenario";
import { PlannerJourneyScreen } from "./planner-journey-screen";
import type { PlannerJourneyOperations } from "./use-planner-journey-flow";

const view = presentPlannerOverview(PLANNER_API_FIXTURE);
const plan = view.plan!;
const goalCreation = {
  sourceLabel: "내 계정",
  canCreateRecurring: false,
  today: "2026-09-08",
  onCreate: vi.fn().mockResolvedValue("goal-usd"),
};

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

const comparison: PlannerScenarioComparisonViewModel = {
  id: "rapidRise",
  label: "환율이 빠르게 상승하면",
  reason: "서버가 반환한 변경 조건입니다.",
  nextAction: "변경 내용을 확인해 주세요.",
  draftPlanId: "draft",
  rows: [{ label: "남은 회차", before: "1회", after: "2회" }],
  baseCurve: view.curve,
  alternativeCurve: view.curve,
  changedNodeIds: [view.curveNodes[0]!.id],
  warnings: [],
};

describe("Planner Journey 표현 컴포넌트", () => {
  it("장면별 보조 뒤로 가기와 현재 계획 선택을 동작시킨다", async () => {
    const ops = operations();
    render(
      <PlannerJourneyScreen
        ariaLabel="검수 플래너"
        view={view}
        feedback={{ status: "idle" }}
        scenarioComparison={null}
        goalCreation={goalCreation}
        {...ops}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "목표 다시 고르기" }));
    expect(screen.getByRole("heading", { name: "어떤 외화 목표를 이어갈까요?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /미국 ETF 준비/ }));
    expect(ops.onSelectGoal).toHaveBeenCalledWith("goal-usd");
    fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "현재 상태" }));
    fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 행동 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "Curve로 돌아가기" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 행동 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "상황이 바뀐다면?" }));
    fireEvent.click(screen.getByRole("button", { name: /현재 계획 유지/ }));
    expect(ops.onClearScenario).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "다음 행동으로 돌아가기" }));
    expect(screen.getByRole("heading", { name: "2회차를 확인할까요?" })).toBeInTheDocument();
  });

  it("선택된 목표가 없으면 목표 생성과 데모 진입을 안내한다", () => {
    const emptyView: PlannerViewModel = {
      ...view,
      goalItems: [],
      selectedGoal: null,
      plan: null,
      curveNodes: [],
      curve: null,
      steps: [],
      nextAction: null,
    };
    const { container } = render(
      <PlannerJourneyScreen
        ariaLabel="빈 플래너"
        view={emptyView}
        feedback={{ status: "idle" }}
        scenarioComparison={null}
        goalCreation={goalCreation}
        onExploreDemo={vi.fn()}
        {...operations()}
      />,
    );
    expect(container).not.toBeEmptyDOMElement();
    expect(
      screen.getByRole("heading", { name: "첫 외화 목표를 만들어 보세요" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "새 목표 만들기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "데모로 둘러보기" })).toBeInTheDocument();
  });

  it("상세 drawer는 미리보기 비용·경고를 표시하고 닫힌 뒤 포커스를 복원한다", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    const onClose = vi.fn();
    const previewPlan: PlannerPlanSummaryViewModel = {
      ...plan,
      planSource: "preview",
      estimatedCostLabel: "190,000원 ~ 215,000원",
      warnings: ["조건을 다시 확인해 주세요."],
    };
    const { unmount } = render(
      <PlannerJourneyDetail
        plan={previewPlan}
        steps={view.steps}
        returnFocus={trigger}
        onClose={onClose}
      />,
    );
    expect(screen.getByRole("heading", { name: "계획 미리보기" })).toBeInTheDocument();
    expect(screen.getByText("예상 비용 범위").parentElement).toHaveTextContent(
      "190,000원 ~ 215,000원",
    );
    expect(screen.getByText("조건을 다시 확인해 주세요.")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "상세 닫기" })[0]!);
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("계획 미리보기는 비용 누락과 처리 중 상태를 숨기지 않는다", () => {
    const onBack = vi.fn();
    const onCreate = vi.fn();
    render(
      <PlannerJourneyPlanSetup
        plan={{ ...plan, estimatedCostLabel: null }}
        isPending
        onBack={onBack}
        onCreate={onCreate}
      />,
    );
    expect(screen.getByText("서버 응답에 없음")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "계획을 만드는 중…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "현재 상태로" })).toBeDisabled();
  });

  it("현재 시나리오 선택과 처리 중 비교 상태를 접근 가능하게 표시한다", () => {
    const onClear = vi.fn();
    const onBack = vi.fn();
    const onContinue = vi.fn();
    const onSelect = vi.fn();
    render(
      <PlannerJourneyScenario
        sourceKind="sample"
        baseCurve={view.curve!}
        options={view.scenarioOptions!}
        comparison={comparison}
        selectedOptionId="rapidRise"
        isPending
        onSelect={onSelect}
        onClear={onClear}
        onContinue={onContinue}
        onBack={onBack}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /현재 계획 유지/ }));
    expect(onClear).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "대체 계획을 확인하는 중",
    );
    expect(screen.getByRole("button", { name: "다음 행동으로 돌아가기" })).toBeDisabled();
  });

  it("최종 확인 처리 상태와 결과 화면의 두 이동을 제공한다", () => {
    const onApply = vi.fn();
    const onBack = vi.fn();
    const first = render(
      <PlannerJourneyConfirm
        comparison={comparison}
        isPending
        onApply={onApply}
        onBack={onBack}
      />,
    );
    expect(screen.getByRole("button", { name: "적용하는 중…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "비교로 돌아가기" })).toBeDisabled();
    first.unmount();

    const onGoals = vi.fn();
    const onCurve = vi.fn();
    render(
      <PlannerJourneyResult
        title="적용 완료"
        onGoals={onGoals}
        onCurve={onCurve}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "다른 목표 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "최신 Curve 확인" }));
    expect(onGoals).toHaveBeenCalledOnce();
    expect(onCurve).toHaveBeenCalledOnce();
  });
});
