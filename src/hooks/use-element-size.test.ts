import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useElementSize } from "./use-element-size";

/** 관찰 대상이 붙기 전·후를 직접 다루려고 훅을 그대로 렌더한다. */
function renderSizeHook() {
  return renderHook(() => useElementSize<HTMLDivElement>());
}

/** jsdom에는 ResizeObserver가 없다. 콜백을 손으로 부를 수 있는 대역을 세운다. */
function installResizeObserver() {
  const disconnect = vi.fn();
  const observe = vi.fn();
  const callbacks: (() => void)[] = [];

  class FakeResizeObserver {
    constructor(callback: () => void) {
      callbacks.push(callback);
    }
    observe = observe;
    disconnect = disconnect;
    unobserve = vi.fn();
  }

  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  return { observe, disconnect, trigger: () => callbacks.forEach((run) => run()) };
}

/** 원하는 렌더 크기를 답하는 요소. jsdom은 항상 0을 준다. */
function sizedElement(rect: { width: number; height: number }) {
  const element = document.createElement("div");
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(rect as DOMRect);
  return element;
}

describe("useElementSize", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("관찰 대상이 붙기 전에는 크기가 없다", () => {
    installResizeObserver();
    const { result } = renderSizeHook();
    expect(result.current.size).toBeNull();
  });

  it("ResizeObserver가 없어도 붙는 즉시 한 번은 잰다", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const { result } = renderSizeHook();

    act(() => result.current.ref(sizedElement({ width: 552, height: 380 })));

    expect(result.current.size).toEqual({ width: 552, height: 380 });
  });

  it("관찰 대상이 붙으면 바로 재고, 이후 변화도 따라간다", () => {
    const { observe, trigger } = installResizeObserver();
    const { result } = renderSizeHook();
    const element = sizedElement({ width: 552, height: 380 });
    const measure = vi.spyOn(element, "getBoundingClientRect");

    act(() => result.current.ref(element));

    expect(observe).toHaveBeenCalledWith(element);
    expect(result.current.size).toEqual({ width: 552, height: 380 });

    measure.mockReturnValue({ width: 552, height: 207 } as DOMRect);
    act(() => trigger());

    expect(result.current.size).toEqual({ width: 552, height: 207 });
  });

  it("소수점 픽셀은 버리고, 크기가 그대로면 같은 객체를 유지한다", () => {
    const { trigger } = installResizeObserver();
    const { result } = renderSizeHook();

    act(() => result.current.ref(sizedElement({ width: 552.4, height: 253.18 })));

    const first = result.current.size;
    expect(first).toEqual({ width: 552, height: 253 });

    act(() => trigger());

    expect(result.current.size).toBe(first);
  });

  it("관찰을 그만두면 옵서버를 끊는다", () => {
    const { disconnect } = installResizeObserver();
    const { result, unmount } = renderSizeHook();

    act(() => result.current.ref(document.createElement("div")));
    unmount();

    expect(disconnect).toHaveBeenCalled();
  });
});
