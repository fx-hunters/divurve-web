import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollSpy } from "./use-scroll-spy";

type ObserverEntry = {
  readonly target: { readonly id: string };
  readonly intersectionRatio: number;
};

const SECTION_IDS = ["features", "how-it-works", "missing-section"];

function appendSection(id: string) {
  const el = document.createElement("section");
  el.id = id;
  document.body.appendChild(el);
  return el;
}

describe("useScrollSpy", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("IntersectionObserver가 없는 환경에서는 활성 섹션 없이 동작한다", () => {
    const { result } = renderHook(() => useScrollSpy(SECTION_IDS));
    expect(result.current.activeSectionId).toBeNull();
  });

  it("DOM에 존재하는 섹션만 관찰하고 가장 많이 노출된 섹션을 활성으로 돌려준다", () => {
    const featuresEl = appendSection("features");
    const howEl = appendSection("how-it-works");

    let notify: (entries: ObserverEntry[]) => void = () => {};
    const observeMock = vi.fn();
    const disconnectMock = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn((cb: (entries: ObserverEntry[]) => void) => {
        notify = cb;
        return { observe: observeMock, disconnect: disconnectMock };
      }),
    );

    const { result, unmount } = renderHook(() => useScrollSpy(SECTION_IDS));

    // DOM에 없는 "missing-section"은 관찰 대상에서 빠진다.
    expect(observeMock).toHaveBeenCalledTimes(2);
    expect(observeMock).toHaveBeenCalledWith(featuresEl);
    expect(observeMock).toHaveBeenCalledWith(howEl);
    expect(result.current.activeSectionId).toBeNull();

    // 첫 섹션이 가장 많이 보이는 경우
    act(() =>
      notify([
        { target: { id: "features" }, intersectionRatio: 0.7 },
        { target: { id: "how-it-works" }, intersectionRatio: 0.2 },
      ]),
    );
    expect(result.current.activeSectionId).toBe("features");

    // 뒤 섹션이 더 많이 보이는 경우
    act(() =>
      notify([
        { target: { id: "features" }, intersectionRatio: 0.1 },
        { target: { id: "how-it-works" }, intersectionRatio: 0.9 },
      ]),
    );
    expect(result.current.activeSectionId).toBe("how-it-works");

    // 모든 섹션이 화면 밖으로 나가면 활성 섹션이 사라진다
    act(() =>
      notify([
        { target: { id: "features" }, intersectionRatio: 0 },
        { target: { id: "how-it-works" }, intersectionRatio: 0 },
      ]),
    );
    expect(result.current.activeSectionId).toBeNull();

    unmount();
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });
});
