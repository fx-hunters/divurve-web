import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import { loadRoutePlan } from "../../api/route";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import { RouteScreen } from "./route-screen";
import type { PlannerApiDependencies } from "./use-planner-api";

async function enterDemoAction(goalName = "미국 ETF 정기 투자") {
  render(<RouteScreen />);
  fireEvent.click(
    await screen.findByRole("button", { name: new RegExp(goalName) }),
  );
  fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" }));
  fireEvent.click(screen.getByRole("button", { name: "다음 행동 보기" }));
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

  it("목표 선택부터 현재 상태, Curve, 다음 행동을 장면별로 이동한다", async () => {
    render(<RouteScreen />);
    fireEvent.click(
      await screen.findByRole("button", { name: /미국 ETF 정기 투자/ }),
    );

    expect(screen.getByText("미국 ETF 정기 투자의 현재 위치입니다")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "계획 Curve" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" }));
    expect(screen.getByRole("region", { name: "계획 Curve" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "계획 경로" })).toBeInTheDocument();
    expect(screen.queryByText("실행 외화 금액")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음 행동 보기" }));
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

    fireEvent.click(
      screen.getByRole("button", { name: /환율이 빠르게 상승하면/ }),
    );
    expect(screen.getAllByText(/변경 전/).length).toBeGreaterThan(0);
    expect(document.querySelector('[data-curve-role="alternative"]')).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "이 계획 적용" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "변경 내용 확인" }));
    expect(screen.getByText("이 버튼을 누르기 전까지 현재 활성 계획은 변경되지 않습니다.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "비교로 돌아가기" }));
    expect(screen.getByRole("heading", { name: "상황이 달라지면 경로를 비교해 보세요" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "변경 내용 확인" }));
    fireEvent.click(screen.getByRole("button", { name: "이 계획 적용" }));
    expect(await screen.findByText("대체 경로를 데모에 적용했습니다")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("서버 데이터는 바뀌지 않았습니다");
  });

  it("데모 기록과 건너뛰기는 Planner API를 호출하지 않는다", async () => {
    const apiDependencies: PlannerApiDependencies = {
      load: vi.fn(),
      complete: vi.fn(),
      skip: vi.fn(),
      preview: vi.fn(),
      create: vi.fn(),
      previewScenario: vi.fn(),
      apply: vi.fn(),
    };
    render(<RouteScreen apiDependencies={apiDependencies} />);
    fireEvent.click(
      await screen.findByRole("button", { name: /미국 ETF 정기 투자/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 행동 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "이번 회차 데모 기록" }));
    expect(await screen.findByText("이번 회차를 데모로 기록했습니다")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "최신 Curve 확인" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 행동 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "상황이 바뀐다면?" }));
    fireEvent.click(screen.getByRole("button", { name: /이번 회차를 놓치면/ }));

    expect(apiDependencies.load).not.toHaveBeenCalled();
    expect(apiDependencies.complete).not.toHaveBeenCalled();
    expect(apiDependencies.skip).not.toHaveBeenCalled();
    expect(apiDependencies.previewScenario).not.toHaveBeenCalled();
  });

  it("마감형 목표도 같은 장면 구조와 fixture 표시값을 사용한다", async () => {
    await enterDemoAction("일본 여행 준비");
    expect(screen.getByRole("heading", { name: "첫 마감 보호 회차 확인" }).parentElement).toHaveTextContent("35,000 JPY");
    fireEvent.click(screen.getByRole("button", { name: "Curve로 돌아가기" }));
    expect(screen.getByRole("status")).toHaveTextContent("보호 1");
  });

  it("계획 상세를 열고 Escape로 닫은 뒤 트리거에 포커스를 돌려준다", async () => {
    await enterDemoAction();
    const trigger = screen.getByRole("button", { name: "전체 계획 상세 보기" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("체험용 fixture")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
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
    const apiDependencies: PlannerApiDependencies = {
      load: vi.fn().mockResolvedValue(PLANNER_API_FIXTURE),
      complete: vi.fn(),
      skip: vi.fn(),
    };
    render(<RouteScreen mode="api" apiDependencies={apiDependencies} />);

    const region = await screen.findByRole("region", { name: "API 플래너" });
    expect(region).toHaveAttribute("data-source", "sample");
    expect(screen.getByText("샘플 데이터")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /미국 ETF 준비/ })).toBeInTheDocument();
    expect(screen.queryByText("미국 ETF 정기 투자")).not.toBeInTheDocument();
    expect(screen.getByTestId("planner-journey-screen")).toBe(region);
  });
});
