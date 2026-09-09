import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import { loadRoutePlan } from "../../api/route";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import { RouteScreen } from "./route-screen";
import { PlannerDemoScreen } from "./planner-demo-screen";
import type { PlannerPlanDetailDependencies } from "./planner-plan-detail-screen";
import type { PlannerApiDependencies } from "./use-planner-api";
import { writePlannerGoalSelection } from "./planner-ui-selection";

async function enterDemoAction(goalName = "미국 ETF 정기 투자") {
  render(<RouteScreen />);
  fireEvent.click(
    await screen.findByRole("button", { name: new RegExp(goalName) }),
  );
  fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
}

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("RouteScreen", () => {
  it("데모 목표 두 개를 공통 Journey에 표시하고 서버 출처와 구분한다", async () => {
    render(<RouteScreen />);

    expect(
      await screen.findByRole("region", { name: "데모 플래너" }),
    ).toHaveAttribute("data-source", "demo");
    expect(screen.getByText("데모 데이터")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /미국 ETF 정기 투자/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /일본 여행 준비/ }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("planner-journey-screen")).toBeInTheDocument();
  });

  it("목표 선택 뒤 현재 상태, Curve, 다음 행동을 한 화면에 연결한다", async () => {
    render(<RouteScreen />);
    fireEvent.click(
      await screen.findByRole("button", { name: /미국 ETF 정기 투자/ }),
    );

    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    expect(screen.getByRole("heading", { name: "미국 ETF 정기 투자" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "계획 Curve" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "계획 경로" })).toBeInTheDocument();
    expect(screen.getByText("계획 누적액")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이번 회차 데모 기록" })).toBeInTheDocument();
  });

  it("데모 시나리오 다섯 개를 비교하고 최종 확인 뒤에만 로컬 적용한다", async () => {
    await enterDemoAction();
    fireEvent.click(screen.getByRole("button", { name: "상황이 바뀐다면?" }));

    const options = [
      "예상 범위 안",
      "환율이 빠르게 상승하면",
      "환율이 하락하면",
      "이번 회차를 놓치면",
      "사용할 예산이 줄면",
    ];
    for (const name of options) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /환율이 빠르게 상승하면/ }),
      );
    });
    expect(screen.getAllByText(/기존 /).length).toBeGreaterThan(0);
    expect(document.querySelector('[data-curve-role="alternative"]')).not.toBeInTheDocument();
    expect(
      screen.getByText(/외화 누적 경로를 바꿀 날짜·금액이 응답에 없어/),
    ).toBeInTheDocument();
    expect(screen.getByText("최종 버튼을 누르기 전까지 현재 활성 계획은 유지됩니다.")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "데모에 적용" }));
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "서버 데이터는 바뀌지 않았습니다",
    );
    fireEvent.animationEnd(document.querySelector(".planner-main")!);
  });

  it("데모 기록과 건너뛰기는 Planner API를 호출하지 않는다", async () => {
    const apiDependencies: PlannerApiDependencies = {
      load: vi.fn(),
      complete: vi.fn(),
      skip: vi.fn(),
      preview: vi.fn(),
      create: vi.fn(),
      createGoal: vi.fn(),
      previewScenario: vi.fn(),
      apply: vi.fn(),
      createExecutionKey: vi.fn(() => "demo-must-not-call"),
      getToday: vi.fn(() => "2026-09-08"),
    };
    render(<RouteScreen apiDependencies={apiDependencies} />);
    fireEvent.click(
      await screen.findByRole("button", { name: /미국 ETF 정기 투자/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "이번 회차 데모 기록" }));
    expect(await screen.findByRole("status")).toHaveTextContent("데모 화면에서만 기록했습니다");
    fireEvent.click(screen.getByRole("button", { name: "상황이 바뀐다면?" }));
    fireEvent.click(screen.getByRole("button", { name: /이번 회차를 놓치면/ }));

    expect(apiDependencies.load).not.toHaveBeenCalled();
    expect(apiDependencies.complete).not.toHaveBeenCalled();
    expect(apiDependencies.skip).not.toHaveBeenCalled();
    expect(apiDependencies.previewScenario).not.toHaveBeenCalled();
  });

  it("데모 건너뛰기는 로컬 비교만 열고 현재 계획 선택으로 해제한다", async () => {
    await enterDemoAction();
    fireEvent.click(
      screen.getByRole("button", { name: "이번 회차를 놓쳤다면" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "어떤 변화가 생겼나요?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "현재 데모 계획에는 아직 적용되지 않았습니다",
    );
    fireEvent.click(screen.getByRole("button", { name: /예상 범위 안/ }));
    expect(
      document.querySelector(".planner-api-scenario__comparison"),
    ).not.toBeInTheDocument();
  });

  it("마감형 목표도 같은 장면 구조와 fixture 표시값을 사용한다", async () => {
    await enterDemoAction("일본 여행 준비");
    expect(screen.getByRole("heading", { name: "1회차 준비 내용 확인" }).parentElement).toHaveTextContent("35,000 JPY");
    expect(screen.getByRole("region", { name: "계획 Curve" })).toBeInTheDocument();
  });

  it("같은 세션에서 선택한 데모 목표를 다시 열 때 복원한다", async () => {
    writePlannerGoalSelection("jpy-travel-deadline-demo");
    render(<RouteScreen />);

    const selected = await screen.findByRole("button", { name: /일본 여행 준비/ });
    expect(selected).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    expect(screen.getByRole("heading", { name: "일본 여행 준비" })).toBeInTheDocument();
  });

  it("새 데모 목표는 서버 저장 없이 현재 화면에만 추가한다", async () => {
    render(<RouteScreen />);
    await screen.findByRole("region", { name: "데모 플래너" });
    fireEvent.click(screen.getByRole("button", { name: "새 목표 만들기" }));
    fireEvent.change(screen.getByLabelText("목표 이름 또는 목적"), {
      target: { value: "유럽 여행 준비" },
    });
    fireEvent.change(screen.getByLabelText("목표 통화"), {
      target: { value: "EUR" },
    });
    fireEvent.change(screen.getByLabelText("목표 외화 금액"), {
      target: { value: "2400" },
    });
    fireEvent.change(screen.getByLabelText("목표 날짜"), {
      target: { value: "2027-12-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "데모 목표 추가" }));

    expect(
      await screen.findByRole("heading", { name: "유럽 여행 준비" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("2,400 EUR")).toHaveLength(2);
    expect(screen.getByText(/목표를 데모 화면에만 추가했습니다/)).toBeInTheDocument();
    expect(screen.getByText("아직 확인할 계획 Curve가 없습니다")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다른 목표 선택" }));
    expect(screen.getByRole("button", { name: /유럽 여행 준비/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("계획 상세 버튼은 선택 목표와 계획 식별자로 전용 경로 이동을 요청한다", async () => {
    const onOpenPlanDetail = vi.fn();
    render(<RouteScreen onOpenPlanDetail={onOpenPlanDetail} />);
    fireEvent.click(await screen.findByRole("button", { name: /미국 ETF 정기 투자/ }));
    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    const trigger = screen.getByRole("button", { name: "전체 계획 상세 보기" });
    fireEvent.click(trigger);
    expect(onOpenPlanDetail).toHaveBeenCalledWith(
      "demo",
      "usd-etf-recurring-demo",
      "usd-etf-recurring-demo",
    );
  });

  it("API 상세 경로를 공통 상세 화면으로 열고 플래너 복귀를 위임한다", async () => {
    const onBack = vi.fn();
    const activePlan = PLANNER_API_FIXTURE.items[0]!.activePlan!;
    const detailDependencies: PlannerPlanDetailDependencies = {
      loadOverview: vi.fn().mockResolvedValue(PLANNER_API_FIXTURE),
      loadPlan: vi.fn().mockResolvedValue(activePlan),
      loadVersions: vi.fn().mockResolvedValue([]),
    };
    render(
      <RouteScreen
        mode="api"
        detailRoute={{ source: "api", goalId: "goal-usd", planId: "plan-usd" }}
        detailDependencies={detailDependencies}
        onBackFromDetail={onBack}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "미국 ETF 준비" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "플래너로 돌아가기" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("데모 상세 경로를 같은 상세 화면으로 열고 기본 복귀 동작도 안전하다", async () => {
    render(
      <RouteScreen
        detailRoute={{
          source: "demo",
          goalId: "usd-etf-recurring-demo",
          planId: "usd-etf-recurring-demo",
        }}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "미국 ETF 정기 투자" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "플래너로 돌아가기" }));
  });

  it("기본 상세 열기 콜백이 없어도 데모 여정은 안전하게 동작한다", async () => {
    await enterDemoAction();
    fireEvent.click(screen.getByRole("button", { name: "전체 계획 상세 보기" }));
  });

  it("독립 데모 화면도 상세 이동 콜백 없이 안전하게 사용할 수 있다", async () => {
    const data = await loadRoutePlan();
    if (data === null) throw new Error("데모 플래너 데이터가 필요합니다.");
    render(<PlannerDemoScreen data={data} />);
    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "전체 계획 상세 보기" }));
  });

  it("loading, empty, API 오류와 재시도를 각각 표시한다", async () => {
    const pendingLoader = vi.fn(() => new Promise<null>(() => undefined));
    const first = render(<RouteScreen loadPlan={pendingLoader} />);
    expect(screen.getByRole("status")).toHaveTextContent("목표와 계획을 확인하고 있습니다.");
    first.unmount();

    const empty = render(<RouteScreen loadPlan={async () => null} />);
    expect(await screen.findByText("표시할 목표 또는 계획 데이터가 없습니다.")).toBeInTheDocument();
    empty.unmount();

    const data = await loadRoutePlan();
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("계획 조회 실패", 503))
      .mockResolvedValueOnce(data);
    render(<RouteScreen loadPlan={loader} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("계획 조회 실패");
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(await screen.findByRole("region", { name: "데모 플래너" })).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("API 모드에서는 서버 목표와 동일한 공통 Journey 트리만 표시한다", async () => {
    const onOpenPlanDetail = vi.fn();
    const apiDependencies: PlannerApiDependencies = {
      load: vi.fn().mockResolvedValue(PLANNER_API_FIXTURE),
      complete: vi.fn(),
      skip: vi.fn(),
      preview: vi.fn(),
      create: vi.fn(),
      createGoal: vi.fn(),
      previewScenario: vi.fn(),
      apply: vi.fn(),
      createExecutionKey: vi.fn(() => "api-key"),
      getToday: vi.fn(() => "2026-09-08"),
    };
    render(
      <RouteScreen
        mode="api"
        apiDependencies={apiDependencies}
        onOpenPlanDetail={onOpenPlanDetail}
      />,
    );

    const region = await screen.findByRole("region", { name: "API 플래너" });
    expect(region).toHaveAttribute("data-source", "sample");
    expect(screen.getByText("샘플 데이터")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /미국 ETF 준비/ })).toBeInTheDocument();
    expect(screen.queryByText("미국 ETF 정기 투자")).not.toBeInTheDocument();
    expect(screen.getByTestId("planner-journey-screen")).toBe(region);
    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "전체 계획 상세 보기" }));
    expect(onOpenPlanDetail).toHaveBeenCalledWith("api", "goal-usd", "plan-usd");
  });

  it("회원은 저장 없이 데모를 둘러본 뒤 계정 플래너로 돌아온다", async () => {
    const apiDependencies: PlannerApiDependencies = {
      load: vi.fn().mockResolvedValue(PLANNER_API_FIXTURE),
      complete: vi.fn(),
      skip: vi.fn(),
      preview: vi.fn(),
      create: vi.fn(),
      createGoal: vi.fn(),
      previewScenario: vi.fn(),
      apply: vi.fn(),
      createExecutionKey: vi.fn(() => "api-key"),
      getToday: vi.fn(() => "2026-09-08"),
    };
    render(<RouteScreen mode="api" apiDependencies={apiDependencies} />);

    await screen.findByRole("region", { name: "API 플래너" });
    fireEvent.click(screen.getByRole("button", { name: "데모로 둘러보기" }));
    expect(
      await screen.findByRole("region", { name: "데모 플래너" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "내 계정 플래너로 돌아가기" }),
    );
    expect(
      await screen.findByRole("region", { name: "API 플래너" }),
    ).toBeInTheDocument();
    expect(apiDependencies.createGoal).not.toHaveBeenCalled();
  });
});
