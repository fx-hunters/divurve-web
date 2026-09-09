import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminDashboardScreen } from "./admin-dashboard-screen";

describe("AdminDashboardScreen", () => {
  it("진입할 자리를 세우고 아직 지표가 없다고 알린다", () => {
    render(<AdminDashboardScreen onAuthFailure={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "운영 현황" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/지표를 붙이는 중/)).toBeInTheDocument();
  });

  it("껍데기라 인증 실패를 위로 알리지 않는다", () => {
    const onAuthFailure = vi.fn();

    render(<AdminDashboardScreen onAuthFailure={onAuthFailure} />);

    expect(onAuthFailure).not.toHaveBeenCalled();
  });
});
