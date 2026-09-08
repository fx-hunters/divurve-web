import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AdminAiCall, AdminAiCallPage } from "../../api/admin";
import { AdminAiCallTable } from "./admin-ai-call-table";

function call(overrides: Partial<AdminAiCall>): AdminAiCall {
  return {
    id: "9a1c",
    requestedAt: "2026-09-08T03:00:00Z",
    userId: "7c0f",
    isDemo: true,
    purpose: "narrate",
    surface: "forecast_summary",
    model: "claude-opus-5",
    inputTokens: 120,
    outputTokens: 45,
    cacheReadInputTokens: null,
    cacheCreationInputTokens: null,
    outcome: "success",
    fallbackReason: null,
    latencyMs: 4321,
    errorSummary: null,
    ...overrides,
  };
}

function listing(overrides: Partial<AdminAiCallPage>): AdminAiCallPage {
  return {
    items: [call({})],
    page: 0,
    size: 50,
    totalElements: 1,
    totalPages: 1,
    ...overrides,
  };
}

function renderTable(overrides: {
  readonly listing?: AdminAiCallPage;
  readonly currentPage?: number;
  readonly onChangePage?: (page: number) => void;
  readonly onSelectUser?: (userId: string) => void;
}) {
  return render(
    <AdminAiCallTable
      listing={overrides.listing ?? listing({})}
      currentPage={overrides.currentPage ?? 0}
      size={50}
      onChangePage={overrides.onChangePage ?? vi.fn()}
      onSelectUser={overrides.onSelectUser ?? vi.fn()}
    />,
  );
}

describe("AdminAiCallTable", () => {
  it("requestedAt 헤더에 표시 시간대를 밝힌다", () => {
    renderTable({});

    expect(
      screen.getByRole("columnheader", { name: "requestedAt (KST)" }),
    ).toBeInTheDocument();
    // 03:00Z 는 서울 기준 같은 날 12:00 이다.
    expect(screen.getByText("26.09.08 12:00")).toBeInTheDocument();
  });

  it("userId가 있으면 상세로 보낸다", () => {
    const onSelectUser = vi.fn();
    renderTable({ onSelectUser });

    fireEvent.click(screen.getByRole("button", { name: "7c0f" }));
    expect(onSelectUser).toHaveBeenCalledWith("7c0f");
  });

  it("userId가 null이면 링크를 누를 수 없다", () => {
    renderTable({ listing: listing({ items: [call({ userId: null })] }) });

    const cell = screen.getByRole("button", { name: "-" });
    expect(cell).toBeDisabled();
  });

  it("model이 null인 행은 LLM 미호출로 표시한다", () => {
    renderTable({
      listing: listing({
        items: [call({ model: null, inputTokens: 0, outputTokens: 0 })],
      }),
    });

    expect(screen.getByText("템플릿 (LLM 미호출)")).toBeInTheDocument();
  });

  it("outcome 어휘를 배지로 세운다", () => {
    renderTable({
      listing: listing({
        items: [
          call({ id: "1", outcome: "fallback", fallbackReason: "provider_error" }),
          call({ id: "2", outcome: "quota_blocked" }),
          call({ id: "3", outcome: "throttled" }),
        ],
      }),
    });

    expect(screen.getByText("fallback (템플릿 대체)")).toBeInTheDocument();
    expect(screen.getByText("quota_blocked (쿼터 차단)")).toBeInTheDocument();
    // 어휘 밖의 값도 원문 그대로 남는다 — 화면이 깨지지 않는다.
    expect(screen.getByText("throttled")).toBeInTheDocument();
    expect(screen.getByText("provider_error")).toBeInTheDocument();
  });

  it("서버가 준 페이지 정보를 그대로 보여주고 페이지를 넘긴다", () => {
    const onChangePage = vi.fn();
    renderTable({
      listing: listing({ totalPages: 3, totalElements: 130 }),
      currentPage: 1,
      onChangePage,
    });

    expect(screen.getByText("130")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(onChangePage).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    expect(onChangePage).toHaveBeenCalledWith(0);
  });

  it("첫 페이지이고 다음이 없으면 양쪽 버튼을 잠근다", () => {
    renderTable({ listing: listing({ totalPages: 1 }) });

    expect(screen.getByRole("button", { name: "이전" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
  });

  it("행이 없으면 조건에 걸린 것이 없다고 알린다", () => {
    renderTable({ listing: listing({ items: [], totalPages: 0 }) });

    expect(
      screen.getByText("이 조건에 해당하는 호출이 없습니다."),
    ).toBeInTheDocument();
  });

  it("isDemo가 아닌 행은 배지 대신 값을 그대로 둔다", () => {
    renderTable({ listing: listing({ items: [call({ isDemo: false })] }) });

    expect(screen.getByText("false")).toBeInTheDocument();
    expect(screen.queryByText("demo")).toBeNull();
  });
});
