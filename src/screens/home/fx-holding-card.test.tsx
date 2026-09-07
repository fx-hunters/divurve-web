import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FxHoldingCard } from "./fx-holding-card";

describe("FxHoldingCard", () => {
  it("외화 비중과 서버가 준 지표를 렌더링한다", () => {
    const onNavigateToAssets = vi.fn();
    render(
      <FxHoldingCard
        data={{
          fxRatioPct: 36.1,
          topCurrencyCode: "USD",
          dayChangeKrw: 84_000,
          sensitivity1pctKrw: 247_200,
        }}
        onNavigateToAssets={onNavigateToAssets}
      />,
    );

    expect(screen.getByLabelText("외화 비중 36.1%")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("+₩ 84,000")).toBeInTheDocument();
    expect(screen.getByText("±₩ 247,200")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "자산 등록 / 편집" }));
    expect(onNavigateToAssets).toHaveBeenCalled();
  });

  it("어제 대비가 음수면 위험 색으로 표시한다", () => {
    render(<FxHoldingCard data={{ fxRatioPct: 40, dayChangeKrw: -12_000 }} />);
    expect(screen.getByText("₩ -12,000")).toHaveStyle({ color: "var(--danger)" });
  });

  it("서버가 주지 않은 지표는 줄을 감춘다", () => {
    render(<FxHoldingCard data={{ fxRatioPct: 100, topCurrencyCode: "USD" }} />);
    expect(screen.queryByText("어제 대비")).not.toBeInTheDocument();
    expect(screen.queryByText("1% 변동 시")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "자산 등록 / 편집" }),
    ).not.toBeInTheDocument();
  });

  it("외화 비중을 계산할 수 없으면 안내 문구를 보여준다", () => {
    render(<FxHoldingCard data={{}} />);
    expect(
      screen.getByText("등록된 자산이 없어 외화 비중을 계산할 수 없습니다."),
    ).toBeInTheDocument();
  });
});
