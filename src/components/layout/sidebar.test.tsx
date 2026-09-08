import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "./sidebar";

describe("Sidebar", () => {
  const defaultProps = {
    activeTab: "home" as const,
    accountKind: "demo" as const,
    onSelectTab: vi.fn(),
  };

  it("서비스명 DIVURVE와 내비게이션 탭들을 렌더링한다", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByRole("heading", { name: "DIVURVE" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /대시보드/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /환전 플래너/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /환율 전망/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /내 자산/ })).toBeInTheDocument();
  });

  it("탭 클릭 시 onSelectTab 콜백을 호출한다", () => {
    render(<Sidebar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /환전 플래너/ }));
    expect(defaultProps.onSelectTab).toHaveBeenCalledWith("planner");
  });

  it("데모 계정에는 계정 배지와 로그인 유도를 함께 표시한다", () => {
    const onLogin = vi.fn();
    render(<Sidebar {...defaultProps} onLogin={onLogin} />);

    expect(screen.getByText("데모 계정")).toBeInTheDocument();
    expect(screen.getByText("데모 계정 데이터")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "로그인하고 내 자산 보기" }));
    expect(onLogin).toHaveBeenCalled();
  });

  it("로그인 콜백이 없으면 데모 계정에도 유도 버튼을 노출하지 않는다", () => {
    render(<Sidebar {...defaultProps} />);
    expect(
      screen.queryByRole("button", { name: "로그인하고 내 자산 보기" }),
    ).not.toBeInTheDocument();
  });

  it("회원 계정에는 로그인 유도 없이 계정 배지만 표시한다", () => {
    render(<Sidebar {...defaultProps} accountKind="member" onLogin={vi.fn()} />);

    expect(screen.getByText("내 계정")).toBeInTheDocument();
    expect(screen.getByText("내 계정 데이터")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "로그인하고 내 자산 보기" }),
    ).not.toBeInTheDocument();
  });
});
