import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./client";
import { fetchNotifications } from "./notifications";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return { ...actual, request: vi.fn() };
});

describe("fetchNotifications", () => {
  beforeEach(() => {
    vi.mocked(request).mockReset();
  });

  it("알림 목록 엔드포인트를 호출하고 목록만 돌려준다", async () => {
    vi.mocked(request).mockResolvedValue({
      notifications: [
        {
          id: "n-1",
          type: "STEP_DUE",
          title: "1회차 환전일",
          message: "오늘 1회차 환전 예정입니다.",
          createdAt: "2026-09-08T00:00:00Z",
          read: false,
        },
      ],
    });

    await expect(fetchNotifications()).resolves.toEqual([
      {
        id: "n-1",
        type: "STEP_DUE",
        title: "1회차 환전일",
        message: "오늘 1회차 환전 예정입니다.",
        createdAt: "2026-09-08T00:00:00Z",
        read: false,
      },
    ]);
    expect(request).toHaveBeenCalledWith("/api/v1/notifications");
  });

  it("알림이 없으면 빈 배열을 돌려준다", async () => {
    vi.mocked(request).mockResolvedValue({ notifications: [] });

    await expect(fetchNotifications()).resolves.toEqual([]);
  });
});
