import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Icon, type IconName } from "./icon";

describe("Icon", () => {
  const iconNames: IconName[] = [
    "home",
    "planner",
    "assets",
    "range",
    "mypage",
    "sun",
    "moon",
    "bell",
    "user",
    "shield",
    "alertTriangle",
    "checkCircle",
    "trendingUp",
    "trendingDown",
    "database",
    "sparkles",
    "arrowRight",
    "chevronDown",
    "edit",
    "trash",
    "check",
    "eye",
    "eyeOff",
    "x",
    "alertCircle",
    "logIn",
    "logOut",
  ];

  it.each(iconNames)("%s 아이콘이 렌더링된다", (name) => {
    const { container } = render(<Icon name={name} size={24} className="test-icon" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
    expect(svg).toHaveClass("test-icon");
  });

  it("aria-label이 제공되면 role='img'가 부여된다", () => {
    const { getByRole } = render(<Icon name="home" aria-label="홈 아이콘" />);
    const icon = getByRole("img", { name: "홈 아이콘" });
    expect(icon).toBeInTheDocument();
  });

  it("정의되지 않은 이름일 경우 null을 반환한다", () => {
    // @ts-expect-error invalid icon name test
    const { container } = render(<Icon name="unknown-icon" />);
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });
});
