import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignupCard } from "./signup-card";
import { AiOutcomeCard } from "./ai-outcome-card";
import { AiTokenTrendCard } from "./ai-token-trend-card";
import { CurrencyCard } from "./currency-card";
import {
  fetchAdminAiCalls,
  fetchAdminAiUsageSummary,
  fetchAdminCurrencies,
  fetchAdminUsers,
} from "../../../../api/admin";

vi.mock("../../../../api/admin", async () => {
  const actual = await vi.importActual<typeof import("../../../../api/admin")>(
    "../../../../api/admin",
  );
  return {
    ...actual,
    fetchAdminUsers: vi.fn(),
    fetchAdminAiCalls: vi.fn(),
    fetchAdminAiUsageSummary: vi.fn(),
    fetchAdminCurrencies: vi.fn(),
  };
});

const META = { asOf: "2026-09-09T00:00:00Z", dataState: "live", sources: [] };
const ok = (data: unknown) => ({ data, meta: META });
const page = (totalElements: number) =>
  ok({ items: [], page: 0, size: 1, totalElements, totalPages: 1 });

afterEach(() => {
  vi.clearAllMocks();
});

describe("SignupCard", () => {
  beforeEach(() => {
    vi.mocked(fetchAdminUsers).mockImplementation((query) => {
      if (query.isDemo === false) return Promise.resolve(page(7) as never);
      if (query.isDemo === true) return Promise.resolve(page(3) as never);
      return Promise.resolve(page(10) as never);
    });
  });

  it("총계·실계정·데모를 각각 서버에서 센다", async () => {
    render(<SignupCard onAuthFailure={vi.fn()} />);

    expect(await screen.findByText("10명")).toBeInTheDocument();
    expect(screen.getByText("7명")).toBeInTheDocument();
    expect(screen.getByText("3명")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchAdminUsers).toHaveBeenCalledWith({ page: 0, size: 1 });
    });
    expect(fetchAdminUsers).toHaveBeenCalledWith({
      page: 0,
      size: 1,
      isDemo: false,
    });
  });

  it("실패하면 사유를 띄운다", async () => {
    vi.mocked(fetchAdminUsers).mockRejectedValue(new Error("끊김"));

    render(<SignupCard onAuthFailure={vi.fn()} />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

describe("AiOutcomeCard", () => {
  beforeEach(() => {
    vi.mocked(fetchAdminAiCalls).mockImplementation((query) => {
      if (query.outcome === undefined) return Promise.resolve(page(20) as never);
      if (query.outcome === "success") return Promise.resolve(page(12) as never);
      if (query.outcome === "fallback") return Promise.resolve(page(5) as never);
      return Promise.resolve(page(1) as never);
    });
  });

  it("결과 5종을 라벨과 건수로 세운다", async () => {
    render(<AiOutcomeCard onAuthFailure={vi.fn()} />);

    expect(await screen.findByText("20건")).toBeInTheDocument();
    expect(
      screen.getByText("success (실 호출 성공)"),
    ).toBeInTheDocument();
    expect(screen.getByText("fallback (템플릿 대체)")).toBeInTheDocument();
    expect(screen.getByText("quota_blocked (쿼터 차단)")).toBeInTheDocument();
    expect(await screen.findByText("12건")).toBeInTheDocument();
  });

  it("결과 종류마다 따로 센다", async () => {
    render(<AiOutcomeCard onAuthFailure={vi.fn()} />);

    await waitFor(() => {
      expect(fetchAdminAiCalls).toHaveBeenCalledWith({
        page: 0,
        size: 1,
        outcome: "quota_blocked",
      });
    });
  });
});

describe("AiTokenTrendCard", () => {
  it("일자별 토큰을 차트로 세운다", async () => {
    vi.mocked(fetchAdminAiUsageSummary).mockResolvedValue(
      ok({
        buckets: [
          {
            day: "2026-09-01",
            purpose: "narrate",
            model: "claude-opus-5",
            calls: 2,
            inputTokens: 100,
            outputTokens: 40,
          },
        ],
      }) as never,
    );

    render(<AiTokenTrendCard onAuthFailure={vi.fn()} />);

    expect(
      await screen.findByRole("img", { name: "일자별 AI 토큰 사용량" }),
    ).toBeInTheDocument();
  });

  it("전부 템플릿이면 토큰 0이 정상이라고 알린다", async () => {
    vi.mocked(fetchAdminAiUsageSummary).mockResolvedValue(
      ok({
        buckets: [
          {
            day: "2026-09-01",
            purpose: "narrate",
            model: null,
            calls: 2,
            inputTokens: 0,
            outputTokens: 0,
          },
        ],
      }) as never,
    );

    render(<AiTokenTrendCard onAuthFailure={vi.fn()} />);

    expect(
      await screen.findByText(/LLM 을 부른 호출이 없습니다/),
    ).toBeInTheDocument();
  });

  it("집계가 없으면 빈 상태를 알린다", async () => {
    vi.mocked(fetchAdminAiUsageSummary).mockResolvedValue(
      ok({ buckets: [] }) as never,
    );

    render(<AiTokenTrendCard onAuthFailure={vi.fn()} />);

    expect(
      await screen.findByText("이 기간에 집계된 호출이 없습니다."),
    ).toBeInTheDocument();
  });

  it("실패하면 사유를 띄운다", async () => {
    vi.mocked(fetchAdminAiUsageSummary).mockRejectedValue(new Error("끊김"));

    render(<AiTokenTrendCard onAuthFailure={vi.fn()} />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

describe("CurrencyCard", () => {
  const master = {
    currencies: [
      {
        currencyCode: "USD",
        nameKo: "미국 달러",
        symbol: "$",
        minorUnits: 2,
        quoteUnit: 1,
        usdSide: "self",
        isHomeCurrency: false,
        isSupported: true,
        supportNote: null,
        colorToken: "currency-usd",
        sortOrder: 1,
      },
      {
        currencyCode: "GBP",
        nameKo: "영국 파운드",
        symbol: "£",
        minorUnits: 2,
        quoteUnit: 1,
        usdSide: "quote",
        isHomeCurrency: false,
        isSupported: false,
        supportNote: "ECOS 731Y001 미고시 — 환율 조달 불가",
        colorToken: "currency-gbp",
        sortOrder: 4,
      },
    ],
    currencyPairs: [
      {
        pairCode: "USDKRW",
        baseCurrencyCode: "USD",
        quoteCurrencyCode: "KRW",
        isStored: true,
        deriveViaPairCode: null,
      },
      {
        pairCode: "GBPKRW",
        baseCurrencyCode: "GBP",
        quoteCurrencyCode: "KRW",
        isStored: false,
        deriveViaPairCode: "USDKRW",
      },
    ],
  };

  it("미지원 통화를 사유와 함께 보여준다", async () => {
    vi.mocked(fetchAdminCurrencies).mockResolvedValue(ok(master) as never);

    render(<CurrencyCard onAuthFailure={vi.fn()} />);

    expect(await screen.findByText("지원 1 / 2")).toBeInTheDocument();
    expect(
      screen.getByText(/GBP — ECOS 731Y001 미고시/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/유도 쌍은 저장하지 않아/),
    ).toBeInTheDocument();
  });

  it("통화 코드가 없는 행도 사유를 잃지 않는다", async () => {
    vi.mocked(fetchAdminCurrencies).mockResolvedValue(
      ok({
        currencies: [
          { ...master.currencies[1], currencyCode: null },
        ],
        currencyPairs: [],
      }) as never,
    );

    render(<CurrencyCard onAuthFailure={vi.fn()} />);

    expect(
      await screen.findByText(/ECOS 731Y001 미고시/),
    ).toBeInTheDocument();
  });

  it("실패하면 사유를 띄운다", async () => {
    vi.mocked(fetchAdminCurrencies).mockRejectedValue(new Error("끊김"));

    render(<CurrencyCard onAuthFailure={vi.fn()} />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
