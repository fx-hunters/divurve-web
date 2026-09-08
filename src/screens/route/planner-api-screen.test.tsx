import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import type {
  PlannerPlanResponse,
  PlannerScenarioPreviewResponse,
} from "../../api/planner-contract";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import type { PlannerApiDependencies } from "./use-planner-api";
import type { PlanVersionDependencies } from "./use-plan-versions";
import { PlannerApiScreen } from "./planner-api-screen";

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
    previewScenario: vi.fn().mockResolvedValue(scenarioResult),
    apply: vi.fn().mockResolvedValue(activePlan),
    createExecutionKey: vi.fn(() => "screen-key"),
    getToday: vi.fn(() => "2026-09-08"),
    ...overrides,
  };
}

async function openAction(deps = dependencies()) {
  render(<PlannerApiScreen dependencies={deps} />);
  await screen.findByRole("region", { name: "API 플래너" });
  fireEvent.click(screen.getByRole("button", { name: "현재 상태 보기" }));
  fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" }));
  fireEvent.click(screen.getByRole("button", { name: "다음 행동 보기" }));
  return deps;
}

describe("PlannerApiScreen", () => {
  it("로딩, 오류 재시도, 빈 목표를 각각 표시한다", async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("조회 오류", 500, "SERVER"))
      .mockResolvedValueOnce(PLANNER_API_FIXTURE);
    const first = render(<PlannerApiScreen dependencies={dependencies({ load })} />);
    expect(screen.getByText("플래너를 불러오는 중입니다")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("조회 오류");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("region", { name: "API 플래너" })).toBeInTheDocument();
    first.unmount();

    render(
      <PlannerApiScreen
        dependencies={dependencies({ load: vi.fn().mockResolvedValue({ items: [] }) })}
      />,
    );
    expect(await screen.findByText("등록된 외화 목표가 없습니다")).toBeInTheDocument();
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
    render(<PlannerApiScreen dependencies={deps} />);
    await screen.findByRole("region", { name: "API 플래너" });
    fireEvent.click(screen.getByRole("button", { name: /일본 여행 준비/ }));
    fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" }));

    expect(await screen.findByRole("heading", { name: "이 계획을 만들기 전에 확인해 주세요" })).toBeInTheDocument();
    expect(deps.preview).toHaveBeenCalledOnce();
    expect(deps.create).not.toHaveBeenCalled();
    expect(screen.getByText(/아직 활성 계획으로 저장되지 않았습니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "현재 상태로" }));
    expect(
      screen.getByRole("heading", { name: "일본 여행 준비의 현재 위치입니다" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" }));
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

  it("Curve, 다음 행동과 상세 drawer를 단계별로 표시한다", async () => {
    await openAction();
    expect(screen.getByRole("heading", { name: "2회차를 확인할까요?" })).toBeInTheDocument();
    const detail = screen.getByRole("button", { name: "전체 계획 상세 보기" });
    fireEvent.click(detail);
    expect(screen.getByRole("dialog")).toHaveTextContent("활성 계획 v2");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(detail).toHaveFocus();
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
    expect(await screen.findByText("이번 회차 기록을 마쳤습니다")).toBeInTheDocument();
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
    expect(await screen.findByRole("heading", { name: "상황이 달라지면 경로를 비교해 보세요" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("아직 계획에는 적용되지 않았습니다");
    expect(screen.queryByText(/저장되었습니다|반영되었습니다/)).not.toBeInTheDocument();
    expect(deps.skip).toHaveBeenCalledWith("plan-usd", 2);
    expect(deps.load).toHaveBeenCalledTimes(1);
  });

  it("scenario preview 후 최종 확인 전에는 apply를 호출하지 않는다", async () => {
    const deps = await openAction();
    fireEvent.click(screen.getByRole("button", { name: "상황이 바뀐다면?" }));
    fireEvent.click(screen.getByRole("button", { name: /환율이 빠르게 상승하면/ }));
    expect(await screen.findByText("변경 후 2회")).toBeInTheDocument();
    expect(deps.previewScenario).toHaveBeenCalledWith("plan-usd", {
      scenarioCode: "RATE_UP",
    });
    expect(deps.apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "변경 내용 확인" }));
    expect(deps.apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "이 계획 적용" }));
    expect(await screen.findByText("대체 계획을 적용했습니다")).toBeInTheDocument();
    expect(deps.apply).toHaveBeenCalledWith("draft-usd");
    fireEvent.click(screen.getByRole("button", { name: "다른 목표 보기" }));
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
    expect(await screen.findByText("변경 후 2회")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "변경 내용 확인" }));
    fireEvent.click(screen.getByRole("button", { name: "이 계획 적용" }));

    expect(deps.apply).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "이 변경 계획을 적용할까요?" }),
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
    fireEvent.click(screen.getByRole("button", { name: "다음 행동으로 돌아가기" }));
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
      <PlannerApiScreen
        dependencies={dependencies({ load: vi.fn().mockResolvedValue(completed) })}
      />,
    );
    await screen.findByRole("region", { name: "API 플래너" });
    fireEvent.click(screen.getByRole("button", { name: "현재 상태 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 행동 보기" }));
    expect(screen.getByRole("heading", { name: "남은 회차가 없습니다" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "전체 계획 상세 보기" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
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
    render(
      <PlannerApiScreen
        dependencies={dependencies()}
        planVersionDependencies={planVersionDependencies}
      />,
    );
    await screen.findByRole("region", { name: "API 플래너" });
    fireEvent.click(screen.getByRole("button", { name: "현재 상태 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "계획 이력 보기" }));

    expect(screen.getByText("계획 이력을 불러오고 있습니다.")).toBeInTheDocument();
    const activeVersion = await screen.findByRole("button", { name: /v2/ });
    expect(planVersionDependencies.loadVersions).toHaveBeenCalledWith("goal-usd");
    fireEvent.click(activeVersion);
    expect(await screen.findByText("전체 회차")).toBeInTheDocument();
    expect(planVersionDependencies.loadDetail).toHaveBeenCalledWith("plan-usd");
    fireEvent.click(screen.getByRole("button", { name: "현재 상태" }));
    expect(screen.getByText("미국 ETF 준비의 현재 위치입니다")).toBeInTheDocument();
  });

  it("활성 계획이 없는 목표에서도 빈 계획 이력을 확인한다", async () => {
    const planVersionDependencies: PlanVersionDependencies = {
      loadVersions: vi.fn().mockResolvedValue([]),
      loadDetail: vi.fn(),
    };
    render(
      <PlannerApiScreen
        dependencies={dependencies()}
        planVersionDependencies={planVersionDependencies}
      />,
    );
    await screen.findByRole("region", { name: "API 플래너" });
    fireEvent.click(screen.getByRole("button", { name: /일본 여행 준비/ }));
    fireEvent.click(screen.getByRole("button", { name: "계획 이력 보기" }));

    expect(
      await screen.findByText(/저장된 계획 버전이 없습니다/),
    ).toBeInTheDocument();
    expect(planVersionDependencies.loadDetail).not.toHaveBeenCalled();
  });
});
