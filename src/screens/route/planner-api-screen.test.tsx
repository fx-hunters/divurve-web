import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState, type ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import type {
  PlannerPlanResponse,
  PlannerScenarioPreviewResponse,
} from "../../api/planner-contract";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import type { ExplanationRequester } from "../../hooks/use-ai-explanation";
import type { PlannerApiDependencies } from "./use-planner-api";
import type { PlanVersionDependencies } from "./use-plan-versions";
import { PlannerApiScreen } from "./planner-api-screen";
import type { JourneyStage } from "./use-planner-journey-flow";

/**
 * 주소가 하는 일을 대신하는 테스트용 껍데기.
 *
 * 실제로는 단계와 목표를 URL이 들고 있다. 여기서는 상태 하나로 흉내 내서, 화면이
 * 이동을 요청하면 그대로 따라가게 한다.
 */
function RoutedPlannerApiScreen(
  props: Omit<ComponentProps<typeof PlannerApiScreen>, "goalId" | "navigation">,
) {
  const [target, setTarget] = useState<{
    readonly goalId: string | null;
    readonly stage: JourneyStage;
  }>({ goalId: null, stage: "goal" });
  return (
    <PlannerApiScreen
      {...props}
      goalId={target.goalId}
      navigation={{
        stage: target.stage,
        onOpenGoalSelect: () => setTarget({ goalId: null, stage: "goal" }),
        onOpenGoalStage: (goalId, stage) => setTarget({ goalId, stage }),
      }}
    />
  );
}

const activePlan = PLANNER_API_FIXTURE.items[0]!.activePlan!;
const previewPlan: PlannerPlanResponse = {
  ...activePlan,
  planId: null,
  goalId: "goal-jpy",
  version: null,
  summary: { ...activePlan.summary, status: "draft" },
};
const createdPlan: PlannerPlanResponse = {
  ...previewPlan,
  planId: "plan-jpy",
  version: 1,
  summary: { ...previewPlan.summary, status: "active" },
};
const completeResult = {
  seq: 2,
  status: "completed",
  executedAmount: 145,
  executedRate: 1_400,
  executedDate: "2026-09-08",
  remainingAmount: 1_595,
  nextActionSeq: null,
  alreadyApplied: false,
};
const skipResult = {
  seq: 2,
  applied: false as const,
  amountBefore: 145,
  amountAfter: 160,
  remainingAmount: 1_595,
  remainingRounds: 2,
  perRoundCostKrw: 224_000,
  exceedsBudget: false,
  adjustmentOptions: [],
};
const scenarioResult: PlannerScenarioPreviewResponse = {
  basePlanId: "plan-usd",
  baseVersion: 2,
  draftPlanId: "draft-usd",
  draftVersion: 3,
  changeReasonCode: "RATE_UP",
  priorityConstraint: "budget",
  before: {
    remainingAmount: 1_740,
    targetDate: "2026-12-31",
    totalRounds: 2,
    openRounds: 1,
    perRoundAmount: 145,
    roundBudgetKrw: 203_000,
    costRange: null,
  },
  after: {
    remainingAmount: 1_740,
    targetDate: "2026-12-31",
    totalRounds: 3,
    openRounds: 2,
    perRoundAmount: 80,
    roundBudgetKrw: 203_000,
    costRange: null,
  },
  changedSteps: [
    {
      seq: 2,
      changeType: "amount_changed",
      dateBefore: "2026-09-12",
      dateAfter: "2026-09-12",
      amountBefore: 145,
      amountAfter: 80,
    },
  ],
  keptConstraints: ["target_date"],
  brokenConstraints: [],
  budgetState: "within_budget",
  adjustmentOptions: [],
  warnings: ["조건을 다시 확인해 주세요."],
};

function dependencies(
  overrides: Partial<PlannerApiDependencies> = {},
): PlannerApiDependencies {
  return {
    load: vi.fn().mockResolvedValue(PLANNER_API_FIXTURE),
    complete: vi.fn().mockResolvedValue(completeResult),
    skip: vi.fn().mockResolvedValue(skipResult),
    preview: vi.fn().mockResolvedValue(previewPlan),
    create: vi.fn().mockResolvedValue(createdPlan),
    createGoal: vi.fn().mockResolvedValue(PLANNER_API_FIXTURE.items[0]!.goal),
    updateGoal: vi.fn().mockResolvedValue(PLANNER_API_FIXTURE.items[0]!.goal),
    deleteGoal: vi.fn().mockResolvedValue(undefined),
    previewDraft: vi.fn().mockResolvedValue(previewPlan),
    previewScenario: vi.fn().mockResolvedValue(scenarioResult),
    apply: vi.fn().mockResolvedValue(activePlan),
    createExecutionKey: vi.fn(() => "screen-key"),
    getToday: vi.fn(() => "2026-09-08"),
    ...overrides,
  };
}

async function openAction(deps = dependencies()) {
  render(<RoutedPlannerApiScreen dependencies={deps} />);
  await screen.findByRole("region", { name: "API 플래너" });
  fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
  return deps;
}

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("PlannerApiScreen", () => {
  it("목표를 저장하기 전에 조건으로 계획을 계산해 보여준다", async () => {
    const deps = dependencies({
      load: vi.fn().mockResolvedValue({ items: [] }),
    });
    render(<RoutedPlannerApiScreen dependencies={deps} />);

    await screen.findByText("첫 외화 목표를 만들어 보세요");
    fireEvent.click(screen.getByRole("button", { name: "새 목표 만들기" }));
    fireEvent.change(screen.getByLabelText("목표 이름 또는 목적"), {
      target: { value: "미국 학비" },
    });
    fireEvent.change(screen.getByLabelText("목표 외화 금액"), {
      target: { value: "60000" },
    });
    fireEvent.change(screen.getByLabelText("목표 날짜"), {
      target: { value: "2027-09-08" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장 전에 계획 보기" }));

    expect(
      await screen.findByRole("region", { name: "저장 전 계획 미리보기" }),
    ).toBeInTheDocument();
    expect(deps.previewDraft).toHaveBeenCalledWith(
      expect.objectContaining({ goalType: "deadline", targetAmount: 60_000 }),
    );
    // 목표도 계획도 저장하지 않는다.
    expect(deps.createGoal).not.toHaveBeenCalled();
  });

  it("목표 조건을 고치면 바뀐 항목만 서버로 보낸다", async () => {
    const deps = await openAction();

    fireEvent.click(screen.getByRole("button", { name: "목표 조건 수정" }));
    fireEvent.change(await screen.findByLabelText("목표 외화 금액"), {
      target: { value: "9000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "바뀐 조건 저장" }));

    await waitFor(() =>
      expect(deps.updateGoal).toHaveBeenCalledWith("goal-usd", {
        targetAmount: 9_000,
      }),
    );
  });

  it("목표를 지우면 목표 선택으로 나간다", async () => {
    const deps = await openAction();

    fireEvent.click(screen.getByRole("button", { name: "목표 조건 수정" }));
    fireEvent.click(await screen.findByRole("button", { name: "이 목표 지우기" }));
    fireEvent.click(screen.getByRole("button", { name: "목표 지우기" }));

    await waitFor(() => expect(deps.deleteGoal).toHaveBeenCalledWith("goal-usd"));
    expect(
      await screen.findByRole("heading", { name: "어떤 외화 목표를 이어갈까요?" }),
    ).toBeInTheDocument();
  });

  it("서버 컨텍스트를 받으면 계획과 같은 환율 전제를 상단에 적는다", async () => {
    const loadContext = vi.fn().mockResolvedValue({
      asOf: "2026-09-09T00:00:00Z",
      diagnosis: { status: "done", grade: "B", score: 72, concentrationThreshold: 0.4 },
      portfolio: { totalAssetKrw: null, fxAssetKrw: null, fxRatio: 0.25, exposure: {} },
      forecast: {
        pairCode: "USD/KRW",
        baseRate: 1_380.5,
        interval80: { lo: 1_340.2, hi: 1_420.8 },
        vol30d: null,
        baseDate: "2026-09-08",
      },
      stress: null,
      regime: "normal",
    });
    render(
      <RoutedPlannerApiScreen
        dependencies={dependencies()}
        loadContext={loadContext}
      />,
    );

    expect(
      await screen.findByRole("region", { name: "계획 배경 정보" }),
    ).toBeInTheDocument();
    expect(screen.getByText("USD/KRW 기준 환율")).toBeInTheDocument();
    expect(loadContext).toHaveBeenCalledOnce();
  });

  it("컨텍스트를 받지 못해도 플래너는 그대로 쓸 수 있다", async () => {
    const loadContext = vi.fn().mockRejectedValue(new ApiError("없음", 404, "NOT_FOUND"));
    render(
      <RoutedPlannerApiScreen
        dependencies={dependencies()}
        loadContext={loadContext}
      />,
    );

    await screen.findByRole("region", { name: "API 플래너" });
    await waitFor(() => expect(loadContext).toHaveBeenCalledOnce());
    expect(
      screen.queryByRole("region", { name: "계획 배경 정보" }),
    ).not.toBeInTheDocument();
  });

  it("로딩, 오류 재시도, 빈 목표를 각각 표시한다", async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("조회 오류", 500, "SERVER"))
      .mockResolvedValueOnce(PLANNER_API_FIXTURE);
    const first = render(
      <RoutedPlannerApiScreen dependencies={dependencies({ load })} />,
    );
    // 로딩 중에도 머리말과 단계 안내는 그대로 선다.
    expect(
      screen.getByRole("heading", { name: "내 외화 플래너" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/플래너를 불러오는 중입니다/)).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("조회 오류");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("region", { name: "API 플래너" })).toBeInTheDocument();
    first.unmount();

    render(
      <RoutedPlannerApiScreen
        dependencies={dependencies({ load: vi.fn().mockResolvedValue({ items: [] }) })}
      />,
    );
    expect(await screen.findByText("첫 외화 목표를 만들어 보세요")).toBeInTheDocument();
  });

  it("빈 상태에서 목표를 만들고 서버 재조회 결과로 선택한다", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValue(PLANNER_API_FIXTURE);
    const deps = dependencies({ load });
    render(<RoutedPlannerApiScreen dependencies={deps} />);

    await screen.findByText("첫 외화 목표를 만들어 보세요");
    fireEvent.click(screen.getByRole("button", { name: "새 목표 만들기" }));
    fireEvent.change(screen.getByLabelText("목표 이름 또는 목적"), {
      target: { value: "미국 학비" },
    });
    fireEvent.change(screen.getByLabelText("목표 외화 금액"), {
      target: { value: "60000" },
    });
    fireEvent.change(screen.getByLabelText("목표 날짜"), {
      target: { value: "2027-09-08" },
    });
    fireEvent.click(screen.getByRole("button", { name: "새 목표 만들기" }));

    await waitFor(() => expect(deps.createGoal).toHaveBeenCalledOnce());
    expect(deps.createGoal).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "deadline",
        purpose: "TRAVEL",
        currencyCode: "USD",
        targetAmount: 60000,
        budgetCurrencyCode: "KRW",
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "미국 ETF 준비" }),
    ).toBeInTheDocument();
  });

  it("목표 생성 실패는 입력 화면을 유지하고 서버 오류를 표시한다", async () => {
    const createGoal = vi
      .fn()
      .mockRejectedValue(new ApiError("목표 생성 실패", 503, "SERVER"));
    render(
      <RoutedPlannerApiScreen
        dependencies={dependencies({
          load: vi.fn().mockResolvedValue({ items: [] }),
          createGoal,
        })}
      />,
    );

    await screen.findByText("첫 외화 목표를 만들어 보세요");
    fireEvent.click(screen.getByRole("button", { name: "새 목표 만들기" }));
    fireEvent.change(screen.getByLabelText("목표 이름 또는 목적"), {
      target: { value: "유학 준비" },
    });
    fireEvent.change(screen.getByLabelText("목표 외화 금액"), {
      target: { value: "60000" },
    });
    fireEvent.change(screen.getByLabelText("목표 날짜"), {
      target: { value: "2027-09-08" },
    });
    fireEvent.click(screen.getByRole("button", { name: "새 목표 만들기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("목표 생성 실패");
    expect(screen.getByLabelText("목표 이름 또는 목적")).toHaveValue("유학 준비");
    expect(createGoal).toHaveBeenCalledOnce();
  });

  it("활성 계획이 없으면 미리보기와 명시적 생성을 분리한다", async () => {
    const withJpyPlan = {
      ...PLANNER_API_FIXTURE,
      items: PLANNER_API_FIXTURE.items.map((item) =>
        item.goal.id === "goal-jpy" ? { ...item, activePlan: createdPlan } : item,
      ),
    };
    const load = vi
      .fn()
      .mockResolvedValueOnce(PLANNER_API_FIXTURE)
      .mockResolvedValue(withJpyPlan);
    const deps = dependencies({ load });
    render(<RoutedPlannerApiScreen dependencies={deps} />);
    await screen.findByRole("region", { name: "API 플래너" });
    fireEvent.click(screen.getByRole("button", { name: /일본 여행 준비/ }));
    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "계획 미리보기" }));

    expect(await screen.findByRole("heading", { name: "이 계획을 만들기 전에 확인해 주세요" })).toBeInTheDocument();
    expect(deps.preview).toHaveBeenCalledOnce();
    expect(deps.create).not.toHaveBeenCalled();
    expect(screen.getByText(/아직 활성 계획으로 저장되지 않았습니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "현재 상태로" }));
    expect(
      screen.getByRole("heading", { name: "일본 여행 준비" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "계획 미리보기" }));
    expect(
      await screen.findByRole("heading", {
        name: "이 계획을 만들기 전에 확인해 주세요",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "계획 Curve" })).not.toBeInTheDocument();
    expect(deps.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "이 계획 만들기" }));
    expect(await screen.findByRole("region", { name: "계획 Curve" })).toBeInTheDocument();
    expect(deps.create).toHaveBeenCalledOnce();
    expect(deps.preview).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });

  it("현재 상태, Curve와 다음 행동을 함께 표시하고 상세 경로를 요청한다", async () => {
    const onOpenPlanDetail = vi.fn();
    render(
      <RoutedPlannerApiScreen
        dependencies={dependencies()}
        onOpenPlanDetail={onOpenPlanDetail}
      />,
    );
    await screen.findByRole("region", { name: "API 플래너" });
    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    expect(screen.getByRole("region", { name: "계획 Curve" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2회차를 확인할까요?" })).toBeInTheDocument();
    const detail = screen.getByRole("button", { name: "전체 계획 상세 보기" });
    fireEvent.click(detail);
    expect(onOpenPlanDetail).toHaveBeenCalledWith("goal-usd", "plan-usd");
  });

  it("완료 입력을 검증하고 안정적인 execution key로 한 번만 제출한다", async () => {
    let resolveComplete!: (value: typeof completeResult) => void;
    const pending = new Promise<typeof completeResult>((resolve) => {
      resolveComplete = resolve;
    });
    const complete = vi.fn().mockReturnValue(pending);
    const deps = await openAction(dependencies({ complete }));
    fireEvent.click(screen.getByRole("button", { name: "이번 회차 기록" }));
    expect(screen.getByRole("alert")).toHaveTextContent("실행 외화 금액");
    fireEvent.change(screen.getByLabelText("실행 외화 금액"), {
      target: { value: "150" },
    });
    fireEvent.change(screen.getByLabelText("실행 환율"), {
      target: { value: "1395" },
    });
    const submit = screen.getByRole("button", { name: "이번 회차 기록" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "서버에 반영 중…" })).toBeDisabled();
    resolveComplete(completeResult);
    expect(
      await screen.findByText("2회차 기록 후 최신 계획을 확인했습니다."),
    ).toBeInTheDocument();
    expect(deps.complete).toHaveBeenCalledWith("plan-usd", 2, {
      executedAmount: 150,
      executedRate: 1395,
      executedDate: "2026-09-08",
      executionKey: "screen-key",
    });
  });

  it("건너뛰기는 저장 완료가 아닌 미리보기로 안내한다", async () => {
    const deps = await openAction();
    fireEvent.click(screen.getByRole("button", { name: "이번 회차를 놓쳤다면" }));
    expect(await screen.findByRole("dialog", { name: "어떤 변화가 생겼나요?" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("아직 계획에 반영되지 않았습니다");
    expect(screen.queryByText(/저장되었습니다|반영되었습니다/)).not.toBeInTheDocument();
    expect(screen.getByText("변경 160 USD")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "적용 가능한 변경안 비교" }),
    );
    await waitFor(() =>
      expect(deps.previewScenario).toHaveBeenCalledWith("plan-usd", {
        scenarioCode: "STEP_SKIPPED",
        skippedSeq: 2,
      }),
    );
    expect(await screen.findByText("변경 2회")).toBeInTheDocument();
    expect(deps.skip).toHaveBeenCalledWith("plan-usd", 2);
    expect(deps.load).toHaveBeenCalledTimes(1);
  });

  it("scenario preview 후 최종 확인 전에는 apply를 호출하지 않는다", async () => {
    const deps = await openAction();
    fireEvent.click(screen.getByRole("button", { name: "상황이 바뀐다면?" }));
    fireEvent.click(screen.getByRole("button", { name: /환율이 빠르게 상승하면/ }));
    expect(await screen.findByText("변경 2회")).toBeInTheDocument();
    expect(deps.previewScenario).toHaveBeenCalledWith("plan-usd", {
      scenarioCode: "RATE_UP",
    });
    expect(deps.apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "변경안 적용" }));
    expect(await screen.findByText(/최신 활성 계획을 확인했습니다/)).toBeInTheDocument();
    expect(deps.apply).toHaveBeenCalledWith("draft-usd");
    fireEvent.click(screen.getByRole("button", { name: "다른 목표 선택" }));
    expect(
      screen.getByRole("heading", { name: "어떤 외화 목표를 이어갈까요?" }),
    ).toBeInTheDocument();
  });

  it("draft 식별자가 없는 비교 응답은 최종 확인에서도 apply하지 않는다", async () => {
    const deps = await openAction(
      dependencies({
        previewScenario: vi
          .fn()
          .mockResolvedValue({ ...scenarioResult, draftPlanId: null }),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "상황이 바뀐다면?" }));
    fireEvent.click(
      screen.getByRole("button", { name: /환율이 빠르게 상승하면/ }),
    );
    expect(await screen.findByText("변경 2회")).toBeInTheDocument();
    const apply = screen.getByRole("button", { name: "변경안 적용" });
    expect(apply).toBeDisabled();

    expect(deps.apply).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "어떤 변화가 생겼나요?" }),
    ).toBeInTheDocument();
  });

  it("현재 계획 선택은 요청을 지우고 회차 누락 비교에는 다음 sequence를 보낸다", async () => {
    const deps = await openAction();
    fireEvent.click(screen.getByRole("button", { name: "상황이 바뀐다면?" }));
    fireEvent.click(screen.getByRole("button", { name: /현재 계획 유지/ }));
    expect(deps.previewScenario).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /이번 회차를 놓치면/ }));
    await waitFor(() =>
      expect(deps.previewScenario).toHaveBeenCalledWith("plan-usd", {
        scenarioCode: "STEP_SKIPPED",
        skippedSeq: 2,
      }),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "상황 비교 닫기" })[1]!);
    expect(
      screen.getByRole("heading", { name: "2회차를 확인할까요?" }),
    ).toBeInTheDocument();
  });

  it("예산 감소는 유효한 예산을 받은 뒤에만 preview한다", async () => {
    const deps = await openAction();
    fireEvent.click(screen.getByRole("button", { name: "상황이 바뀐다면?" }));
    fireEvent.click(screen.getByRole("button", { name: /사용할 예산이 줄면/ }));
    fireEvent.click(screen.getByRole("button", { name: "새 예산으로 비교" }));
    expect(screen.getByRole("alert")).toHaveTextContent("0보다 큰 금액");
    expect(deps.previewScenario).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("새 회차 예산(원)"), {
      target: { value: "180000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "새 예산으로 비교" }));
    await waitFor(() =>
      expect(deps.previewScenario).toHaveBeenCalledWith("plan-usd", {
        scenarioCode: "BUDGET_DECREASED",
        newBudgetKrw: 180000,
      }),
    );
  });

  it("완료된 계획은 남은 회차 없음과 상세 진입을 제공한다", async () => {
    const completed = {
      items: [
        {
          ...PLANNER_API_FIXTURE.items[0]!,
          activePlan: {
            ...activePlan,
            summary: { ...activePlan.summary, nextActionSeq: null },
            steps: activePlan.steps.map((step) => ({
              ...step,
              status: "completed",
              nextAction: false,
            })),
          },
        },
      ],
    };
    render(
      <RoutedPlannerApiScreen
        dependencies={dependencies({ load: vi.fn().mockResolvedValue(completed) })}
      />,
    );
    await screen.findByRole("region", { name: "API 플래너" });
    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    expect(screen.getByRole("heading", { name: "남은 회차가 없습니다" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "전체 계획 상세 보기" }));
  });

  it("API 작업 실패를 fixture로 대체하지 않고 복구 메시지를 남긴다", async () => {
    const deps = await openAction(
      dependencies({
        previewScenario: vi.fn().mockRejectedValue(new ApiError("비교 실패", 503)),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "상황이 바뀐다면?" }));
    fireEvent.click(screen.getByRole("button", { name: /환율이 빠르게 상승하면/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("비교 실패");
    expect(screen.queryByText("미국 ETF 정기 투자")).not.toBeInTheDocument();
    expect(deps.previewScenario).toHaveBeenCalledOnce();
  });

  it("공통 Journey 안에서 계획 버전 목록과 최신 상세를 표시한다", async () => {
    const planVersionDependencies: PlanVersionDependencies = {
      loadVersions: vi.fn().mockResolvedValue([
        { planId: "plan-usd", version: 2, status: "active", reason: "재계산" },
        { planId: "plan-usd-1", version: 1, status: "superseded" },
      ]),
      loadDetail: vi.fn().mockResolvedValue(activePlan),
    };
    const explanationRequester: ExplanationRequester = vi.fn().mockResolvedValue({
      data: {
        explanation: {
          sentences: ["서버가 정리한 계획 설명입니다."],
          sentenceCount: 1,
          explainLevel: null,
          explainDomain: null,
          fallback: false,
        },
        verification: {
          numericMatch: true,
          regimeDisclosed: true,
          blockedPhrases: [],
          fallbackReason: null,
        },
      },
      meta: { asOf: "2026-09-08T00:00:00Z" },
    });
    render(
      <RoutedPlannerApiScreen
        dependencies={dependencies()}
        planVersionDependencies={planVersionDependencies}
        explanationRequester={explanationRequester}
      />,
    );
    await screen.findByRole("region", { name: "API 플래너" });
    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "계획 이력 보기" }));

    expect(screen.getByText("계획 이력을 불러오고 있습니다.")).toBeInTheDocument();
    const activeVersion = await screen.findByRole("button", { name: /v2/ });
    expect(planVersionDependencies.loadVersions).toHaveBeenCalledWith("goal-usd");
    expect(
      await screen.findByText("서버가 정리한 계획 설명입니다."),
    ).toBeInTheDocument();
    expect(explanationRequester).toHaveBeenCalledWith({
      surface: "planner_plan_summary",
      facts: expect.objectContaining({
        plan_version: 2,
        plan_status: "active",
        next_action_seq: 2,
        currency_code: "USD",
      }),
    });
    fireEvent.click(activeVersion);
    expect(await screen.findByText("전체 회차")).toBeInTheDocument();
    expect(planVersionDependencies.loadDetail).toHaveBeenCalledWith("plan-usd");
    fireEvent.click(screen.getByRole("button", { name: "현재 계획으로 돌아가기" }));
    expect(screen.getByRole("heading", { name: "미국 ETF 준비" })).toBeInTheDocument();
  });

  it("활성 계획이 없는 목표에서도 빈 계획 이력을 확인한다", async () => {
    const planVersionDependencies: PlanVersionDependencies = {
      loadVersions: vi.fn().mockResolvedValue([]),
      loadDetail: vi.fn(),
    };
    render(
      <RoutedPlannerApiScreen
        dependencies={dependencies()}
        planVersionDependencies={planVersionDependencies}
      />,
    );
    await screen.findByRole("region", { name: "API 플래너" });
    fireEvent.click(screen.getByRole("button", { name: /일본 여행 준비/ }));
    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "계획 이력 보기" }));

    expect(
      await screen.findByText(/저장된 계획 버전이 없습니다/),
    ).toBeInTheDocument();
    expect(planVersionDependencies.loadDetail).not.toHaveBeenCalled();
  });
});
