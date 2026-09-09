import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlannerApiOverview, PlanVersion } from "../../api/planner";
import type { PlannerPlanResponse } from "../../api/planner-contract";
import { loadRoutePlan } from "../../api/route";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import { presentPlannerOverview } from "./planner-api-presenter";
import type { PlannerViewModel } from "./planner-api-types";
import {
  PlannerApiPlanDetailScreen,
  PlannerDemoPlanDetailScreen,
  PlannerPlanDetailPage,
  type PlannerPlanDetailDependencies,
} from "./planner-plan-detail-screen";

const activePlan = PLANNER_API_FIXTURE.items[0]!.activePlan!;
const activeView = presentPlannerOverview(PLANNER_API_FIXTURE, "goal-usd");

function dependencies(
  overrides: Partial<PlannerPlanDetailDependencies> = {},
): PlannerPlanDetailDependencies {
  return {
    loadOverview: vi.fn().mockResolvedValue(PLANNER_API_FIXTURE),
    loadPlan: vi.fn().mockResolvedValue(activePlan),
    loadVersions: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("PlannerPlanDetailPage", () => {
  it("목표 요약, 회차별 누적액, 데이터 기준과 계획 버전을 표시한다", () => {
    const onBack = vi.fn();
    const versions: readonly PlanVersion[] = [
      {
        planId: "plan-usd",
        version: 2,
        status: "active",
        reason: "일정 조건 변경",
        createdAt: "2026-09-08T10:00:00Z",
      },
      {
        planId: "plan-usd-v1",
        version: 1,
        status: "superseded",
        planEndDate: "2026-12-20",
      },
      {
        planId: "plan-usd-legacy",
        version: 0,
        status: "superseded",
      },
    ];

    render(
      <PlannerPlanDetailPage
        view={{
          ...activeView,
          plan: {
            ...activeView.plan!,
            warnings: ["서버가 제공한 주의사항"],
          },
        }}
        versions={versions}
        onBack={onBack}
      />,
    );

    expect(screen.getByRole("heading", { name: "미국 ETF 준비" })).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveTextContent("1,550 USD");
    expect(screen.getByText("v2 · active")).toBeInTheDocument();
    expect(screen.getByText("일정 조건 변경")).toBeInTheDocument();
    expect(screen.getAllByText("변경 사유 제공되지 않음")).toHaveLength(2);
    expect(screen.getByText("2026-12-26")).toBeInTheDocument();
    expect(screen.getByText("2026-12-20")).toBeInTheDocument();
    expect(screen.getByText("날짜 제공되지 않음")).toBeInTheDocument();
    expect(screen.getByText("서버가 제공한 주의사항")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "플래너로 돌아가기" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("데이터 기준과 버전이 없으면 출처에 맞는 제한을 표시한다", () => {
    const sparseView: PlannerViewModel = {
      ...activeView,
      dataSource: { kind: "demo", label: "데모 데이터" },
      plan: {
        ...activeView.plan!,
        policyVersion: null,
        calculatedAtLabel: null,
        rateAsOfLabel: null,
        estimatedCostLabel: null,
        budgetStateLabel: null,
        warnings: [],
      },
    };
    render(
      <PlannerPlanDetailPage view={sparseView} versions={[]} onBack={vi.fn()} />,
    );
    expect(screen.getAllByText("제공되지 않음")).toHaveLength(5);
    expect(
      screen.getByText("데모에서는 서버 계획 버전 이력을 제공하지 않습니다."),
    ).toBeInTheDocument();
  });

  it("목표 또는 계획이 없으면 상세 내용을 렌더링하지 않는다", () => {
    const first = render(
      <PlannerPlanDetailPage
        view={{ ...activeView, selectedGoal: null }}
        versions={[]}
        onBack={vi.fn()}
      />,
    );
    expect(first.container).toBeEmptyDOMElement();
    first.unmount();
    const second = render(
      <PlannerPlanDetailPage
        view={{ ...activeView, plan: null }}
        versions={[]}
        onBack={vi.fn()}
      />,
    );
    expect(second.container).toBeEmptyDOMElement();
  });
});

describe("PlannerApiPlanDetailScreen", () => {
  it("세 API 결과를 결합해 직접 진입 가능한 상세 화면을 연다", async () => {
    const deps = dependencies();
    render(
      <PlannerApiPlanDetailScreen
        goalId="goal-usd"
        planId="plan-usd"
        dependencies={deps}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("계획 상세를 불러오는 중입니다");
    expect(
      await screen.findByRole("heading", { name: "미국 ETF 준비" }),
    ).toBeInTheDocument();
    expect(deps.loadOverview).toHaveBeenCalledOnce();
    expect(deps.loadPlan).toHaveBeenCalledWith("plan-usd");
    expect(deps.loadVersions).toHaveBeenCalledWith("goal-usd");
    expect(screen.getByText("저장된 계획 버전이 없습니다.")).toBeInTheDocument();
  });

  it.each([
    ["missing goal", { items: [] } as PlannerApiOverview, activePlan, "plan-usd"],
    [
      "different goal",
      PLANNER_API_FIXTURE,
      { ...activePlan, goalId: "goal-jpy" } as PlannerPlanResponse,
      "plan-usd",
    ],
    [
      "different plan",
      PLANNER_API_FIXTURE,
      { ...activePlan, planId: "another-plan" } as PlannerPlanResponse,
      "plan-usd",
    ],
  ])("%s 응답은 요청한 상세로 표시하지 않는다", async (_name, overview, plan, planId) => {
    render(
      <PlannerApiPlanDetailScreen
        goalId="goal-usd"
        planId={planId}
        dependencies={dependencies({
          loadOverview: vi.fn().mockResolvedValue(overview),
          loadPlan: vi.fn().mockResolvedValue(plan),
        })}
        onBack={vi.fn()}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "요청한 목표와 계획 정보를 확인하지 못했습니다.",
    );
  });

  it("조회 실패를 표시하고 같은 경로에서 다시 시도한다", async () => {
    const loadOverview = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(PLANNER_API_FIXTURE);
    render(
      <PlannerApiPlanDetailScreen
        goalId="goal-usd"
        planId="plan-usd"
        dependencies={dependencies({ loadOverview })}
        onBack={vi.fn()}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "계획 상세를 불러오지 못했습니다.",
    );
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(
      await screen.findByRole("heading", { name: "미국 ETF 준비" }),
    ).toBeInTheDocument();
    expect(loadOverview).toHaveBeenCalledTimes(2);
  });

  it("화면을 떠난 뒤 완료된 요청은 상태를 갱신하지 않는다", async () => {
    let resolveOverview!: (value: PlannerApiOverview) => void;
    const loadOverview = vi.fn(
      () =>
        new Promise<PlannerApiOverview>((resolve) => {
          resolveOverview = resolve;
        }),
    );
    const { unmount } = render(
      <PlannerApiPlanDetailScreen
        goalId="goal-usd"
        planId="plan-usd"
        dependencies={dependencies({ loadOverview })}
        onBack={vi.fn()}
      />,
    );
    unmount();
    resolveOverview(PLANNER_API_FIXTURE);
    await waitFor(() => expect(loadOverview).toHaveBeenCalledOnce());
  });
});

describe("PlannerDemoPlanDetailScreen", () => {
  it("데모 목표와 같은 식별자의 계획을 공통 상세 페이지로 표시한다", async () => {
    const data = await loadRoutePlan();
    if (data === null) throw new Error("데모 플래너 데이터가 필요합니다.");
    render(
      <PlannerDemoPlanDetailScreen
        data={data}
        goalId="usd-etf-recurring-demo"
        planId="usd-etf-recurring-demo"
        onBack={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "미국 ETF 정기 투자" }),
    ).toBeInTheDocument();
    expect(screen.getByText("데모 데이터")).toBeInTheDocument();
  });

  it("경로 식별자가 다르면 다른 데모 계획을 대신 표시하지 않는다", async () => {
    const data = await loadRoutePlan();
    if (data === null) throw new Error("데모 플래너 데이터가 필요합니다.");
    const onBack = vi.fn();
    render(
      <PlannerDemoPlanDetailScreen
        data={data}
        goalId="usd-etf-recurring-demo"
        planId="wrong-plan"
        onBack={onBack}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("데모 계획을 찾지 못했습니다");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
