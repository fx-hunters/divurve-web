import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MobileNav } from "./mobile-nav";

describe("MobileNav", () => {
  it("모바일 하단 내비게이션 탭들을 렌더링하고 클릭 이벤트를 전달한다", () => {
    const onSelectTab = vi.fn();
    render(<MobileNav activeTab="home" onSelectTab={onSelectTab} />);

    expect(screen.getByRole("navigation", { name: "모바일 하단 내비게이션" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /대시보드/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /환전 플래너/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /환전 플래너/ }));
    expect(onSelectTab).toHaveBeenCalledWith("planner");
  });
});
