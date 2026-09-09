import { describe, expect, it } from "vitest";
import type { AdminFxPairCoverage } from "../../../api/admin-fx-gaps";
import type { AdminRefreshStatus } from "../../../api/admin";
import {
  formatFailureRate,
  isAllFallback,
  toGapDigest,
  toGapTone,
  toRefreshDigest,
} from "./admin-dashboard-presenter";

function pairOf(
  overrides: Partial<AdminFxPairCoverage> = {},
): AdminFxPairCoverage {
  return {
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
    ...overrides,
  };
}

describe("toGapDigest", () => {
  it("완전하지 않은 통화쌍만 추리고 결측일을 더한다", () => {
    const digest = toGapDigest({
      pairs: [
        pairOf(),
        pairOf({ pairCode: "JPYKRW", complete: false, missingBusinessDays: 3 }),
        pairOf({ pairCode: "EURKRW", complete: false, missingBusinessDays: 2 }),
      ],
    });

    expect(digest.totalPairs).toBe(3);
    expect(digest.incompletePairs).toHaveLength(2);
    expect(digest.missingBusinessDays).toBe(5);
  });

  it("결측일을 모르는 칸은 세지 않는다", () => {
    const digest = toGapDigest({
      pairs: [pairOf({ missingBusinessDays: null, complete: null })],
    });

    expect(digest.missingBusinessDays).toBe(0);
    // complete 를 모르는 쌍은 미완전으로 몰지 않는다.
    expect(digest.incompletePairs).toHaveLength(0);
  });

  it("통화쌍이 없으면 0으로 센다", () => {
    expect(toGapDigest({ pairs: [] })).toEqual({
      totalPairs: 0,
      incompletePairs: [],
      missingBusinessDays: 0,
    });
  });
});

describe("toGapTone", () => {
  it("빈 목록·완전·미완전을 가른다", () => {
    expect(toGapTone(toGapDigest({ pairs: [] }))).toBe("empty");
    expect(toGapTone(toGapDigest({ pairs: [pairOf()] }))).toBe("ok");
    expect(
      toGapTone(toGapDigest({ pairs: [pairOf({ complete: false })] })),
    ).toBe("warn");
  });
});

describe("toRefreshDigest", () => {
  function statusOf(pairs: AdminRefreshStatus["fx"]["pairs"]) {
    return {
      fx: {
        lastFetchedAt: "2026-09-09T00:00:00Z",
        lastQuoteDate: "2026-09-08",
        pairs,
      },
      macro: { lastRefreshedAt: "2026-09-08T00:00:00Z" },
    };
  }

  it("수집 시각과 통화쌍 수를 추린다", () => {
    const digest = toRefreshDigest(
      statusOf([
        {
          pairCode: "USDKRW",
          lastFetchedAt: "2026-09-09T00:00:00Z",
          lastQuoteDate: "2026-09-08",
        },
      ]),
    );

    expect(digest.fxLastFetchedAt).toBe("2026-09-09T00:00:00Z");
    expect(digest.fxLastQuoteDate).toBe("2026-09-08");
    expect(digest.macroLastRefreshedAt).toBe("2026-09-08T00:00:00Z");
    expect(digest.pairCount).toBe(1);
    expect(digest.pairsWithoutFetch).toEqual([]);
  });

  it("한 번도 받지 못한 통화쌍을 골라낸다", () => {
    const digest = toRefreshDigest(
      statusOf([
        { pairCode: "USDKRW", lastFetchedAt: null, lastQuoteDate: null },
        { pairCode: null, lastFetchedAt: null, lastQuoteDate: null },
      ]),
    );

    expect(digest.pairsWithoutFetch).toEqual(["USDKRW", "(코드 없음)"]);
  });
});

describe("formatFailureRate", () => {
  it("비율을 소수 한 자리 퍼센트로 적는다", () => {
    expect(formatFailureRate(3, 12)).toBe("25.0%");
    expect(formatFailureRate(0, 12)).toBe("0.0%");
  });

  it("분모가 0이거나 값을 모르면 대시로 남긴다", () => {
    // 0으로 나눈 값을 0%로 적으면 "실패가 없다"로 잘못 읽힌다.
    expect(formatFailureRate(0, 0)).toBe("-");
    expect(formatFailureRate(null, 12)).toBe("-");
    expect(formatFailureRate(3, null)).toBe("-");
  });
});

describe("isAllFallback", () => {
  it("모든 호출이 템플릿으로 나갔는지 가른다", () => {
    expect(isAllFallback(295, 295)).toBe(true);
    expect(isAllFallback(3, 295)).toBe(false);
  });

  it("호출이 없거나 값을 모르면 판정하지 않는다", () => {
    expect(isAllFallback(0, 0)).toBe(false);
    expect(isAllFallback(null, 10)).toBe(false);
    expect(isAllFallback(10, null)).toBe(false);
  });
});
