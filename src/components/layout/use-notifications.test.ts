import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import {
  fetchNotifications,
  type NotificationItem,
} from "../../api/notifications";
import {
  toNotificationsErrorMessage,
  useNotifications,
} from "./use-notifications";

vi.mock("../../api/notifications", () => ({ fetchNotifications: vi.fn() }));

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const NOTIFICATION = {
  id: "n-1",
  type: "STEP_DUE",
  title: "1회차 환전일",
  message: "오늘 1회차 환전 예정입니다.",
  createdAt: "2026-09-08T00:00:00Z",
  read: false,
};

describe("toNotificationsErrorMessage", () => {
  it("ApiError는 백엔드 메시지를 그대로 쓰고, 그 밖의 오류는 기본 문구를 쓴다", () => {
    expect(
      toNotificationsErrorMessage(new ApiError("토큰이 만료됐습니다", 401)),
    ).toBe("토큰이 만료됐습니다");
    expect(toNotificationsErrorMessage(new Error("boom"))).toBe(
      "알림을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
    );
  });
});

describe("useNotifications", () => {
  beforeEach(() => {
    // 화살표 함수가 목을 그대로 돌려주면 vitest가 이를 teardown 콜백으로 보고
    // 테스트 종료 시 호출한다. 블록 본문으로 반환값을 끊는다.
    vi.mocked(fetchNotifications).mockReset();
  });

  it("비활성 상태에서는 조회하지 않는다", () => {
    const { result } = renderHook(() => useNotifications(false));

    expect(result.current).toEqual({ status: "idle" });
    expect(fetchNotifications).not.toHaveBeenCalled();
  });

  it("활성화되면 조회하고 성공 상태를 돌려준다", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([NOTIFICATION]);
    const { result } = renderHook(() => useNotifications(true));

    expect(result.current).toEqual({ status: "loading" });
    await waitFor(() =>
      expect(result.current).toEqual({
        status: "success",
        notifications: [NOTIFICATION],
      }),
    );
  });

  it("실패하면 오류 상태를 돌려준다", async () => {
    vi.mocked(fetchNotifications).mockRejectedValue(
      new ApiError("로그인이 필요한 요청입니다.", 401),
    );
    const { result } = renderHook(() => useNotifications(true));

    await waitFor(() =>
      expect(result.current).toEqual({
        status: "error",
        message: "로그인이 필요한 요청입니다.",
      }),
    );
  });

  it("다시 닫히면 대기 상태로 되돌아간다", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([]);
    const { result, rerender } = renderHook(
      ({ isEnabled }: { isEnabled: boolean }) => useNotifications(isEnabled),
      { initialProps: { isEnabled: true } },
    );

    await waitFor(() =>
      expect(result.current).toEqual({ status: "success", notifications: [] }),
    );

    rerender({ isEnabled: false });
    expect(result.current).toEqual({ status: "idle" });
  });

  it("응답 도착 전에 언마운트되면 상태를 갱신하지 않는다", async () => {
    let resolveFetch!: (items: readonly NotificationItem[]) => void;
    vi.mocked(fetchNotifications).mockReturnValue(
      new Promise<readonly NotificationItem[]>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const { unmount } = renderHook(() => useNotifications(true));

    unmount();
    resolveFetch([]);
    await flushMicrotasks();
  });

  it("응답 실패 전에 언마운트되면 오류 상태도 남기지 않는다", async () => {
    let rejectFetch!: (error: Error) => void;
    vi.mocked(fetchNotifications).mockReturnValue(
      new Promise<readonly NotificationItem[]>((_resolve, reject) => {
        rejectFetch = reject;
      }),
    );
    const { unmount } = renderHook(() => useNotifications(true));

    unmount();
    rejectFetch(new Error("late"));
    await flushMicrotasks();
  });
});
