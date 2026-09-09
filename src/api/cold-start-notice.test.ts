import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COLD_START_THRESHOLD_MS,
  getColdStartNotice,
  noticeColdStart,
  resetColdStartNotice,
  subscribeColdStartNotice,
} from "./cold-start-notice";

afterEach(() => {
  resetColdStartNotice();
});

describe("콜드 스타트 알림 상태", () => {
  it("처음에는 꺼져 있고 임계 시간은 양수다", () => {
    expect(getColdStartNotice()).toBe(false);
    expect(COLD_START_THRESHOLD_MS).toBeGreaterThan(0);
  });

  it("알림을 켜면 구독자에게 한 번만 전한다", () => {
    const listener = vi.fn();
    subscribeColdStartNotice(listener);

    noticeColdStart();
    noticeColdStart();

    expect(getColdStartNotice()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("구독을 끊으면 더 이상 알리지 않는다", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeColdStartNotice(listener);
    unsubscribe();

    noticeColdStart();

    expect(listener).not.toHaveBeenCalled();
  });
});
