import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminAiCallFilters } from "./admin-ai-call-filters";
import type { AdminAiCallFilterValues } from "./admin-ai-call-query";

const VALUES: AdminAiCallFilterValues = {
  from: "2026-09-02",
  to: "2026-09-08",
  purpose: "",
  outcome: "",
  surface: "",
  demo: "all",
};

describe("AdminAiCallFilters", () => {
  it("어휘 5종을 결과 선택지로 모두 세운다", () => {
    render(
      <AdminAiCallFilters
        values={VALUES}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const outcome = screen.getByLabelText("결과 (outcome)");
    const options = Array.from(
      outcome.querySelectorAll("option"),
      (option) => option.value,
    );
    expect(options).toEqual([
      "",
      "success",
      "fallback",
      "cache_hit",
      "quota_blocked",
      "error",
    ]);
  });

  it("입력을 그대로 위로 올린다", () => {
    const onChange = vi.fn();
    render(
      <AdminAiCallFilters
        values={VALUES}
        onChange={onChange}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("from (UTC 기준 날짜)"), {
      target: { value: "2026-09-01" },
    });
    expect(onChange).toHaveBeenLastCalledWith({ ...VALUES, from: "2026-09-01" });

    fireEvent.change(screen.getByLabelText("to (UTC 기준 날짜)"), {
      target: { value: "2026-09-09" },
    });
    expect(onChange).toHaveBeenLastCalledWith({ ...VALUES, to: "2026-09-09" });

    fireEvent.change(screen.getByLabelText("용도 (purpose)"), {
      target: { value: "extract" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...VALUES,
      purpose: "extract",
    });

    fireEvent.change(screen.getByLabelText("결과 (outcome)"), {
      target: { value: "error" },
    });
    expect(onChange).toHaveBeenLastCalledWith({ ...VALUES, outcome: "error" });

    fireEvent.change(screen.getByLabelText("화면 (surface)"), {
      target: { value: "forecast_summary" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...VALUES,
      surface: "forecast_summary",
    });

    fireEvent.change(screen.getByLabelText("데모 트래픽 (is_demo)"), {
      target: { value: "demoOnly" },
    });
    expect(onChange).toHaveBeenLastCalledWith({ ...VALUES, demo: "demoOnly" });
  });

  it("조회 버튼이 폼 기본 동작 없이 제출한다", () => {
    const onSubmit = vi.fn();
    render(
      <AdminAiCallFilters
        values={VALUES}
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "조회" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
