import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboardScreen } from "./admin-dashboard-screen";
import {
  fetchAdminAiCalls,
  fetchAdminAiUsageSummary,
  fetchAdminCurrencies,
  fetchAdminRefreshStatus,
  fetchAdminUsers,
} from "../../../api/admin";
import { fetchAdminFxGaps } from "../../../api/admin-fx-gaps";

// 실제 모듈을 살려 둔다 — 카드가 어휘 상수(ADMIN_AI_OUTCOMES 등)도 함께 쓴다.
vi.mock("../../../api/admin", async () => {
  const actual =
    await vi.importActual<typeof import("../../../api/admin")>(
      "../../../api/admin",
    );
  return {
    ...actual,
    fetchAdminAiCalls: vi.fn(),
    fetchAdminRefreshStatus: vi.fn(),
    fetchAdminUsers: vi.fn(),
    fetchAdminAiUsageSummary: vi.fn(),
    fetchAdminCurrencies: vi.fn(),
  };
});
vi.mock("../../../api/admin-fx-gaps", () => ({
  fetchAdminFxGaps: vi.fn(),
}));

const META = { asOf: "2026-09-09T00:00:00Z", dataState: "live", sources: [] };

/** 카드 제목으로 그 카드만 집는다 — 같은 문구가 여러 카드에 나온다. */
function card(title: string) {
  return screen.getByRole("heading", { name: title }).closest("section")!;
}

function callPage(totalElements: number) {
  return {
    data: { items: [], page: 0, size: 1, totalElements, totalPages: 1 },
    meta: META,
  };
}

beforeEach(() => {
  vi.mocked(fetchAdminAiCalls).mockImplementation((query) => {
    if (query.outcome === "error") return Promise.resolve(callPage(3) as never);
    if (query.outcome === "fallback") {
      return Promise.resolve(callPage(4) as never);
    }
    return Promise.resolve(callPage(12) as never);
  });
  vi.mocked(fetchAdminRefreshStatus).mockResolvedValue({
    data: {
      fx: {
        lastFetchedAt: "2026-09-09T00:00:00Z",
        lastQuoteDate: "2026-09-08",
        pairs: [
          {
            pairCode: "USDKRW",
            lastFetchedAt: "2026-09-09T00:00:00Z",
            lastQuoteDate: "2026-09-08",
          },
        ],
      },
      macro: { lastRefreshedAt: "2026-09-08T00:00:00Z" },
    },
    meta: META,
  } as never);
  vi.mocked(fetchAdminUsers).mockResolvedValue({
    data: { items: [], page: 0, size: 1, totalElements: 10, totalPages: 1 },
    meta: META,
  } as never);
  vi.mocked(fetchAdminAiUsageSummary).mockResolvedValue({
    data: { buckets: [] },
    meta: META,
  } as never);
  vi.mocked(fetchAdminCurrencies).mockResolvedValue({
    data: { currencies: [], currencyPairs: [] },
    meta: META,
  } as never);
  vi.mocked(fetchAdminFxGaps).mockResolvedValue({
    data: {
      pairs: [
        {
          pairCode: "USDKRW",
          rateType: "mid",
          from: "2026-01-01",
          to: "2026-01-31",
          expectedBusinessDays: 22,
          coveredBusinessDays: 20,
          missingBusinessDays: 2,
          coverageRatio: 0.9,
          complete: false,
          gaps: [],
        },
      ],
    },
    meta: META,
  } as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AdminDashboardScreen", () => {
  it("카드 셋을 세우고 각자 값을 채운다", async () => {
    render(<AdminDashboardScreen onAuthFailure={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "운영 현황" }),
    ).toBeInTheDocument();
    await screen.findAllByText("12건");
    const aiCard = within(card("AI 호출"));
    expect(aiCard.getByText("3건")).toBeInTheDocument();
    expect(aiCard.getByText("25.0%")).toBeInTheDocument();
    expect(aiCard.getByText("4건")).toBeInTheDocument();
    expect(await screen.findByText("결측 2영업일")).toBeInTheDocument();
    expect(screen.getByText("1 / 1 미완전")).toBeInTheDocument();
  });

  it("총 호출·실패·템플릿 대체를 각각 서버에서 센다", async () => {
    render(<AdminDashboardScreen onAuthFailure={vi.fn()} />);

    await waitFor(() => {
      expect(fetchAdminAiCalls).toHaveBeenCalledWith({ page: 0, size: 1 });
    });
    expect(fetchAdminAiCalls).toHaveBeenCalledWith({
      page: 0,
      size: 1,
      outcome: "error",
    });
    expect(fetchAdminAiCalls).toHaveBeenCalledWith({
      page: 0,
      size: 1,
      outcome: "fallback",
    });
  });

  it("전부 템플릿으로 나갔으면 실패 0건이어도 그 사실을 알린다", async () => {
    vi.mocked(fetchAdminAiCalls).mockImplementation((query) => {
      if (query.outcome === "error") {
        return Promise.resolve(callPage(0) as never);
      }
      return Promise.resolve(callPage(295) as never);
    });

    render(<AdminDashboardScreen onAuthFailure={vi.fn()} />);

    expect(
      await screen.findByText(/모든 호출이 템플릿으로 나갔습니다/),
    ).toBeInTheDocument();
  });

  it("서버가 아직 열지 않은 지표는 붉은 에러 대신 준비 중으로 둔다", async () => {
    const { ApiError } = await import("../../../api/client");
    vi.mocked(fetchAdminRefreshStatus).mockRejectedValue(
      new ApiError("요청한 리소스를 찾을 수 없습니다.", 404, "NOT_FOUND"),
    );

    render(<AdminDashboardScreen onAuthFailure={vi.fn()} />);

    expect(await screen.findByText("준비 중")).toBeInTheDocument();
    expect(
      screen.getByText("서버가 아직 제공하지 않습니다."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("카드 하나가 실패해도 나머지는 그대로 선다", async () => {
    vi.mocked(fetchAdminFxGaps).mockRejectedValue(new Error("끊김"));

    render(<AdminDashboardScreen onAuthFailure={vi.fn()} />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    // AI 카드와 수집 카드는 살아 있다.
    expect((await screen.findAllByText("12건")).length).toBeGreaterThan(0);
    expect(screen.getByText("2026-09-08")).toBeInTheDocument();
  });

  it("한 번도 받지 못한 통화쌍을 알린다", async () => {
    vi.mocked(fetchAdminRefreshStatus).mockResolvedValue({
      data: {
        fx: {
          lastFetchedAt: null,
          lastQuoteDate: null,
          pairs: [
            { pairCode: "CNYKRW", lastFetchedAt: null, lastQuoteDate: null },
          ],
        },
        macro: { lastRefreshedAt: null },
      },
      meta: META,
    } as never);

    render(<AdminDashboardScreen onAuthFailure={vi.fn()} />);

    expect(
      await screen.findByText(/한 번도 받지 못한 통화쌍: CNYKRW/),
    ).toBeInTheDocument();
  });

  it("결측이 없으면 미완전 통화쌍을 나열하지 않는다", async () => {
    vi.mocked(fetchAdminFxGaps).mockResolvedValue({
      data: {
        pairs: [
          {
            pairCode: "USDKRW",
            rateType: "mid",
            from: "2026-01-01",
            to: "2026-01-31",
            expectedBusinessDays: 22,
            coveredBusinessDays: 22,
            missingBusinessDays: 0,
            coverageRatio: 1,
            complete: true,
            gaps: [],
          },
        ],
      },
      meta: META,
    } as never);

    render(<AdminDashboardScreen onAuthFailure={vi.fn()} />);

    expect(await screen.findByText("결측 0영업일")).toBeInTheDocument();
    expect(screen.getByText("0 / 1 미완전")).toBeInTheDocument();
  });

  it("저장 대상 통화쌍이 없으면 0으로 센다", async () => {
    vi.mocked(fetchAdminFxGaps).mockResolvedValue({
      data: { pairs: [] },
      meta: META,
    } as never);

    render(<AdminDashboardScreen onAuthFailure={vi.fn()} />);

    expect(await screen.findByText("결측 0영업일")).toBeInTheDocument();
    expect(screen.getByText("0 / 0 미완전")).toBeInTheDocument();
  });
});
