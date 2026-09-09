import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  noticeColdStart,
  resetColdStartNotice,
} from "../api/cold-start-notice";
import { useColdStartNotice } from "./use-cold-start-notice";

afterEach(() => {
  resetColdStartNotice();
});

describe("useColdStartNotice", () => {
  it("알림이 켜지면 구독 중인 화면에 곧바로 전한다", () => {
    const { result } = renderHook(() => useColdStartNotice());
    expect(result.current).toBe(false);

    act(() => {
      noticeColdStart();
    });

    expect(result.current).toBe(true);
  });
});
