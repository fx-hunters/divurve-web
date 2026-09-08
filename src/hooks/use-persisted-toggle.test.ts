import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePersistedToggle } from "./use-persisted-toggle";

const KEY = "divurve_test_toggle";

describe("usePersistedToggle", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("저장된 값이 없으면 기본값으로 시작한다", () => {
    const { result } = renderHook(() => usePersistedToggle(KEY, true));
    expect(result.current.isOpen).toBe(true);
  });

  it("접으면 선택을 저장하고, 다시 마운트해도 접힌 채로 시작한다", () => {
    const first = renderHook(() => usePersistedToggle(KEY, true));

    act(() => first.result.current.toggle());

    expect(first.result.current.isOpen).toBe(false);
    expect(localStorage.getItem(KEY)).toBe("closed");

    const second = renderHook(() => usePersistedToggle(KEY, true));
    expect(second.result.current.isOpen).toBe(false);

    act(() => second.result.current.toggle());

    expect(second.result.current.isOpen).toBe(true);
    expect(localStorage.getItem(KEY)).toBe("open");
  });

  it("펼침을 저장한 뒤에는 기본값이 접힘이어도 펼쳐서 시작한다", () => {
    localStorage.setItem(KEY, "open");
    const { result } = renderHook(() => usePersistedToggle(KEY, false));
    expect(result.current.isOpen).toBe(true);
  });

  it("알 수 없는 저장 값은 무시하고 기본값을 쓴다", () => {
    localStorage.setItem(KEY, "maybe");
    const { result } = renderHook(() => usePersistedToggle(KEY, false));
    expect(result.current.isOpen).toBe(false);
  });

  it("키가 없으면 저장하지 않지만 토글은 그대로 동작한다", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => usePersistedToggle(undefined, true));

    act(() => result.current.toggle());

    expect(result.current.isOpen).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("localStorage가 막혀 있어도 기본값으로 동작한다", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });

    const { result } = renderHook(() => usePersistedToggle(KEY, true));
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(false);
  });
});
