import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  noticeColdStart,
  resetColdStartNotice,
} from "../../api/cold-start-notice";
import { ColdStartBanner } from "./cold-start-banner";

const BANNER_HEIGHT_TOKEN = "--cold-start-banner-height";

function stubMeasuredHeight(height: number) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 1024,
    height,
  } as DOMRect);
}

afterEach(() => {
  resetColdStartNotice();
  document.documentElement.style.removeProperty(BANNER_HEIGHT_TOKEN);
  vi.restoreAllMocks();
});

describe("ColdStartBanner", () => {
  it("알림이 꺼져 있으면 아무것도 그리지 않는다", () => {
    render(<ColdStartBanner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("알림이 켜지면 기다리라는 안내를 띄운다", () => {
    render(<ColdStartBanner />);

    act(() => {
      noticeColdStart();
    });

    expect(screen.getByRole("status")).toHaveTextContent("서버를 깨우는 중입니다");
  });

  it("잰 높이를 토큰에 적고, 사라질 때 되돌린다", () => {
    stubMeasuredHeight(48);
    noticeColdStart();
    const { unmount } = render(<ColdStartBanner />);

    expect(
      document.documentElement.style.getPropertyValue(BANNER_HEIGHT_TOKEN),
    ).toBe("48px");

    unmount();

    expect(
      document.documentElement.style.getPropertyValue(BANNER_HEIGHT_TOKEN),
    ).toBe("");
  });

  it("아직 잴 수 없으면 토큰을 건드리지 않는다", () => {
    noticeColdStart();
    render(<ColdStartBanner />);

    expect(
      document.documentElement.style.getPropertyValue(BANNER_HEIGHT_TOKEN),
    ).toBe("");
  });
});
