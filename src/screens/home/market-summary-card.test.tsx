import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toMarketView } from "./home-market";
import { MarketSummaryCard } from "./market-summary-card";

const USDKRW_VIEW = toMarketView({
  pairCode: "USDKRW",
  currentRate: 1_382.4,
  lower: 1_330.6,
  upper: 1_389.02,
});

function renderCard(overrides: Partial<Parameters<typeof MarketSummaryCard>[0]> = {}) {
  const props = {
    view: USDKRW_VIEW,
    isReloading: false,
    onSelectPairCode: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
  render(<MarketSummaryCard {...props} />);
  return props;
}

describe("MarketSummaryCard", () => {
  it("현재 환율과 80% 범위, 통화쌍을 렌더링한다", () => {
    renderCard();

    expect(
      screen.getByRole("heading", { name: "오늘의 시장" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1,382.40")).toBeInTheDocument();
    expect(screen.getByText("₩")).toBeInTheDocument();
    expect(screen.getByText("80% 범위 1,330.60 - 1,389.02")).toBeInTheDocument();
    // 통화 색은 고정 배정 토큰으로만 칠한다(리터럴 색상 금지).
    expect(screen.getByText("USD").getAttribute("style")).toContain("var(--usd)");
    expect(screen.getByText("KRW").getAttribute("style")).toContain(
      "var(--text-muted)",
    );
  });

  it("드롭다운은 백엔드가 지원하는 통화쌍만 노출하고 선택을 알린다", () => {
    const { onSelectPairCode } = renderCard();
    const select = screen.getByRole("combobox", { name: "통화쌍" });

    expect(
      Array.from(select.querySelectorAll("option")).map(
        (option) => (option as HTMLOptionElement).value,
      ),
    ).toEqual(["USDKRW", "USDJPY", "EURUSD"]);
    expect(select).toHaveValue("USDKRW");

    fireEvent.change(select, { target: { value: "USDJPY" } });
    expect(onSelectPairCode).toHaveBeenCalledWith("USDJPY");
  });

  it("재조회 중에는 환율 대신 스피너를 보여준다", () => {
    renderCard({
      view: toMarketView({ pairCode: "USDJPY" }),
      isReloading: true,
    });

    expect(
      screen.getByRole("status", { name: "시세를 불러오는 중" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/80% 범위/)).not.toBeInTheDocument();
  });

  it("조회에 실패하면 메시지와 다시 불러오기 버튼을 보여준다", () => {
    const { onRetry } = renderCard({
      view: toMarketView({ pairCode: "EURUSD" }),
      errorMessage: "점검 중입니다.",
    });

    expect(screen.getByRole("alert")).toHaveTextContent("점검 중입니다.");
    fireEvent.click(screen.getByRole("button", { name: "시세 다시 불러오기" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("현재 환율이 없으면 안내 문구만 보여준다", () => {
    renderCard({ view: toMarketView({ pairCode: "USDKRW" }) });

    expect(
      screen.getByText("현재 환율을 표시할 수 없습니다."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/80% 범위/)).not.toBeInTheDocument();
  });

  it("children으로 받은 설명 영역을 카드 안에 붙인다", () => {
    renderCard({ children: <p>설명 자리</p> });
    expect(screen.getByText("설명 자리")).toBeInTheDocument();
  });
});
