import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton, SkeletonText, type SkeletonShape } from "./skeleton";

describe("Skeleton", () => {
  it("기본은 글 한 줄 모양이고 화면 낭독에서 빠진다", () => {
    const { container } = render(<Skeleton />);

    const bar = container.querySelector(".divurve-skeleton");
    expect(bar).toHaveClass("divurve-skeleton--line");
    expect(bar).toHaveAttribute("aria-hidden", "true");
  });

  it.each(["line", "block", "circle"] as const)(
    "%s 모양을 클래스로 구분한다",
    (shape: SkeletonShape) => {
      const { container } = render(<Skeleton shape={shape} />);

      expect(container.querySelector(".divurve-skeleton")).toHaveClass(
        `divurve-skeleton--${shape}`,
      );
    },
  );

  it("폭과 높이를 주면 그대로 자리를 잡는다", () => {
    const { container } = render(<Skeleton width="9rem" height="2.25rem" />);

    const bar = container.querySelector(".divurve-skeleton");
    expect(bar).toHaveStyle({ width: "9rem", height: "2.25rem" });
  });

  it("폭과 높이를 주지 않으면 인라인 크기를 지정하지 않는다", () => {
    const { container } = render(<Skeleton />);

    const bar = container.querySelector(".divurve-skeleton");
    expect(bar).not.toHaveAttribute("style");
  });

  it("배치용 클래스를 덧붙일 수 있다", () => {
    const { container } = render(<Skeleton className="market-rate" />);

    expect(container.querySelector(".divurve-skeleton")).toHaveClass(
      "market-rate",
    );
  });
});

describe("SkeletonText", () => {
  it("기본은 두 줄이고 마지막 줄만 짧다", () => {
    const { container } = render(<SkeletonText />);

    const bars = container.querySelectorAll(".divurve-skeleton");
    expect(bars).toHaveLength(2);
    expect(bars[0]).not.toHaveAttribute("style");
    expect(bars[1]).toHaveStyle({ width: "60%" });
  });

  it("줄 수와 마지막 줄 폭을 지정할 수 있다", () => {
    const { container } = render(
      <SkeletonText lines={4} lastLineWidth="35%" className="goal-row" />,
    );

    const bars = container.querySelectorAll(".divurve-skeleton");
    expect(bars).toHaveLength(4);
    expect(bars[3]).toHaveStyle({ width: "35%" });
    expect(container.querySelector(".divurve-skeleton-text")).toHaveClass(
      "goal-row",
    );
  });
});
