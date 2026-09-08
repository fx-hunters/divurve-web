import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sparkline } from "./sparkline";

describe("Sparkline", () => {
  it("관측값을 시간순 꺾은선으로 그린다", () => {
    const { container } = render(
      <Sparkline rates={[100, 110, 90]} width={100} height={30} label="추세" />,
    );

    expect(screen.getByRole("img", { name: "추세" })).toBeInTheDocument();
    // 최고값이 위(여백 2), 최저값이 아래(30-2)에 붙고 x는 균등 분할된다.
    expect(container.querySelector("polyline")).toHaveAttribute(
      "points",
      "0.0,15.0 50.0,2.0 100.0,28.0",
    );
  });

  it("점이 하나뿐이면 선이 될 수 없어 아무것도 그리지 않는다", () => {
    const { container } = render(<Sparkline rates={[100]} label="추세" />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("값이 전부 같으면 진폭이 0이라 그리지 않는다", () => {
    const { container } = render(
      <Sparkline rates={[100, 100, 100]} label="추세" />,
    );
    expect(container.querySelector("svg")).toBeNull();
  });

  it("색을 넘기지 않으면 기본 색으로 그린다", () => {
    const { container } = render(<Sparkline rates={[1, 2]} label="추세" />);
    expect(container.querySelector("polyline")).toHaveAttribute(
      "stroke",
      "var(--primary)",
    );
  });
});
