import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminCurrencies } from "../../api/admin";
import { ApiError } from "../../api/client";
import { AdminCurrenciesScreen } from "./admin-currencies-screen";

vi.mock("../../api/admin", () => ({ fetchAdminCurrencies: vi.fn() }));

const META = { asOf: "2026-09-07T00:00:00Z" };

beforeEach(() => {
  vi.mocked(fetchAdminCurrencies).mockReset();
});

describe("AdminCurrenciesScreen", () => {
  it("통화와 통화쌍을 두 표로 보여준다", async () => {
    vi.mocked(fetchAdminCurrencies).mockResolvedValue({
      data: {
        currencies: [
          {
            currencyCode: "USD",
            nameKo: "미국 달러",
            symbol: "$",
            minorUnits: 2,
            quoteUnit: 1,
            usdSide: "base",
            isHomeCurrency: false,
            isSupported: true,
            supportNote: null,
            colorToken: "--usd",
            sortOrder: 1,
          },
          {
            currencyCode: "CNY",
            nameKo: "중국 위안",
            symbol: "¥",
            minorUnits: 2,
            quoteUnit: 1,
            usdSide: "quote",
            isHomeCurrency: false,
            isSupported: false,
            supportNote: "고시 환율 미제공",
            colorToken: null,
            sortOrder: 9,
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
            pairCode: "EURKRW",
            baseCurrencyCode: "EUR",
            quoteCurrencyCode: "KRW",
            isStored: false,
            deriveViaPairCode: "EURUSD",
          },
        ],
      },
      meta: META,
    });

    render(<AdminCurrenciesScreen onAuthFailure={vi.fn()} />);

    expect(await screen.findByText("currencies (2건)")).toBeInTheDocument();
    expect(screen.getByText("currency_pairs (2건)")).toBeInTheDocument();
    // 미지원 통화는 사유와 함께 회색 행으로 남는다.
    expect(screen.getByText("고시 환율 미제공")).toBeInTheDocument();
    const currencyRows = screen.getAllByRole("row");
    expect(
      currencyRows.some((row) =>
        row.className.includes("admin-table__row--muted"),
      ),
    ).toBe(true);
    // 저장하지 않고 유도하는 쌍임을 표시한다.
    expect(screen.getByText("false (유도)")).toBeInTheDocument();
    expect(screen.getByText("EURUSD")).toBeInTheDocument();
  });

  it("빈 응답이면 두 표 모두 없음으로 남는다", async () => {
    vi.mocked(fetchAdminCurrencies).mockResolvedValue({
      data: { currencies: [], currencyPairs: [] },
      meta: META,
    });

    render(<AdminCurrenciesScreen onAuthFailure={vi.fn()} />);

    expect(await screen.findByText("currencies (0건)")).toBeInTheDocument();
    expect(screen.getAllByText("없음")).toHaveLength(2);
  });

  it("다시 불러오기로 재호출한다", async () => {
    vi.mocked(fetchAdminCurrencies).mockResolvedValue({
      data: { currencies: [], currencyPairs: [] },
      meta: META,
    });

    render(<AdminCurrenciesScreen onAuthFailure={vi.fn()} />);
    await screen.findByText("currencies (0건)");

    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    await waitFor(() =>
      expect(fetchAdminCurrencies).toHaveBeenCalledTimes(2),
    );
  });

  it("에러 메시지를 그대로 보여준다", async () => {
    vi.mocked(fetchAdminCurrencies).mockRejectedValue(
      new ApiError("아직 제공되지 않는 기능입니다.", 501, "NOT_IMPLEMENTED"),
    );

    render(<AdminCurrenciesScreen onAuthFailure={vi.fn()} />);

    expect(
      await screen.findByText("아직 제공되지 않는 기능입니다."),
    ).toBeInTheDocument();
  });
});
