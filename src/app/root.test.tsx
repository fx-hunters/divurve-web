import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Root } from "./root";

vi.mock("./app", () => ({ App: () => <span>사용자 앱</span> }));
vi.mock("../screens/admin/admin-app", () => ({
  AdminApp: () => <span>관리자 콘솔</span>,
}));

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("Root", () => {
  it("/admin 아래에서는 관리자 콘솔을 띄운다", () => {
    render(<Root pathname="/admin/users" />);
    expect(screen.getByText("관리자 콘솔")).toBeInTheDocument();
  });

  it("그 밖의 경로에서는 사용자 앱을 띄운다", () => {
    render(<Root pathname="/mypage" />);
    expect(screen.getByText("사용자 앱")).toBeInTheDocument();
  });

  it("경로를 넘기지 않으면 현재 주소를 쓴다", () => {
    window.history.replaceState(null, "", "/admin");
    render(<Root />);
    expect(screen.getByText("관리자 콘솔")).toBeInTheDocument();
  });
});
