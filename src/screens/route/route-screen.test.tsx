import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ApiError } from "../../api/client";
import { loadRoutePlan } from "../../api/route";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import { RouteScreen } from "./route-screen";
import type { PlannerApiDependencies } from "./use-planner-api";

const PLAN_IDS = {
  "미국 ETF 정기 투자": "usd-etf-recurring-demo",
  "일본 여행 준비": "jpy-travel-deadline-demo",
} as const;

async function enterPlannerGoal(
  goalName: keyof typeof PLAN_IDS,
) {
  window.sessionStorage.setItem(
    "divurve:planner-journey-seen:" + PLAN_IDS[goalName],
    "seen",
  );
  const view = render(<RouteScreen />);
  const goalButton = await screen.findByRole("button", {
    name: new RegExp(goalName),
  });
  fireEvent.click(goalButton);

  const stage = view.container.querySelector<HTMLElement>(
    ".planner-dive__stage",
  );
  if (stage === null) {
    throw new Error("Curve Dive 전환 요소가 필요합니다.");
  }
  fireEvent.animationEnd(stage);
  return view;
}

function openSecondaryActions() {
  fireEvent.click(screen.getByText("보조 행동 열기"));
}

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("RouteScreen", () => {
  it("세 가지 상황을 먼저 보여주고 전체 상황과 대체 Curve를 승인 후 적용한다", async () => {
    const view = await enterPlannerGoal("미국 ETF 정기 투자");

    expect(
      screen.queryByRole("heading", { name: "상황이 달라졌다면" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "상황이 바뀐다면?" }),
    );

    expect(
      screen.getByRole("button", { name: "환율이 빠르게 상승하면" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이번 회차를 놓치면" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "사용할 예산이 줄면" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /예상 범위 안/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "환율이 하락하면" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "전체 상황 보기" }),
    );
    const currentScenario = screen.getByRole("button", {
      name: /예상 범위 안 적용 중/,
    });
    const risingScenario = screen.getByRole("button", {
      name: "환율이 빠르게 상승하면",
    });
    expect(currentScenario).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "환율이 하락하면" }),
    ).toBeInTheDocument();

    fireEvent.click(risingScenario);
    expect(screen.getAllByText("대체 계획 미리보기").length).toBeGreaterThan(0);
    expect(
      view.container.querySelector('[data-curve-role="current"]'),
    ).toHaveClass("planner-curve__path--muted");
    expect(
      view.container.querySelector('[data-curve-role="alternative"]'),
    ).toBeInTheDocument();
    expect(currentScenario).toHaveTextContent("적용 중");
    expect(
      screen.getByRole("button", { name: "기존 계획과 비교" }),
    ).toBeInTheDocument();

    fireEvent.click(currentScenario);
    expect(
      view.container.querySelector('[data-curve-role="alternative"]'),
    ).toBeNull();
    fireEvent.click(risingScenario);
    fireEvent.click(
      screen.getByRole("button", { name: "기존 계획과 비교" }),
    );

    expect(
      screen.getAllByText(
        "지정한 예산 한도와 다음 회차 조건을 다시 확인해 주세요.",
      ).length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "이 계획 적용" }));
    const firstDialog = screen.getByRole("alertdialog");
    expect(firstDialog).toHaveTextContent("대체 계획을 적용할까요?");
    fireEvent.click(
      within(firstDialog).getByRole("button", { name: "취소" }),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(
      view.container.querySelector('[data-curve-role="alternative"]'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이 계획 적용" }));
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "변경 계획 적용",
      }),
    );

    expect(
      screen.getByRole("button", {
        name: /환율이 빠르게 상승하면 적용 중/,
      }),
    ).toBeInTheDocument();
    expect(
      view.container.querySelector('[data-curve-role="alternative"]'),
    ).toBeNull();
    expect(screen.getByText(/현재 이 계획이 적용되어 있습니다/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "상황별 경로 닫기" }),
    );
    expect(
      screen.queryByRole("heading", { name: "상황이 달라졌다면" }),
    ).not.toBeInTheDocument();
  });

  it("목표·계획 상세 drawer와 선택 맥락의 이유 설명을 제공한다", async () => {
    const view = await enterPlannerGoal("미국 ETF 정기 투자");

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "목표 정보 보기" }),
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "42",
    );
    expect(screen.getByText("준비 기간 7개월 (데모)")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "목표 정보 접기" }),
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "계획 자세히 보기" }),
    );
    const drawer = screen.getByRole("dialog", {
      name: "계획 자세히 보기",
    });
    expect(within(drawer).getByText("계획 구성 · 준비 구간")).toBeInTheDocument();
    expect(
      within(drawer).getByText("계획 구성 · 회차별 계획"),
    ).toBeInTheDocument();
    expect(within(drawer).getByText("월별 준비 Curve")).toBeInTheDocument();
    expect(within(drawer).getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "42",
    );

    const drawerLayer = view.container.querySelector<HTMLElement>(
      '[data-testid="planner-detail-drawer"]',
    );
    if (drawerLayer === null) {
      throw new Error("계획 상세 drawer가 필요합니다.");
    }
    fireEvent.keyDown(drawerLayer, { key: "Tab" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(drawerLayer, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "계획 자세히 보기" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "계획 상세 닫기" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "계획 자세히 보기" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    openSecondaryActions();
    fireEvent.click(
      screen.getByRole("button", {
        name: "왜 이렇게 나눴는지 보기",
      }),
    );
    expect(
      screen.getByText(
        "AI는 이 화면의 금액·비율·회차를 생성하거나 변경하지 않습니다.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("다음 회차 확인").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "자세히" }));
    expect(
      screen.getByText(
        "대체 계획은 선택만으로 적용되지 않고 사용자가 변경을 승인해야 합니다.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "설명 닫기" }));
    expect(
      screen.queryByText(
        "대체 계획은 선택만으로 적용되지 않고 사용자가 변경을 승인해야 합니다.",
      ),
    ).not.toBeInTheDocument();

  });

  it("대표 행동을 바꾸지 않고 보조 메뉴에서 이번 회차를 기록한다", async () => {
    const view = await enterPlannerGoal("미국 ETF 정기 투자");
    const dock = view.container.querySelector<HTMLElement>(
      ".planner-action-dock",
    );
    if (dock === null) {
      throw new Error("Action Dock이 필요합니다.");
    }

    expect(dock).toHaveAttribute("data-primary-action", "explore");
    openSecondaryActions();
    fireEvent.click(
      within(dock).getByRole("button", { name: "이번 회차 기록" }),
    );

    expect(
      screen.getByText(/이번 회차를 데모 기록으로 표시했습니다/),
    ).toBeInTheDocument();
  });

  it("Curve 노드를 키보드로 선택하고 이번 회차 기록 후 다음 노드를 강조한다", async () => {
    const view = await enterPlannerGoal("미국 ETF 정기 투자");
    const currentNode = view.container.querySelector<SVGGElement>(
      '[data-checkpoint-id="usd-now"]',
    );
    const nextNode = view.container.querySelector<SVGGElement>(
      '[data-checkpoint-id="usd-next"]',
    );
    if (currentNode === null || nextNode === null) {
      throw new Error("현재와 다음 회차 노드가 필요합니다.");
    }

    fireEvent.click(currentNode);
    expect(currentNode).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(nextNode, { key: "ArrowRight" });
    expect(
      screen.getByRole("button", { name: "상황이 바뀐다면?" }),
    ).toBeInTheDocument();
    fireEvent.keyDown(nextNode, { key: " " });
    expect(nextNode).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "이번 회차 기록" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "이 지점의 설명 보기" }),
    );
    expect(
      screen.getByRole("heading", { name: "이 계획이 나뉜 이유" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "설명 닫기" }));

    fireEvent.click(
      screen.getByRole("button", { name: "이번 회차 기록" }),
    );
    expect(screen.getByText(/이번 회차를 데모 기록으로 표시했습니다/)).toBeInTheDocument();
    expect(
      view.container.querySelector('[data-checkpoint-id="usd-context"]'),
    ).toHaveAttribute("aria-label", expect.stringContaining("다음 확인"));
    expect(
      view.container.querySelector(".planner-action-dock"),
    ).toHaveAttribute("data-primary-action", "next");
    expect(
      screen.queryByRole("button", { name: "이번 회차 기록" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "다음 일정 확인" }),
    );
    expect(
      view.container.querySelector(
        '[data-checkpoint-detail="usd-context"]',
      ),
    ).toBeInTheDocument();
  });

  it("마감형 목표에서 건너뛰기를 선택하면 회차 누락 대체 계획을 미리 본다", async () => {
    const view = await enterPlannerGoal("일본 여행 준비");

    expect(screen.getAllByText("40,000 JPY 확보").length).toBeGreaterThan(0);
    expect(screen.getByText("대표 지표 · 외화 확보율")).toBeInTheDocument();
    openSecondaryActions();
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));

    expect(
      screen.getByRole("button", { name: "이번 회차를 놓치면" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText("누락 기록 뒤 마감 조건을 다시 확인하는 대체 Curve"),
    ).toBeInTheDocument();
    expect(
      view.container.querySelector('[data-curve-role="alternative"]'),
    ).toBeInTheDocument();
  });

  it("응답을 기다리는 동안 loading 상태를 표시한다", () => {
    const pendingLoader = vi.fn(() => new Promise<null>(() => undefined));

    render(<RouteScreen loadPlan={pendingLoader} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "목표와 계획을 확인하고 있습니다.",
    );
  });

  it("데이터가 없으면 empty 상태를 표시한다", async () => {
    render(<RouteScreen loadPlan={async () => null} />);

    expect(
      await screen.findByText("표시할 목표 또는 계획 데이터가 없습니다."),
    ).toBeInTheDocument();
  });

  it("회원용 API 모드에서는 서버 목표만 단계형 플래너에 표시한다", async () => {
    const apiDependencies: PlannerApiDependencies = {
      load: vi.fn().mockResolvedValue(PLANNER_API_FIXTURE),
      complete: vi.fn(),
      skip: vi.fn(),
    };

    render(<RouteScreen mode="api" apiDependencies={apiDependencies} />);

    expect(
      await screen.findByRole("region", { name: "API 플래너" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /미국 ETF 준비/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "어떤 외화 목표를 준비하고 있나요?",
      }),
    ).not.toBeInTheDocument();
  });

  it("API 오류를 표시하고 다시 불러온다", async () => {
    const data = await loadRoutePlan();
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("계획 조회 실패", 503))
      .mockResolvedValueOnce(data);

    render(<RouteScreen loadPlan={loader} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("계획 조회 실패");
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));

    expect(
      await screen.findByRole("heading", {
        name: "어떤 외화 목표를 준비하고 있나요?",
      }),
    ).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
