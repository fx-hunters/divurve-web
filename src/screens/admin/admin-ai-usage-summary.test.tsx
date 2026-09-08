import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AdminAiUsageBucket } from "../../api/admin";
import { AdminAiUsageSummaryTable } from "./admin-ai-usage-summary";

function bucket(overrides: Partial<AdminAiUsageBucket>): AdminAiUsageBucket {
  return {
    day: "2026-09-08",
    purpose: "narrate",
    model: "claude-opus-5",
    calls: 3,
    inputTokens: 300,
    outputTokens: 120,
    ...overrides,
  };
}

describe("AdminAiUsageSummaryTable", () => {
  it("day 헤더에 기준 시간대를 밝힌다", () => {
    render(<AdminAiUsageSummaryTable buckets={[bucket({})]} />);

    expect(
      screen.getByRole("columnheader", { name: "day (UTC 기준)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2026-09-08")).toBeInTheDocument();
    expect(screen.getByText("claude-opus-5")).toBeInTheDocument();
  });

  it("실 호출이 없는 상태를 미연결이 아니라고 안내한다", () => {
    render(
      <AdminAiUsageSummaryTable
        buckets={[bucket({ model: null, inputTokens: 0, outputTokens: 0 })]}
      />,
    );

    expect(screen.getByText(/토큰 0·비용 0이 정상/)).toBeInTheDocument();
    expect(screen.getByText("템플릿 (LLM 미호출)")).toBeInTheDocument();
  });

  it("실 호출이 섞여 있으면 안내를 띄우지 않는다", () => {
    render(
      <AdminAiUsageSummaryTable
        buckets={[bucket({}), bucket({ model: null })]}
      />,
    );

    expect(screen.queryByText(/토큰 0·비용 0이 정상/)).toBeNull();
  });

  it("집계가 비면 그 사실을 알린다", () => {
    render(<AdminAiUsageSummaryTable buckets={[]} />);
    expect(
      screen.getByText("이 기간에 집계된 호출이 없습니다."),
    ).toBeInTheDocument();
  });
});
