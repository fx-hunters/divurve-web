import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAdminRefreshStatus,
  refreshAdminFxRates,
  refreshAdminMacro,
} from "../../api/admin";
import { ApiError } from "../../api/client";
import { parseSeriesIds } from "./admin-macro-refresh-card";
import { AdminRefreshPanel } from "./admin-refresh-panel";

vi.mock("../../api/admin", () => ({
  fetchAdminRefreshStatus: vi.fn(),
  refreshAdminFxRates: vi.fn(),
  refreshAdminMacro: vi.fn(),
}));

const META = { asOf: "2026-09-07T00:00:00Z" };

const EMPTY_FX = {
  evictedCaches: [],
  totalUpserted: null,
  hasFailure: null,
  refreshedAt: null,
  elapsedMs: null,
  pairs: [],
};

const STATUS = {
  fx: {
    lastFetchedAt: "2026-09-08T00:31:07Z",
    lastQuoteDate: "2026-09-05",
    pairs: [],
  },
  macro: { lastRefreshedAt: null },
};

beforeEach(() => {
  vi.mocked(refreshAdminFxRates).mockReset();
  vi.mocked(refreshAdminMacro).mockReset();
  vi.mocked(fetchAdminRefreshStatus).mockReset();
  vi.mocked(fetchAdminRefreshStatus).mockResolvedValue({
    data: STATUS,
    meta: META,
  });
});

describe("parseSeriesIds", () => {
  it("쉼표로 나누고 공백과 빈 항목을 버린다", () => {
    expect(parseSeriesIds(" DGS10 , T10Y2Y ,, ")).toEqual(["DGS10", "T10Y2Y"]);
    expect(parseSeriesIds("  ")).toEqual([]);
  });
});

describe("AdminRefreshPanel — 환율", () => {
  it("lookback_days를 보내고 갱신 결과를 그대로 남긴다", async () => {
    vi.mocked(refreshAdminFxRates).mockResolvedValue({
      data: {
        evictedCaches: ["fxRate"],
        totalUpserted: 3,
        hasFailure: false,
        refreshedAt: "2026-09-07T00:00:00Z",
        elapsedMs: 812,
        pairs: [
          {
            pairCode: "USDKRW",
            upserted: 3,
            firstDate: "2026-08-25",
            lastDate: "2026-09-05",
            failureReason: null,
          },
        ],
      },
      meta: META,
    });

    render(<AdminRefreshPanel onAuthFailure={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("lookback_days"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "환율 갱신" }));

    await waitFor(() => expect(refreshAdminFxRates).toHaveBeenCalledWith(30));
    // 건수·소요시간·비운 캐시를 버리지 않는다.
    expect(await screen.findByText("812")).toBeInTheDocument();
    expect(screen.getByText("fxRate")).toBeInTheDocument();
    expect(screen.getByText("USDKRW")).toBeInTheDocument();
    expect(screen.getByText("응답 원문")).toBeInTheDocument();
  });

  it("빈 입력이면 기본 14일로 보낸다", async () => {
    vi.mocked(refreshAdminFxRates).mockResolvedValue({
      data: EMPTY_FX,
      meta: META,
    });

    render(<AdminRefreshPanel onAuthFailure={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("lookback_days"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "환율 갱신" }));

    await waitFor(() => expect(refreshAdminFxRates).toHaveBeenCalledWith(14));
    expect(
      await screen.findByText("갱신된 통화쌍이 없습니다."),
    ).toBeInTheDocument();
  });

  it("has_failure와 total_upserted=0을 각각 경고한다", async () => {
    vi.mocked(refreshAdminFxRates).mockResolvedValue({
      data: {
        evictedCaches: [],
        totalUpserted: 0,
        hasFailure: true,
        refreshedAt: "2026-09-07T00:00:00Z",
        elapsedMs: 40,
        pairs: [
          {
            pairCode: "USDKRW",
            upserted: 0,
            firstDate: null,
            lastDate: null,
            failureReason: "ECOS 키가 없습니다.",
          },
        ],
      },
      meta: META,
    });

    render(<AdminRefreshPanel onAuthFailure={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "환율 갱신" }));

    expect(await screen.findByText(/has_failure=true/)).toBeInTheDocument();
    expect(screen.getByText(/total_upserted=0/)).toBeInTheDocument();
    const reason = screen.getByText("ECOS 키가 없습니다.");
    expect(reason.tagName).toBe("STRONG");
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]!.className).toContain("admin-table__row--danger");
  });

  it("보내는 동안 버튼을 잠그고, 실패는 서버 메시지로 알린다", async () => {
    let resolveFx: (value: never) => void = () => undefined;
    vi.mocked(refreshAdminFxRates).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFx = resolve as (value: never) => void;
      }),
    );

    render(<AdminRefreshPanel onAuthFailure={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "환율 갱신" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "환율 갱신" })).toBeDisabled(),
    );
    expect(screen.getByText("환율을 갱신하는 중입니다.")).toBeInTheDocument();

    resolveFx({ data: EMPTY_FX, meta: META } as never);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "환율 갱신" })).toBeEnabled(),
    );

    vi.mocked(refreshAdminFxRates).mockRejectedValueOnce(
      new ApiError("ECOS 연동이 꺼져 있습니다.", 500, "INTERNAL_ERROR"),
    );
    fireEvent.click(screen.getByRole("button", { name: "환율 갱신" }));
    expect(
      await screen.findByText("ECOS 연동이 꺼져 있습니다."),
    ).toBeInTheDocument();
  });
});

describe("AdminRefreshPanel — 거시지표", () => {
  it("series_ids를 보내고 시리즈 결과를 남긴다", async () => {
    vi.mocked(refreshAdminMacro).mockResolvedValue({
      data: {
        evictedCaches: ["macroSnapshot"],
        refreshedAt: "2026-09-07T00:00:00Z",
        elapsedMs: 120,
        series: [
          {
            seriesId: "DGS10",
            value: 4.21,
            asOf: "2026-09-05",
            source: "FRED",
            fetchedAt: "2026-09-07T00:00:00Z",
            failureReason: null,
          },
          {
            seriesId: "T10Y2Y",
            value: null,
            asOf: null,
            source: null,
            fetchedAt: null,
            failureReason: "FRED 키가 없습니다.",
          },
        ],
      },
      meta: META,
    });

    render(<AdminRefreshPanel onAuthFailure={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("series_ids (쉼표 구분)"), {
      target: { value: "DGS10, T10Y2Y" },
    });
    fireEvent.click(screen.getByRole("button", { name: "거시지표 갱신" }));

    await waitFor(() =>
      expect(refreshAdminMacro).toHaveBeenCalledWith(["DGS10", "T10Y2Y"]),
    );
    expect(await screen.findByText("4.21")).toBeInTheDocument();
    expect(screen.getByText("macroSnapshot")).toBeInTheDocument();
    const reason = screen.getByText("FRED 키가 없습니다.");
    expect(reason.tagName).toBe("STRONG");
    expect(screen.getByText(/저장하지 않습니다/)).toBeInTheDocument();
  });

  it("시리즈를 비우면 보낼 수 없다", async () => {
    render(<AdminRefreshPanel onAuthFailure={vi.fn()} />);
    // 마운트 직후 나가는 마지막 갱신 조회가 끝난 뒤에 만진다.
    await screen.findAllByText(/마지막 갱신/);

    fireEvent.change(screen.getByLabelText("series_ids (쉼표 구분)"), {
      target: { value: "  " },
    });

    expect(
      screen.getByRole("button", { name: "거시지표 갱신" }),
    ).toBeDisabled();
  });

  it("보내는 동안 안내를 남기고, 실패 메시지를 그대로 보여준다", async () => {
    let resolveMacro: (value: never) => void = () => undefined;
    vi.mocked(refreshAdminMacro).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveMacro = resolve as (value: never) => void;
      }),
    );

    render(<AdminRefreshPanel onAuthFailure={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "거시지표 갱신" }));

    expect(
      await screen.findByText("거시지표를 갱신하는 중입니다."),
    ).toBeInTheDocument();
    resolveMacro({
      data: {
        evictedCaches: [],
        refreshedAt: null,
        elapsedMs: null,
        series: [],
      },
      meta: META,
    } as never);
    expect(
      await screen.findByText("조회된 시리즈가 없습니다."),
    ).toBeInTheDocument();

    vi.mocked(refreshAdminMacro).mockRejectedValueOnce(
      new ApiError("조회할 시리즈를 지정해야 합니다.", 400, "VALIDATION_FAILED"),
    );
    fireEvent.click(screen.getByRole("button", { name: "거시지표 갱신" }));
    expect(
      await screen.findByText("조회할 시리즈를 지정해야 합니다."),
    ).toBeInTheDocument();
  });
});

describe("AdminRefreshPanel — 마지막 갱신", () => {
  it("들어오자마자 한 번 조회해 두 카드에 나눠 적는다", async () => {
    render(<AdminRefreshPanel onAuthFailure={vi.fn()} />);

    // 2026-09-08T00:31:07Z = 서울 09:31
    expect(
      await screen.findByText(/마지막 갱신 — 26.09.08 09:31/),
    ).toBeInTheDocument();
    // FRED는 저장되지 않아 서버에 남는 값이 없다.
    expect(
      screen.getByText(/서버에 남는 기록이 없습니다/),
    ).toBeInTheDocument();
    // 조회는 두 카드가 나눠 보므로 한 번만 나간다.
    expect(fetchAdminRefreshStatus).toHaveBeenCalledTimes(1);
  });

  it("갱신을 마치면 마지막 갱신 시각을 다시 읽는다", async () => {
    vi.mocked(refreshAdminFxRates).mockResolvedValue({
      data: EMPTY_FX,
      meta: META,
    });

    render(<AdminRefreshPanel onAuthFailure={vi.fn()} />);
    await waitFor(() =>
      expect(fetchAdminRefreshStatus).toHaveBeenCalledTimes(1),
    );

    fireEvent.click(screen.getByRole("button", { name: "환율 갱신" }));
    await waitFor(() =>
      expect(fetchAdminRefreshStatus).toHaveBeenCalledTimes(2),
    );
  });

  it("서버가 아직 열지 않은 엔드포인트면 조용히 넘어간다", async () => {
    vi.mocked(fetchAdminRefreshStatus).mockRejectedValue(
      new ApiError("찾을 수 없습니다.", 404, "NOT_FOUND"),
    );

    render(<AdminRefreshPanel onAuthFailure={vi.fn()} />);

    expect(
      await screen.findAllByText(/서버가 아직 제공하지 않습니다/),
    ).toHaveLength(2);
    // 갱신 버튼은 그대로 살아 있다.
    expect(screen.getByRole("button", { name: "환율 갱신" })).toBeEnabled();
  });
});
