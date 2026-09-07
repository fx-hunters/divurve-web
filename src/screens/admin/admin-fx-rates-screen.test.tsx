import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminCurrencies, fetchAdminFxRates } from "../../api/admin";
import { ApiError } from "../../api/client";
import { AdminFxRatesScreen, toPairOptions } from "./admin-fx-rates-screen";

vi.mock("../../api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/admin")>();
  return {
    ADMIN_RATE_TYPES: actual.ADMIN_RATE_TYPES,
    ADMIN_STORED_RATE_TYPE: actual.ADMIN_STORED_RATE_TYPE,
    fetchAdminCurrencies: vi.fn(),
    fetchAdminFxRates: vi.fn(),
    refreshAdminFxRates: vi.fn(),
    refreshAdminMacro: vi.fn(),
  };
});

const META = { asOf: "2026-09-07T00:00:00Z" };

const CURRENCY_MASTER = {
  currencies: [],
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
    {
      pairCode: null,
      baseCurrencyCode: null,
      quoteCurrencyCode: null,
      isStored: null,
      deriveViaPairCode: null,
    },
  ],
};

beforeEach(() => {
  vi.mocked(fetchAdminCurrencies).mockReset();
  vi.mocked(fetchAdminFxRates).mockReset();
});

describe("toPairOptions", () => {
  it("유도 쌍을 잠그고 사유를 라벨에 남긴다", () => {
    expect(toPairOptions(CURRENCY_MASTER.currencyPairs)).toEqual([
      { pairCode: "USDKRW", isDisabled: false, label: "USDKRW" },
      {
        pairCode: "EURKRW",
        isDisabled: true,
        label: "EURKRW (유도 쌍 — 조회 불가)",
      },
    ]);
  });
});

describe("AdminFxRatesScreen", () => {
  it("통화쌍 선택지를 currency_pairs 응답으로 만들고 유도 쌍을 잠근다", async () => {
    vi.mocked(fetchAdminCurrencies).mockResolvedValue({
      data: CURRENCY_MASTER,
      meta: META,
    });

    render(<AdminFxRatesScreen onAuthFailure={vi.fn()} />);

    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "USDKRW" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("option", { name: "EURKRW (유도 쌍 — 조회 불가)" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "조회" })).toBeDisabled();
  });

  it("조회를 누르면 그때 부르고 조회 조건·차트·원본 표를 보여준다", async () => {
    vi.mocked(fetchAdminCurrencies).mockResolvedValue({
      data: CURRENCY_MASTER,
      meta: META,
    });
    vi.mocked(fetchAdminFxRates).mockResolvedValue({
      data: {
        pairCode: "USDKRW",
        rateType: "mid",
        from: "2026-08-01",
        to: "2026-09-01",
        count: 1,
        points: [
          {
            quoteDate: "2026-09-01",
            rate: 1382.4567,
            dataSource: "ECOS",
            fetchedAt: "2026-09-01T10:00:00Z",
          },
        ],
      },
      meta: META,
    });

    render(<AdminFxRatesScreen onAuthFailure={vi.fn()} />);
    await screen.findByRole("option", { name: "USDKRW" });

    expect(
      screen.getByText("통화쌍과 기간을 고르고 조회를 누르세요."),
    ).toBeInTheDocument();
    expect(fetchAdminFxRates).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("pair_code"), {
      target: { value: "USDKRW" },
    });
    fireEvent.change(screen.getByLabelText("from (생략 시 1년)"), {
      target: { value: "2026-08-01" },
    });
    fireEvent.change(screen.getByLabelText("to (생략 시 오늘)"), {
      target: { value: "2026-09-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "조회" }));

    await waitFor(() =>
      expect(fetchAdminFxRates).toHaveBeenCalledWith({
        pairCode: "USDKRW",
        from: "2026-08-01",
        to: "2026-09-01",
        rateType: "mid",
      }),
    );
    // 원본 자릿수를 그대로 보여준다.
    expect(await screen.findByText("1,382.4567")).toBeInTheDocument();
    expect(screen.getByText("count")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "USDKRW 환율 추이" }),
    ).toBeInTheDocument();
  });

  it("mid가 아닌 rate_type을 고르면 0건이 정상임을 알린다", async () => {
    vi.mocked(fetchAdminCurrencies).mockResolvedValue({
      data: CURRENCY_MASTER,
      meta: META,
    });

    render(<AdminFxRatesScreen onAuthFailure={vi.fn()} />);
    await screen.findByRole("option", { name: "USDKRW" });

    expect(screen.queryByText(/0건이 정상입니다/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("rate_type"), {
      target: { value: "tt_buy" },
    });

    expect(screen.getByText(/0건이 정상입니다/)).toBeInTheDocument();
  });

  it("조회 실패 메시지와 서버가 지목한 field를 보여준다", async () => {
    vi.mocked(fetchAdminCurrencies).mockResolvedValue({
      data: CURRENCY_MASTER,
      meta: META,
    });
    vi.mocked(fetchAdminFxRates).mockRejectedValue(
      new ApiError("기간이 올바르지 않습니다.", 400, "VALIDATION_FAILED", "from"),
    );

    render(<AdminFxRatesScreen onAuthFailure={vi.fn()} />);
    await screen.findByRole("option", { name: "USDKRW" });

    fireEvent.change(screen.getByLabelText("pair_code"), {
      target: { value: "USDKRW" },
    });
    fireEvent.click(screen.getByRole("button", { name: "조회" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("기간이 올바르지 않습니다.");
    expect(within(alert).getByText("from")).toBeInTheDocument();
  });

  it("통화쌍을 못 불러오면 사유를 보여주고 선택지를 비운다", async () => {
    vi.mocked(fetchAdminCurrencies).mockRejectedValue(
      new ApiError("통화 마스터를 읽지 못했습니다.", 500, "INTERNAL_ERROR"),
    );

    render(<AdminFxRatesScreen onAuthFailure={vi.fn()} />);

    expect(
      await screen.findByText("통화 마스터를 읽지 못했습니다."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(
      // "선택" 하나 + rate_type 5종
      6,
    );
  });
});
