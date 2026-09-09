import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboardScreen } from "./admin-dashboard-screen";
import { fetchAdminAiCalls, fetchAdminRefreshStatus } from "../../../api/admin";
import { fetchAdminFxGaps } from "../../../api/admin-fx-gaps";

vi.mock("../../../api/admin", () => ({
  fetchAdminAiCalls: vi.fn(),
  fetchAdminRefreshStatus: vi.fn(),
}));
vi.mock("../../../api/admin-fx-gaps", () => ({
  fetchAdminFxGaps: vi.fn(),
}));

const META = { asOf: "2026-09-09T00:00:00Z", dataState: "live", sources: [] };

function callPage(totalElements: number) {
  return {
    data: { items: [], page: 0, size: 1, totalElements, totalPages: 1 },
    meta: META,
  };
}

beforeEach(() => {
  vi.mocked(fetchAdminAiCalls).mockImplementation((query) =>
    Promise.resolve(
      (query.outcome === "error" ? callPage(3) : callPage(12)) as never,
    ),
  );
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
    expect(await screen.findByText("12건")).toBeInTheDocument();
    expect(screen.getByText("3건")).toBeInTheDocument();
    expect(screen.getByText("25.0%")).toBeInTheDocument();
    expect(await screen.findByText("결측 2영업일")).toBeInTheDocument();
    expect(screen.getByText("1 / 1 미완전")).toBeInTheDocument();
  });

  it("총 호출과 실패를 각각 서버에서 센다", async () => {
    render(<AdminDashboardScreen onAuthFailure={vi.fn()} />);

    await waitFor(() => {
      expect(fetchAdminAiCalls).toHaveBeenCalledWith({ page: 0, size: 1 });
    });
    expect(fetchAdminAiCalls).toHaveBeenCalledWith({
      page: 0,
      size: 1,
      outcome: "error",
    });
  });

  it("카드 하나가 실패해도 나머지는 그대로 선다", async () => {
    vi.mocked(fetchAdminFxGaps).mockRejectedValue(new Error("끊김"));

    render(<AdminDashboardScreen onAuthFailure={vi.fn()} />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    // AI 카드와 수집 카드는 살아 있다.
    expect(await screen.findByText("12건")).toBeInTheDocument();
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
