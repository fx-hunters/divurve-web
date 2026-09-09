import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminFxGapHeatmap } from "./admin-fx-gap-heatmap";
import {
  backfillAdminFxGaps,
  fetchAdminFxGaps,
} from "../../api/admin-fx-gaps";

vi.mock("../../api/admin-fx-gaps", () => ({
  fetchAdminFxGaps: vi.fn(),
  backfillAdminFxGaps: vi.fn(),
}));

const META = { asOf: "2026-09-09T00:00:00Z", dataState: "live", sources: [] };

function coverageResult(pairs: unknown[]) {
  return { data: { pairs }, meta: META };
}

function pairWithGap() {
  return {
    pairCode: "USDKRW",
    rateType: "mid",
    from: "2026-01-01",
    to: "2026-01-10",
    expectedBusinessDays: 8,
    coveredBusinessDays: 6,
    missingBusinessDays: 2,
    coverageRatio: 0.75,
    complete: false,
    gaps: [{ from: "2026-01-06", to: "2026-01-07", businessDays: 2 }],
  };
}

beforeEach(() => {
  vi.mocked(fetchAdminFxGaps).mockResolvedValue(
    coverageResult([pairWithGap()]) as never,
  );
  vi.mocked(backfillAdminFxGaps).mockResolvedValue({
    data: {
      pairs: [
        {
          pairCode: "USDKRW",
          filled: 2,
          confirmedAbsent: 0,
          missingBefore: 2,
          missingAfter: 0,
          complete: true,
          remainingGaps: [],
          failureReason: null,
        },
      ],
      totalFilled: 2,
      totalConfirmedAbsent: 0,
      hasFailure: false,
      complete: true,
      backfilledAt: "2026-09-09T01:00:00Z",
    },
    meta: META,
  } as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AdminFxGapHeatmap", () => {
  it("들어오면 곧바로 결측을 불러와 통화쌍별 띠를 세운다", async () => {
    render(<AdminFxGapHeatmap onAuthFailure={vi.fn()} />);

    expect(await screen.findByText("USDKRW")).toBeInTheDocument();
    expect(screen.getByText("75.0%")).toBeInTheDocument();
    expect(screen.getByText(/결측 2일/)).toBeInTheDocument();
    expect(fetchAdminFxGaps).toHaveBeenCalledTimes(1);
  });

  it("빠진 구간을 누르면 무엇을 다시 받는지 먼저 보여준다", async () => {
    render(<AdminFxGapHeatmap onAuthFailure={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /결측 구간 다시 받기/ }));

    expect(
      screen.getByText(/USDKRW 2026-01-06 ~ 2026-01-07 구간을 다시 받습니다/),
    ).toBeInTheDocument();
    expect(backfillAdminFxGaps).not.toHaveBeenCalled();
  });

  it("취소하면 아무것도 받지 않는다", async () => {
    render(<AdminFxGapHeatmap onAuthFailure={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /결측 구간 다시 받기/ }));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(
      screen.queryByText(/구간을 다시 받습니다/),
    ).not.toBeInTheDocument();
    expect(backfillAdminFxGaps).not.toHaveBeenCalled();
  });

  it("백필을 누르면 그 구간만 넘기고 끝나면 다시 조회한다", async () => {
    render(<AdminFxGapHeatmap onAuthFailure={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /결측 구간 다시 받기/ }));
    fireEvent.click(screen.getByRole("button", { name: "백필" }));

    await waitFor(() => {
      expect(backfillAdminFxGaps).toHaveBeenCalledWith({
        pairCode: "USDKRW",
        from: "2026-01-06",
        to: "2026-01-07",
      });
    });
    expect(await screen.findByText(/채움 2일/)).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchAdminFxGaps).toHaveBeenCalledTimes(2);
    });
  });

  it("백필 후에도 남은 구간과 실패 사유를 알린다", async () => {
    vi.mocked(backfillAdminFxGaps).mockResolvedValue({
      data: {
        pairs: [
          {
            pairCode: "CNYKRW",
            filled: 0,
            confirmedAbsent: 0,
            missingBefore: 2,
            missingAfter: 2,
            complete: false,
            remainingGaps: [
              { from: "2026-01-06", to: "2026-01-07", businessDays: 2 },
            ],
            failureReason: "ECOS 응답 없음",
          },
          {
            pairCode: null,
            filled: 0,
            confirmedAbsent: 0,
            missingBefore: 1,
            missingAfter: 1,
            complete: false,
            remainingGaps: [],
            failureReason: "통화쌍을 알 수 없음",
          },
        ],
        totalFilled: 0,
        totalConfirmedAbsent: 0,
        hasFailure: true,
        complete: false,
        backfilledAt: "2026-09-09T01:00:00Z",
      },
      meta: META,
    } as never);

    render(<AdminFxGapHeatmap onAuthFailure={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /결측 구간 다시 받기/ }));
    fireEvent.click(screen.getByRole("button", { name: "백필" }));

    expect(await screen.findByText(/ECOS 응답 없음/)).toBeInTheDocument();
    expect(screen.getByText(/남은 구간 1개/)).toBeInTheDocument();
    // 통화쌍 코드가 없는 실패도 잃지 않는다.
    expect(screen.getByText(/통화쌍을 알 수 없음/)).toBeInTheDocument();
  });

  it("기간을 바꿔 조회하면 그 조건으로 다시 부른다", async () => {
    render(<AdminFxGapHeatmap onAuthFailure={vi.fn()} />);
    await screen.findByText("USDKRW");

    fireEvent.change(screen.getByLabelText("from"), {
      target: { value: "2026-02-01" },
    });
    fireEvent.change(screen.getByLabelText("to"), {
      target: { value: "2026-02-28" },
    });
    fireEvent.click(screen.getByRole("button", { name: "조회" }));

    await waitFor(() => {
      expect(fetchAdminFxGaps).toHaveBeenLastCalledWith({
        from: "2026-02-01",
        to: "2026-02-28",
      });
    });
  });

  it("저장 대상이 없으면 빈 상태를 알린다", async () => {
    vi.mocked(fetchAdminFxGaps).mockResolvedValue(
      coverageResult([]) as never,
    );

    render(<AdminFxGapHeatmap onAuthFailure={vi.fn()} />);

    expect(
      await screen.findByText("저장 대상 통화쌍이 없습니다."),
    ).toBeInTheDocument();
  });

  it("조회가 실패하면 사유를 띄운다", async () => {
    vi.mocked(fetchAdminFxGaps).mockRejectedValue(new Error("끊김"));

    render(<AdminFxGapHeatmap onAuthFailure={vi.fn()} />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("통화쌍 코드가 없는 줄은 누를 수 없다", async () => {
    vi.mocked(fetchAdminFxGaps).mockResolvedValue(
      coverageResult([{ ...pairWithGap(), pairCode: null }]) as never,
    );

    render(<AdminFxGapHeatmap onAuthFailure={vi.fn()} />);

    const gap = await screen.findByRole("button", {
      name: /결측 구간 다시 받기/,
    });
    expect(gap).toBeDisabled();
  });

  it("백필이 실패하면 사유를 띄운다", async () => {
    vi.mocked(backfillAdminFxGaps).mockRejectedValue(new Error("끊김"));

    render(<AdminFxGapHeatmap onAuthFailure={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /결측 구간 다시 받기/ }));
    fireEvent.click(screen.getByRole("button", { name: "백필" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
