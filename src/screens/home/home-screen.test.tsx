import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError, type ApiResult } from "../../api/client";
import type { ForecastResponse } from "../../api/generated/divurve-api";
import {
  EMPTY_HOME_SUMMARY_FIXTURE,
  FORECAST_API_FIXTURE,
  HOME_SUMMARY_FIXTURE,
} from "../../test/api-fixtures";
import { HomeScreen } from "./home-screen";

const FORECAST_RESULT: ApiResult<ForecastResponse> = {
  data: { ...FORECAST_API_FIXTURE.forecast, pairCode: "USDJPY", currentRate: 147.52 },
  meta: { asOf: FORECAST_API_FIXTURE.asOf },
};

/** 화면 테스트는 네트워크를 타지 않도록 시세·설명 조회를 모두 주입한다. */
function marketStubs() {
  return {
    loadMarket: vi.fn().mockResolvedValue(FORECAST_RESULT),
    explainRequester: vi.fn().mockReturnValue(new Promise(() => {})),
  };
}

describe("HomeScreen", () => {
  it("요약을 불러와 대시보드를 렌더링하고 이동 핸들러를 연결한다", async () => {
    const onNavigate = vi.fn();
    render(
      <HomeScreen
        onNavigate={onNavigate}
        loadSummary={vi.fn().mockResolvedValue(HOME_SUMMARY_FIXTURE)}
        {...marketStubs()}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "오늘의 핵심" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "자산 등록 / 편집" }));
    expect(onNavigate).toHaveBeenCalledWith("assets");

    fireEvent.click(screen.getByRole("button", { name: "플래너 열기" }));
    expect(onNavigate).toHaveBeenCalledWith("planner");

    fireEvent.click(screen.getByRole("button", { name: "환율 범위 확인하기 →" }));
    expect(onNavigate).toHaveBeenCalledWith("range");
  });

  it("홈 요약이 준 통화쌍으로 시장 카드를 그리고 드롭다운 선택을 조회로 잇는다", async () => {
    const stubs = marketStubs();
    const { container } = render(
      <HomeScreen
        onNavigate={vi.fn()}
        loadSummary={vi.fn().mockResolvedValue(HOME_SUMMARY_FIXTURE)}
        {...stubs}
      />,
    );

    const select = await screen.findByRole("combobox", { name: "통화쌍" });
    expect(select).toHaveValue("USDKRW");
    // 같은 숫자가 추세 그래프의 세로축 눈금에도 나오므로 현재 환율 자리를 짚는다.
    expect(
      container.querySelector(".market-summary-card__value"),
    ).toHaveTextContent("1,382.40");

    fireEvent.change(select, { target: { value: "USDJPY" } });

    expect(stubs.loadMarket).toHaveBeenCalledWith("USDJPY");
    expect(await screen.findByText("147.52")).toBeInTheDocument();
  });

  it("위험성향 미측정 안내에서 마이페이지로 이동한다", async () => {
    const onNavigate = vi.fn();
    render(
      <HomeScreen
        onNavigate={onNavigate}
        loadSummary={vi.fn().mockResolvedValue({
          ...HOME_SUMMARY_FIXTURE,
          data: {
            ...HOME_SUMMARY_FIXTURE.data,
            blocks: HOME_SUMMARY_FIXTURE.data.blocks.map((block) =>
              block.key === "profile_fit"
                ? { ...block, state: "not_measured" as const }
                : block,
            ),
          },
        })}
        {...marketStubs()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "진단하러 가기" }));
    expect(onNavigate).toHaveBeenCalledWith("mypage");
  });

  it("모든 블록이 비면 빈 화면을 렌더링하고 플래너로 이동할 수 있다", async () => {
    const onNavigate = vi.fn();
    render(
      <HomeScreen
        onNavigate={onNavigate}
        loadSummary={vi.fn().mockResolvedValue(EMPTY_HOME_SUMMARY_FIXTURE)}
        {...marketStubs()}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "외화 목표가 없습니다" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "환전 플래너로 이동" }));
    expect(onNavigate).toHaveBeenCalledWith("planner");
  });

  it("불러오는 중에는 로딩 안내를 보여준다", () => {
    render(
      <HomeScreen
        onNavigate={vi.fn()}
        loadSummary={vi.fn().mockReturnValue(new Promise(() => {}))}
        {...marketStubs()}
      />,
    );
    expect(screen.getByText("홈 정보를 불러오는 중입니다")).toBeInTheDocument();
  });

  it("실패하면 메시지와 재시도 버튼을 보여준다", async () => {
    const loadSummary = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("점검 중입니다.", 503, "UNAVAILABLE"))
      .mockResolvedValue(HOME_SUMMARY_FIXTURE);
    render(
      <HomeScreen
        onNavigate={vi.fn()}
        loadSummary={loadSummary}
        {...marketStubs()}
      />,
    );

    expect(await screen.findByText("점검 중입니다.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /다시/ }));
    expect(
      await screen.findByRole("heading", { name: "오늘의 핵심" }),
    ).toBeInTheDocument();
  });
});
