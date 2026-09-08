import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Header } from "./header";

describe("Header", () => {
  it("현재 활성 탭 제목과 액션 버튼들을 렌더링한다", () => {
    const onNavigateToMypage = vi.fn();
    const onToggleTheme = vi.fn();

    render(
      <Header
        activeTabTitle="환율 전망"
        isDark={true}
        onNavigateToMypage={onNavigateToMypage}
        onToggleTheme={onToggleTheme}
      />,
    );

    expect(screen.getByRole("heading", { name: "환율 전망" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "마이페이지 이동" }));
    expect(onNavigateToMypage).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "라이트 모드로 변경" }));
    expect(onToggleTheme).toHaveBeenCalled();
  });

  it("라이트 모드와 기본 화면 제목을 표시한다", () => {
    render(
      <Header
        isDark={false}
        onNavigateToMypage={vi.fn()}
        onToggleTheme={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "대시보드" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다크 모드로 변경" }),
    ).toBeInTheDocument();
  });
});
