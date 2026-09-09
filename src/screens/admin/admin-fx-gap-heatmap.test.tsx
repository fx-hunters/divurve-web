import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminFxGapHeatmap } from "./admin-fx-gap-heatmap";

describe("AdminFxGapHeatmap", () => {
  it("진입할 자리를 세우고 아직 그림이 없다고 알린다", () => {
    render(<AdminFxGapHeatmap onAuthFailure={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "환율 결측" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/결측 구간을 그리는 중/)).toBeInTheDocument();
  });

  it("껍데기라 조회를 걸지 않는다", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminFxGapHeatmap onAuthFailure={vi.fn()} />);

    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
