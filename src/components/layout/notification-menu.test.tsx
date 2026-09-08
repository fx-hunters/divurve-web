import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import { fetchNotifications } from "../../api/notifications";
import { NotificationMenu } from "./notification-menu";

vi.mock("../../api/notifications", () => ({ fetchNotifications: vi.fn() }));

const UNREAD = {
  id: "n-1",
  type: "STEP_DUE",
  title: "1회차 환전일",
  message: "오늘 1회차 환전 예정입니다.",
  createdAt: "2026-09-08T00:00:00Z",
  read: false,
};

const READ = { ...UNREAD, id: "n-2", title: "읽은 알림", read: true };

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "알림" }));
}

describe("NotificationMenu", () => {
  beforeEach(() => {
    vi.mocked(fetchNotifications).mockReset();
    vi.mocked(fetchNotifications).mockResolvedValue([]);
  });

  it("닫혀 있는 동안에는 알림을 조회하지 않는다", () => {
    render(<NotificationMenu />);

    const trigger = screen.getByRole("button", { name: "알림" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "알림 목록" })).toBeNull();
    expect(fetchNotifications).not.toHaveBeenCalled();
  });

  it("열면 조회 중 상태를 거쳐 빈 상태를 보여준다", async () => {
    render(<NotificationMenu />);
    openMenu();

    expect(screen.getByRole("button", { name: "알림" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("region", { name: "알림 목록" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "알림을 불러오는 중입니다",
    );
    expect(await screen.findByText("새 알림이 없습니다")).toBeInTheDocument();
    expect(fetchNotifications).toHaveBeenCalledTimes(1);
  });

  it("알림이 있으면 제목·내용·날짜를 목록으로 보여준다", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([UNREAD, READ]);
    render(<NotificationMenu />);
    openMenu();

    expect(await screen.findByText("1회차 환전일")).toBeInTheDocument();
    expect(screen.getByText("읽은 알림")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByText("2026-09-08")).toHaveLength(2);
  });

  it("조회에 실패하면 오류 문구를 보여준다", async () => {
    vi.mocked(fetchNotifications).mockRejectedValue(
      new ApiError("로그인이 필요한 요청입니다.", 401),
    );
    render(<NotificationMenu />);
    openMenu();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "로그인이 필요한 요청입니다.",
    );
  });

  it("버튼을 다시 누르면 닫힌다", async () => {
    render(<NotificationMenu />);
    openMenu();
    expect(await screen.findByText("새 알림이 없습니다")).toBeInTheDocument();

    openMenu();
    expect(screen.queryByRole("region", { name: "알림 목록" })).toBeNull();
  });

  it("Escape 키로 닫히고 다른 키는 열린 상태를 유지한다", async () => {
    render(<NotificationMenu />);
    openMenu();
    await screen.findByText("새 알림이 없습니다");

    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(screen.getByRole("region", { name: "알림 목록" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "알림 목록" })).toBeNull(),
    );
  });

  it("드롭다운 안쪽 클릭은 유지하고 바깥 클릭은 닫는다", async () => {
    render(<NotificationMenu />);
    openMenu();
    await screen.findByText("새 알림이 없습니다");

    fireEvent.mouseDown(screen.getByRole("region", { name: "알림 목록" }));
    expect(screen.getByRole("region", { name: "알림 목록" })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "알림 목록" })).toBeNull(),
    );
  });

  it("요소가 아닌 대상에서 온 클릭도 바깥 클릭으로 본다", async () => {
    render(<NotificationMenu />);
    openMenu();
    await screen.findByText("새 알림이 없습니다");

    fireEvent.mouseDown(document);
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "알림 목록" })).toBeNull(),
    );
  });
});
