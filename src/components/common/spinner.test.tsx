import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "./spinner";

describe("Spinner", () => {
  it("기본 크기와 기본 문구로 원형 스피너를 렌더한다", () => {
    const { container } = render(<Spinner />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-label", "불러오는 중");

    const svg = container.querySelector(".divurve-spinner__icon");
    expect(svg).toHaveAttribute("width", "28");
    expect(svg).toHaveAttribute("height", "28");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("size와 label을 전달하면 그 값을 사용한다", () => {
    const { container } = render(<Spinner size={16} label="환율 불러오는 중" />);

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "환율 불러오는 중",
    );

    const svg = container.querySelector(".divurve-spinner__icon");
    expect(svg).toHaveAttribute("width", "16");
    expect(svg).toHaveAttribute("height", "16");
  });

  it("색상은 토큰만 사용한다", () => {
    const { container } = render(<Spinner />);

    expect(container.querySelector("circle")).toHaveAttribute(
      "stroke",
      "var(--border)",
    );
    expect(container.querySelector("path")).toHaveAttribute(
      "stroke",
      "var(--primary)",
    );
  });
});
