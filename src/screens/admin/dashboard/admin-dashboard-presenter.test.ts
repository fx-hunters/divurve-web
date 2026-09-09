import { describe, expect, it } from "vitest";
import type { AdminFxPairCoverage } from "../../../api/admin-fx-gaps";
import type { AdminRefreshStatus } from "../../../api/admin";
import type { AdminAiUsageBucket, AdminCurrencyMaster } from "../../../api/admin";
import {
  formatFailureRate,
  hasAnyLiveCall,
  isAllFallback,
  toCurrencyDigest,
  toOutcomeWidth,
  toTokenPoints,
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

describe("toOutcomeWidth", () => {
  it("총계 대비 비율을 %로 준다", () => {
    expect(toOutcomeWidth(3, 12)).toBe(25);
    expect(toOutcomeWidth(12, 12)).toBe(100);
  });

  it("총계를 모르거나 0이면 그리지 않는다", () => {
    expect(toOutcomeWidth(3, 0)).toBeNull();
    expect(toOutcomeWidth(null, 12)).toBeNull();
    expect(toOutcomeWidth(3, null)).toBeNull();
  });

  it("총계를 넘는 값도 띠 안으로 눌러 담는다", () => {
    expect(toOutcomeWidth(20, 12)).toBe(100);
  });
});

describe("toTokenPoints", () => {
  function bucketOf(
    overrides: Partial<AdminAiUsageBucket> = {},
  ): AdminAiUsageBucket {
    return {
      day: "2026-09-01",
      purpose: "narrate",
      model: "claude-opus-5",
      calls: 1,
      inputTokens: 10,
      outputTokens: 5,
      ...overrides,
    };
  }

  it("같은 날의 버킷을 하나로 접고 날짜순으로 세운다", () => {
    const points = toTokenPoints([
      bucketOf({ day: "2026-09-02", inputTokens: 3, outputTokens: 1 }),
      bucketOf({ day: "2026-09-01", inputTokens: 10, outputTokens: 5 }),
      bucketOf({ day: "2026-09-01", inputTokens: 7, outputTokens: 2 }),
    ]);

    expect(points.map((point) => point.day)).toEqual([
      "2026-09-01",
      "2026-09-02",
    ]);
    expect(points[0]!.inputTokens).toBe(17);
    expect(points[0]!.outputTokens).toBe(7);
  });

  it("토큰 칸이 비어도 0으로 세고 버리지 않는다", () => {
    const points = toTokenPoints([
      bucketOf({ inputTokens: null, outputTokens: null }),
    ]);

    expect(points[0]!.inputTokens).toBe(0);
    expect(points[0]!.outputTokens).toBe(0);
  });

  it("날짜를 모르는 버킷은 점으로 세우지 않는다", () => {
    expect(toTokenPoints([bucketOf({ day: null })])).toEqual([]);
  });

  it("model 이 null 인 날은 LLM 을 부르지 않은 것으로 표시한다", () => {
    const points = toTokenPoints([
      bucketOf({ day: "2026-09-01", model: null }),
      bucketOf({ day: "2026-09-02", model: "claude-opus-5" }),
    ]);

    expect(points[0]!.hasLiveCall).toBe(false);
    expect(points[1]!.hasLiveCall).toBe(true);
  });

  it("한 날에 실호출이 하나라도 있으면 그 날은 실호출로 본다", () => {
    const points = toTokenPoints([
      bucketOf({ model: null }),
      bucketOf({ model: "claude-opus-5" }),
    ]);

    expect(points[0]!.hasLiveCall).toBe(true);
  });
});

describe("hasAnyLiveCall", () => {
  it("한 점이라도 실호출이 있으면 참", () => {
    expect(
      hasAnyLiveCall([
        { day: "d1", inputTokens: 0, outputTokens: 0, hasLiveCall: false },
        { day: "d2", inputTokens: 1, outputTokens: 1, hasLiveCall: true },
      ]),
    ).toBe(true);
  });

  it("전부 템플릿이면 거짓", () => {
    expect(
      hasAnyLiveCall([
        { day: "d1", inputTokens: 0, outputTokens: 0, hasLiveCall: false },
      ]),
    ).toBe(false);
    expect(hasAnyLiveCall([])).toBe(false);
  });
});

describe("toCurrencyDigest", () => {
  function masterOf(
    overrides: Partial<AdminCurrencyMaster> = {},
  ): AdminCurrencyMaster {
    return {
      currencies: [],
      currencyPairs: [],
      ...overrides,
    };
  }

  function currencyOf(code: string, isSupported: boolean | null) {
    return {
      currencyCode: code,
      nameKo: code,
      symbol: "$",
      minorUnits: 2,
      quoteUnit: 1,
      usdSide: "quote",
      isHomeCurrency: false,
      isSupported,
      supportNote: isSupported === false ? "미고시" : null,
      colorToken: null,
      sortOrder: 1,
    };
  }

  it("미지원 통화와 저장·유도 쌍을 갈라 센다", () => {
    const digest = toCurrencyDigest(
      masterOf({
        currencies: [
          currencyOf("USD", true),
          currencyOf("GBP", false),
          currencyOf("XXX", null),
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
      }),
    );

    expect(digest.totalCurrencies).toBe(3);
    // isSupported 를 모르는 통화는 미지원으로 몰지 않는다.
    expect(digest.unsupported).toHaveLength(1);
    expect(digest.unsupported[0]!.currencyCode).toBe("GBP");
    expect(digest.storedPairs).toBe(1);
    expect(digest.derivedPairs).toBe(1);
  });

  it("비어 있으면 0으로 센다", () => {
    expect(toCurrencyDigest(masterOf())).toEqual({
      totalCurrencies: 0,
      unsupported: [],
      storedPairs: 0,
      derivedPairs: 0,
    });
  });
});
