import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAdminAiCalls,
  fetchAdminAiUsageSummary,
  type AdminAiCall,
  type AdminAiCallPage,
  type AdminAiUsageSummary,
} from "../../api/admin";
import { ApiError } from "../../api/client";
import {
  ADMIN_AI_CALLS_PAGE_SIZE,
  AdminAiCallsScreen,
} from "./admin-ai-calls-screen";

vi.mock("../../api/admin", () => ({
  fetchAdminAiCalls: vi.fn(),
  fetchAdminAiUsageSummary: vi.fn(),
  ADMIN_AI_PURPOSES: ["narrate", "extract"],
  ADMIN_AI_OUTCOMES: [
    "success",
    "fallback",
    "cache_hit",
    "quota_blocked",
    "error",
  ],
}));

const META = { asOf: "2026-09-08T00:00:00Z" };

const CALL: AdminAiCall = {
  id: "9a1c",
  requestedAt: "2026-09-08T03:00:00Z",
  userId: null,
  isDemo: true,
  purpose: "narrate",
  surface: "forecast_summary",
  model: null,
  inputTokens: 0,
  outputTokens: 0,
  cacheReadInputTokens: null,
  cacheCreationInputTokens: null,
  outcome: "fallback",
  fallbackReason: "provider_error",
  latencyMs: 12,
  errorSummary: null,
};

function callPage(overrides: Partial<AdminAiCallPage> = {}): AdminAiCallPage {
  return {
    items: [CALL],
    page: 0,
    size: ADMIN_AI_CALLS_PAGE_SIZE,
    totalElements: 1,
    totalPages: 1,
    ...overrides,
  };
}

const SUMMARY: AdminAiUsageSummary = {
  buckets: [
    {
      day: "2026-09-08",
      purpose: "narrate",
      model: null,
      calls: 5,
      inputTokens: 0,
      outputTokens: 0,
    },
  ],
};

function resolveBoth(page: AdminAiCallPage = callPage()) {
  vi.mocked(fetchAdminAiUsageSummary).mockResolvedValue({
    data: SUMMARY,
    meta: META,
  });
  vi.mocked(fetchAdminAiCalls).mockResolvedValue({ data: page, meta: META });
}

/** `Array.prototype.at` 은 빌드 tsconfig의 lib 밖이라 인덱스로 꺼낸다. */
function lastCallQuery() {
  const calls = vi.mocked(fetchAdminAiCalls).mock.calls;
  return calls[calls.length - 1]?.[0];
}

function renderScreen(onSelectUser = vi.fn()) {
  return render(
    <AdminAiCallsScreen
      onAuthFailure={vi.fn()}
      onSelectUser={onSelectUser}
    />,
  );
}

beforeEach(() => {
  vi.mocked(fetchAdminAiCalls).mockReset();
  vi.mocked(fetchAdminAiUsageSummary).mockReset();
});

describe("AdminAiCallsScreen", () => {
  it("집계와 행 목록을 함께 불러온다", async () => {
    resolveBoth();
    renderScreen();

    expect(await screen.findByText("AI 사용량 집계")).toBeInTheDocument();
    expect(screen.getByText("AI 호출 로그")).toBeInTheDocument();
    await waitFor(() => expect(fetchAdminAiUsageSummary).toHaveBeenCalled());
    expect(fetchAdminAiCalls).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: ADMIN_AI_CALLS_PAGE_SIZE }),
    );
  });

  it("기간을 UTC 하루 경계로 넓혀 보낸다", async () => {
    resolveBoth();
    renderScreen();

    await waitFor(() => expect(fetchAdminAiUsageSummary).toHaveBeenCalled());
    const [query] = vi.mocked(fetchAdminAiUsageSummary).mock.calls[0]!;
    expect(query.from).toMatch(/T00:00:00Z$/);
    expect(query.to).toMatch(/T23:59:59\.999Z$/);
  });

  it("실 호출이 없는 집계와 null 값 행이 오류 없이 표시된다", async () => {
    resolveBoth();
    renderScreen();

    expect(await screen.findByText(/토큰 0·비용 0이 정상/)).toBeInTheDocument();
    expect(screen.getAllByText("템플릿 (LLM 미호출)").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "-" })).toBeDisabled();
  });

  it("조회 조건을 적용하면 첫 페이지부터 다시 부른다", async () => {
    resolveBoth(callPage({ totalPages: 3 }));
    renderScreen();

    await waitFor(() => expect(fetchAdminAiCalls).toHaveBeenCalledTimes(1));

    fireEvent.click(await screen.findByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(vi.mocked(fetchAdminAiCalls).mock.calls[1]?.[0].page).toBe(1),
    );

    fireEvent.change(screen.getByLabelText("결과 (outcome)"), {
      target: { value: "error" },
    });
    fireEvent.click(screen.getByRole("button", { name: "조회" }));

    await waitFor(() => {
      const last = lastCallQuery();
      expect(last?.page).toBe(0);
      expect(last?.outcome).toBe("error");
    });
  });

  it("데모 필터를 is_demo 값으로 옮긴다", async () => {
    resolveBoth();
    renderScreen();
    await waitFor(() => expect(fetchAdminAiCalls).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("데모 트래픽 (is_demo)"), {
      target: { value: "memberOnly" },
    });
    fireEvent.click(screen.getByRole("button", { name: "조회" }));

    await waitFor(() =>
      expect(lastCallQuery()?.isDemo).toBe(false),
    );
  });

  it("어휘 오타로 400이 나면 서버가 지목한 필드까지 보여준다", async () => {
    vi.mocked(fetchAdminAiUsageSummary).mockResolvedValue({
      data: SUMMARY,
      meta: META,
    });
    vi.mocked(fetchAdminAiCalls).mockRejectedValue(
      new ApiError(
        "outcome 는 success/fallback/cache_hit/quota_blocked/error 중 하나여야 합니다.",
        400,
        "VALIDATION_FAILED",
        "outcome",
      ),
    );
    renderScreen();

    expect(
      await screen.findByText(/outcome 는 success\/fallback/),
    ).toBeInTheDocument();
    expect(screen.getByText("VALIDATION_FAILED")).toBeInTheDocument();
    expect(screen.getByText("outcome")).toBeInTheDocument();
  });

  it("기간이 뒤집혀 400이 나면 집계 쪽에도 사유가 남는다", async () => {
    vi.mocked(fetchAdminAiUsageSummary).mockRejectedValue(
      new ApiError("from 은 to 보다 이후일 수 없습니다.", 400, "VALIDATION_FAILED", "from"),
    );
    vi.mocked(fetchAdminAiCalls).mockResolvedValue({
      data: callPage(),
      meta: META,
    });
    renderScreen();

    expect(
      await screen.findByText("from 은 to 보다 이후일 수 없습니다."),
    ).toBeInTheDocument();
  });

  it("userId가 있는 행에서만 상세로 보낸다", async () => {
    const onSelectUser = vi.fn();
    resolveBoth(callPage({ items: [{ ...CALL, userId: "7c0f" }] }));
    renderScreen(onSelectUser);

    fireEvent.click(await screen.findByRole("button", { name: "7c0f" }));
    expect(onSelectUser).toHaveBeenCalledWith("7c0f");
  });
});
