import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttentionBanner } from "./attention-banner";
import type { AttentionData } from "../../types/home";

const DATA: AttentionData = {
  regimeLabel: "주의",
  tone: "warn",
  events: [
    {
      title: "Federal Funds Rate Decision",
      dateLabel: "2026년 9월 9일",
      currencyCode: "USD",
      severity: "고변동성",
    },
    {
      title: "Retail Sales",
      dateLabel: "2026년 9월 18일",
      currencyCode: "USD",
      severity: "중변동성",
    },
  ],
};

describe("AttentionBanner", () => {
  it("국면 배지와 다가오는 일정을 렌더링한다", () => {
    const onNavigateToRange = vi.fn();
    render(<AttentionBanner data={DATA} onNavigateToRange={onNavigateToRange} />);

    expect(screen.getByRole("heading", { name: /주의 필요/ })).toBeInTheDocument();
    expect(screen.getByText("주의")).toBeInTheDocument();
    expect(screen.getByText("Federal Funds Rate Decision")).toBeInTheDocument();
    expect(screen.getByText("USD · 2026년 9월 9일")).toBeInTheDocument();
    expect(screen.getByText("고변동성")).toBeInTheDocument();
    expect(screen.getByText("중변동성")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "환율 범위 확인하기 →" }));
    expect(onNavigateToRange).toHaveBeenCalled();
  });

  it("일정이 없으면 안내 문구를 보여주고, 이동 핸들러가 없으면 버튼을 감춘다", () => {
    render(
      <AttentionBanner
        data={{ regimeLabel: "정상", tone: "normal", events: [] }}
      />,
    );
    expect(screen.getByText("예정된 일정이 없습니다.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "환율 범위 확인하기 →" }),
    ).not.toBeInTheDocument();
  });
});
