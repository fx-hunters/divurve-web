import { beforeEach, describe, expect, it, vi } from "vitest";
import { NOTIFICATIONS_FIXTURE } from "../test/api-fixtures";
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
    // 2026-09-08 데모 세션으로 받은 실제 응답(언래핑·camelCase 변환 후) 그대로.
    vi.mocked(request).mockResolvedValue({
      notifications: NOTIFICATIONS_FIXTURE,
    });

    await expect(fetchNotifications()).resolves.toEqual([
      {
        id: "0fc0bc6e-9277-4ed3-8d98-4b10ee2eb802",
        kind: "target_zone",
        title: "목표 구간에 가까워지고 있어요",
        body: "미국 대학원 학비 목표가 목표 금액의 약 70%에 도달했습니다.",
        createdAt: "2026-09-08T04:26:39.969510Z",
        isRead: false,
      },
    ]);
    expect(request).toHaveBeenCalledWith("/api/v1/notifications");
  });

  it("알림이 없으면 빈 배열을 돌려준다", async () => {
    vi.mocked(request).mockResolvedValue({ notifications: [] });

    await expect(fetchNotifications()).resolves.toEqual([]);
  });
});
