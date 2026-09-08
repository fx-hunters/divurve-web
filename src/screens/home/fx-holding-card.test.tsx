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
          exposure: [],
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
    render(<FxHoldingCard data={{ fxRatioPct: 40, dayChangeKrw: -12_000, exposure: [] }} />);
    expect(screen.getByText("₩ -12,000")).toHaveStyle({ color: "var(--danger)" });
  });

  it("서버가 주지 않은 지표는 줄을 감춘다", () => {
    render(<FxHoldingCard data={{ fxRatioPct: 100, topCurrencyCode: "USD", exposure: [] }} />);
    expect(screen.queryByText("어제 대비")).not.toBeInTheDocument();
    expect(screen.queryByText("1% 변동 시")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "자산 등록 / 편집" }),
    ).not.toBeInTheDocument();
  });

  it("외화 비중을 계산할 수 없으면 안내 문구를 보여준다", () => {
    render(<FxHoldingCard data={{ exposure: [] }} />);
    expect(
      screen.getByText("등록된 자산이 없어 외화 비중을 계산할 수 없습니다."),
    ).toBeInTheDocument();
  });

  it("통화별 노출이 오면 분해 도넛과 범례를 그린다", () => {
    render(
      <FxHoldingCard
        data={{
          fxRatioPct: 36.1,
          topCurrencyCode: "USD",
          exposure: [
            { currencyCode: "USD", krw: 15_790_000, sharePct: 63.9 },
            { currencyCode: "JPY", krw: 8_926_000, sharePct: 36.1 },
          ],
        }}
      />,
    );

    // 게이지가 아니라 분해 도넛이다 — 라벨로 어느 쪽이 그려졌는지 구분한다.
    expect(
      screen.getByLabelText("통화별 비중 USD 63.9%, JPY 36.1%"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("외화 비중 36.1%")).not.toBeInTheDocument();
    // 범례는 조각과 같은 순서로 비중과 원화 평가액을 함께 읽어 준다.
    expect(screen.getByText("63.9% · ₩ 15,790,000")).toBeInTheDocument();
    expect(screen.getByText("36.1% · ₩ 8,926,000")).toBeInTheDocument();
    // 외화 비중은 그림을 잃었으므로 숫자 줄로 남긴다.
    expect(screen.getByText("외화 비중")).toBeInTheDocument();
  });

  it("통화별 노출이 빈 배열이면 기존 외화 비중 게이지를 그대로 그린다", () => {
    render(<FxHoldingCard data={{ fxRatioPct: 36.1, exposure: [] }} />);
    expect(screen.getByLabelText("외화 비중 36.1%")).toBeInTheDocument();
    expect(screen.queryByText("외화 비중")).not.toBeInTheDocument();
  });
});
