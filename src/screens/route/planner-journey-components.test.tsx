import { createRef } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import { presentPlannerOverview } from "./planner-api-presenter";
import type {
  PlannerScenarioComparisonViewModel,
  PlannerViewModel,
} from "./planner-api-types";
import { PlannerJourneyPlanSetup } from "./planner-journey-plan-setup";
import { PlannerScenarioModal } from "./planner-journey-scenario";
import { PlannerJourneyScreen } from "./planner-journey-screen";
import { PlannerJourneyMain } from "./planner-journey-main";
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
  it("1% 미만 진행률을 100배로 표시하지 않고 결측 확보액에는 막대를 숨긴다", () => {
    const lowProgress: PlannerViewModel = {
      ...view, selectedGoal: { ...view.selectedGoal!, heldAmount: 0.5, progressPercent: 0.5 },
    };
    const props = {
      ariaLabel: "검수 플래너", feedback: { status: "idle" as const },
      scenarioComparison: null, goalCreation, onOpenPlanDetail: vi.fn(), ...operations(),
    };
    const { rerender } = render(<PlannerJourneyScreen {...props} view={lowProgress} />);
    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    rerender(<PlannerJourneyScreen {...props} view={{ ...lowProgress,
      selectedGoal: { ...lowProgress.selectedGoal!, heldAmount: null, progressLabel: "확보액 확인 필요" },
    }} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("확보액 확인 필요")).toBeInTheDocument();
  });
  it("목표 선택 뒤 현재 상태·Curve·다음 행동을 한 장면에서 제공한다", () => {
    const ops = operations();
    const onOpenPlanDetail = vi.fn();
    render(
      <PlannerJourneyScreen
        ariaLabel="검수 플래너"
        view={view}
        feedback={{ status: "idle" }}
        scenarioComparison={null}
        goalCreation={goalCreation}
        onOpenPlanDetail={onOpenPlanDetail}
        {...ops}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    expect(screen.getByRole("region", { name: "계획 Curve" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2회차를 확인할까요?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "← 목표 목록" }));
    expect(screen.getByRole("heading", { name: "어떤 외화 목표를 이어갈까요?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /미국 ETF 준비/ }));
    expect(ops.onSelectGoal).toHaveBeenCalledWith("goal-usd");
    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "상황이 바뀐다면?" }));
    fireEvent.click(screen.getByRole("button", { name: /현재 계획 유지/ }));
    expect(ops.onClearScenario).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getAllByRole("button", { name: "상황 비교 닫기" })[1]!);
    fireEvent.click(screen.getByRole("button", { name: "전체 계획 상세 보기" }));
    expect(onOpenPlanDetail).toHaveBeenCalledWith("goal-usd", "plan-usd");
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
        onOpenPlanDetail={vi.fn()}
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

  it("목표 생성이 실패하면 입력 화면을 유지하고 목표 선택을 바꾸지 않는다", async () => {
    const ops = operations();
    const onCreate = vi.fn().mockResolvedValue(null);
    render(
      <PlannerJourneyScreen
        ariaLabel="목표 생성 실패 플래너"
        view={view}
        feedback={{ status: "error", message: "목표를 저장하지 못했습니다." }}
        scenarioComparison={null}
        goalCreation={{ ...goalCreation, onCreate }}
        onOpenPlanDetail={vi.fn()}
        {...ops}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "새 목표 만들기" }));
    fireEvent.change(screen.getByLabelText("목표 이름 또는 목적"), {
      target: { value: "새 여행" },
    });
    fireEvent.change(screen.getByLabelText("목표 외화 금액"), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText("목표 날짜"), {
      target: { value: "2027-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "새 목표 만들기" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
    expect(screen.getByRole("heading", { name: /어떤 외화를 언제까지/ })).toBeInTheDocument();
    expect(ops.onSelectGoal).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(
      screen.getByRole("heading", { name: "어떤 외화 목표를 이어갈까요?" }),
    ).toBeInTheDocument();
  });

  it("저장 식별자가 없는 미리보기는 상세 경로를 열지 않는다", () => {
    const onOpenPlanDetail = vi.fn();
    render(
      <PlannerJourneyScreen
        ariaLabel="미리보기 플래너"
        view={{
          ...view,
          plan: { ...plan, id: null, planSource: "preview" },
        }}
        feedback={{ status: "idle" }}
        scenarioComparison={null}
        goalCreation={goalCreation}
        onOpenPlanDetail={onOpenPlanDetail}
        {...operations()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "전체 계획 상세 보기" }));
    expect(onOpenPlanDetail).not.toHaveBeenCalled();
  });

  it("선택 회차가 없는 통합 화면과 목표 없는 방어 상태를 안전하게 표시한다", () => {
    const onAnimationEnd = vi.fn();
    const commonProps = {
      selectedSequence: null,
      isPending: false,
      detailButtonRef: createRef<HTMLButtonElement>(),
      scenarioButtonRef: createRef<HTMLButtonElement>(),
      isPlanChanged: true,
      onSelectSequence: vi.fn(),
      onPreviewPlan: vi.fn(),
      onComplete: vi.fn(),
      onRecordDemo: vi.fn(),
      onSkip: vi.fn(),
      onExploreScenario: vi.fn(),
      onOpenDetail: vi.fn(),
      onBackToGoals: vi.fn(),
      onPlanChangeAnimationEnd: onAnimationEnd,
    };
    const first = render(
      <PlannerJourneyMain
        {...commonProps}
        view={{ ...view, steps: [], nextAction: null }}
      />,
    );
    expect(screen.queryByText("선택 지점")).not.toBeInTheDocument();
    fireEvent.animationEnd(screen.getByRole("heading", { name: view.selectedGoal!.name }).closest("section")!);
    expect(onAnimationEnd).toHaveBeenCalledOnce();
    first.unmount();

    const empty = render(
      <PlannerJourneyMain
        {...commonProps}
        view={{ ...view, selectedGoal: null }}
      />,
    );
    expect(empty.container).toBeEmptyDOMElement();
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

  it("시나리오 모달은 처리 중 비교 상태와 단일 적용 버튼을 표시한다", () => {
    const onClear = vi.fn();
    const onClose = vi.fn();
    const onApply = vi.fn();
    const onSelect = vi.fn();
    render(
      <PlannerScenarioModal
        sourceKind="sample"
        baseCurve={view.curve!}
        options={view.scenarioOptions!}
        comparison={comparison}
        selectedOptionId="rapidRise"
        isPending
        returnFocus={null}
        onSelect={onSelect}
        onClear={onClear}
        onClose={onClose}
        onApply={onApply}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /현재 계획 유지/ }));
    expect(onClear).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "변경 경로를 확인하는 중",
    );
    expect(screen.getByText("확대 비교 구간").parentElement).toHaveTextContent(
      /2026/,
    );
    expect(screen.getByRole("button", { name: "적용하는 중…" })).toBeDisabled();
  });

  it("시나리오 모달은 Escape, 순환 포커스와 닫힌 뒤 포커스 복원을 지원한다", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    const onClose = vi.fn();
    const { unmount } = render(
      <PlannerScenarioModal
        sourceKind="sample"
        baseCurve={view.curve!}
        options={view.scenarioOptions!}
        comparison={null}
        selectedOptionId={null}
        isPending={false}
        returnFocus={trigger}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        onClose={onClose}
        onApply={vi.fn()}
      />,
    );

    const close = screen.getAllByRole("button", { name: "상황 비교 닫기" })[1]!;
    const last = screen.getByRole("button", { name: /사용할 예산이 줄면/ });
    expect(close).toHaveFocus();
    last.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(last).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("기존 계획 유지와 저장 가능한 변경안 요청을 모달 안에서 처리한다", () => {
    const onClear = vi.fn();
    const onClose = vi.fn();
    const onSelect = vi.fn();
    const first = render(
      <PlannerScenarioModal
        sourceKind="sample"
        baseCurve={view.curve!}
        options={view.scenarioOptions!}
        comparison={comparison}
        selectedOptionId="rapidRise"
        isPending={false}
        returnFocus={null}
        onSelect={onSelect}
        onClear={onClear}
        onClose={onClose}
        onApply={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "기존 계획 유지" }));
    expect(onClear).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    first.unmount();

    const missedRound = view.scenarioOptions!.find(
      (option) => option.id === "missedRound",
    )!;
    render(
      <PlannerScenarioModal
        sourceKind="sample"
        baseCurve={view.curve!}
        options={view.scenarioOptions!}
        comparison={{
          ...comparison,
          id: "missedRound",
          draftPlanId: null,
          canRequestDraft: true,
        }}
        selectedOptionId="missedRound"
        isPending={false}
        returnFocus={null}
        onSelect={onSelect}
        onClear={vi.fn()}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "적용 가능한 변경안 비교" }),
    );
    expect(onSelect).toHaveBeenLastCalledWith(missedRound);
  });

  it("Curve 수치가 바뀌지 않는 비교는 변경 없음과 서버 경고를 표시한다", () => {
    render(
      <PlannerScenarioModal
        sourceKind="demo"
        baseCurve={{ ...view.curve!, xStartLabel: null, xEndLabel: null }}
        options={view.scenarioOptions!}
        comparison={{
          ...comparison,
          baseCurve: null,
          draftPlanId: null,
          alternativeCurve: null,
          rows: [{ label: "목표일", before: "2026-12-31", after: "2026-12-31" }],
          warnings: ["조건 범위를 다시 확인해 주세요."],
        }}
        selectedOptionId="rapidRise"
        isPending={false}
        returnFocus={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText("변경 없음")).toBeInTheDocument();
    expect(screen.getByText("서버가 제공한 회차 날짜 범위")).toBeInTheDocument();
    expect(screen.getByText("조건 범위를 다시 확인해 주세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "데모에 적용" })).toBeDisabled();
    expect(document.querySelector('[data-curve-role="alternative"]')).not.toBeInTheDocument();
  });

});
