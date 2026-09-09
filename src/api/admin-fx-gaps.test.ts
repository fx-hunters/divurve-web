import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  backfillAdminFxGaps,
  fetchAdminFxGaps,
  normalizeAdminFxBackfill,
  normalizeAdminFxCoverage,
} from "./admin-fx-gaps";
import { clearApiSession, saveApiSession } from "./session";

function stubFetchResolving(data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({ data, meta: { as_of: "2026-09-09T00:00:00Z" } }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function lastRequest(fetchMock: ReturnType<typeof vi.fn>) {
  const calls = fetchMock.mock.calls;
  const call = calls[calls.length - 1]!;
  return { url: call[0] as string, init: call[1] as RequestInit | undefined };
}

beforeEach(() => {
  vi.stubEnv("VITE_API_URL", "https://api.test");
  saveApiSession(
    {
      accessToken: "token",
      refreshToken: "refresh",
      expiresIn: 1800,
      isDemo: false,
      onboarded: true,
    },
    "session",
  );
});

afterEach(() => {
  clearApiSession();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("normalizeAdminFxCoverage", () => {
  it("쌍별 커버리지와 빠진 구간을 그대로 담는다", () => {
    const coverage = normalizeAdminFxCoverage({
      pairs: [
        {
          pairCode: "USDKRW",
          rateType: "mid",
          from: "2026-08-01",
          to: "2026-08-31",
          expectedBusinessDays: 21,
          coveredBusinessDays: 19,
          missingBusinessDays: 2,
          coverageRatio: 0.9047,
          complete: false,
          gaps: [{ from: "2026-08-14", to: "2026-08-15", businessDays: 2 }],
        },
      ],
    });

    expect(coverage.pairs).toHaveLength(1);
    const pair = coverage.pairs[0]!;
    expect(pair.pairCode).toBe("USDKRW");
    expect(pair.coverageRatio).toBe(0.9047);
    expect(pair.complete).toBe(false);
    expect(pair.gaps).toEqual([
      { from: "2026-08-14", to: "2026-08-15", businessDays: 2 },
    ]);
  });

  it("값이 없거나 타입이 다르면 null·빈 배열로 떨어뜨린다", () => {
    const coverage = normalizeAdminFxCoverage({
      pairs: [{ pairCode: 7, coverageRatio: "높음", gaps: "없음" }],
    });

    const pair = coverage.pairs[0]!;
    expect(pair.pairCode).toBeNull();
    expect(pair.rateType).toBeNull();
    expect(pair.expectedBusinessDays).toBeNull();
    expect(pair.coveredBusinessDays).toBeNull();
    expect(pair.missingBusinessDays).toBeNull();
    expect(pair.coverageRatio).toBeNull();
    expect(pair.complete).toBeNull();
    expect(pair.gaps).toEqual([]);
  });

  it("봉투가 통째로 비어도 빈 목록을 돌려준다", () => {
    expect(normalizeAdminFxCoverage(null)).toEqual({ pairs: [] });
    expect(normalizeAdminFxCoverage({})).toEqual({ pairs: [] });
  });

  it("구간의 빠진 값도 null로 남긴다", () => {
    const coverage = normalizeAdminFxCoverage({
      pairs: [{ gaps: [{}] }],
    });
    expect(coverage.pairs[0]!.gaps[0]).toEqual({
      from: null,
      to: null,
      businessDays: null,
    });
  });
});

describe("fetchAdminFxGaps", () => {
  it("조건 없이 부르면 쿼리 없이 결측 경로를 친다", async () => {
    const fetchMock = stubFetchResolving({ pairs: [] });

    const result = await fetchAdminFxGaps();

    expect(lastRequest(fetchMock).url).toBe(
      "https://api.test/api/v1/admin/fx-rates/gaps",
    );
    expect(result.data.pairs).toEqual([]);
  });

  it("조건을 snake_case 쿼리로 바꿔 보낸다", async () => {
    const fetchMock = stubFetchResolving({ pairs: [] });

    await fetchAdminFxGaps({
      pairCode: "JPYKRW",
      from: "2026-01-01",
      to: "2026-01-31",
    });

    const { url } = lastRequest(fetchMock);
    expect(url).toContain("pair_code=JPYKRW");
    expect(url).toContain("from=2026-01-01");
    expect(url).toContain("to=2026-01-31");
  });
});

describe("normalizeAdminFxBackfill", () => {
  it("쌍별 결과와 합계를 그대로 담는다", () => {
    const report = normalizeAdminFxBackfill({
      pairs: [
        {
          pairCode: "USDKRW",
          filled: 3,
          confirmedAbsent: 1,
          missingBefore: 4,
          missingAfter: 0,
          complete: true,
          remainingGaps: [],
          failureReason: null,
        },
      ],
      totalFilled: 3,
      totalConfirmedAbsent: 1,
      hasFailure: false,
      complete: true,
      backfilledAt: "2026-09-09T01:00:00Z",
    });

    expect(report.totalFilled).toBe(3);
    expect(report.totalConfirmedAbsent).toBe(1);
    expect(report.hasFailure).toBe(false);
    expect(report.complete).toBe(true);
    expect(report.backfilledAt).toBe("2026-09-09T01:00:00Z");
    expect(report.pairs[0]!.filled).toBe(3);
    expect(report.pairs[0]!.failureReason).toBeNull();
  });

  it("실패 사유와 남은 구간을 잃지 않는다", () => {
    const report = normalizeAdminFxBackfill({
      pairs: [
        {
          pairCode: "CNYKRW",
          failureReason: "ECOS 응답 없음",
          remainingGaps: [
            { from: "2026-02-01", to: "2026-02-02", businessDays: 2 },
          ],
        },
      ],
      hasFailure: true,
    });

    const pair = report.pairs[0]!;
    expect(pair.failureReason).toBe("ECOS 응답 없음");
    expect(pair.remainingGaps).toHaveLength(1);
    expect(pair.filled).toBeNull();
    expect(pair.confirmedAbsent).toBeNull();
    expect(pair.missingBefore).toBeNull();
    expect(pair.missingAfter).toBeNull();
    expect(pair.complete).toBeNull();
    expect(report.hasFailure).toBe(true);
  });

  it("봉투가 통째로 비어도 빈 결과를 돌려준다", () => {
    expect(normalizeAdminFxBackfill(undefined)).toEqual({
      pairs: [],
      totalFilled: null,
      totalConfirmedAbsent: null,
      hasFailure: null,
      complete: null,
      backfilledAt: null,
    });
  });
});

describe("backfillAdminFxGaps", () => {
  it("POST 로 백필 경로를 친다", async () => {
    const fetchMock = stubFetchResolving({ pairs: [], totalFilled: 0 });

    const result = await backfillAdminFxGaps();

    const { url, init } = lastRequest(fetchMock);
    expect(url).toBe("https://api.test/api/v1/admin/fx-rates/backfill");
    expect(init?.method).toBe("POST");
    expect(result.data.totalFilled).toBe(0);
  });

  it("통화쌍과 기간을 쿼리로 넘긴다", async () => {
    const fetchMock = stubFetchResolving({ pairs: [] });

    await backfillAdminFxGaps({ pairCode: "EURKRW", from: "2026-03-01" });

    const { url } = lastRequest(fetchMock);
    expect(url).toContain("pair_code=EURKRW");
    expect(url).toContain("from=2026-03-01");
    expect(url).not.toContain("to=");
  });
});
