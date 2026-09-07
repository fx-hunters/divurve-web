import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_USER_DATA_DOMAINS,
  fetchAdminCurrencies,
  fetchAdminFxRates,
  fetchAdminUser,
  fetchAdminUserData,
  fetchAdminUsers,
  normalizeAdminCurrencyMaster,
  normalizeAdminExtractPreview,
  normalizeAdminFxRates,
  normalizeAdminFxRefresh,
  normalizeAdminMacroRefresh,
  normalizeAdminUserData,
  normalizeAdminUserPage,
  previewAdminExtraction,
  refreshAdminFxRates,
  refreshAdminMacro,
} from "./admin";
import { clearApiSession, saveApiSession } from "./session";

function stubFetchResolving(data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data, meta: { as_of: "2026-09-07T00:00:00Z" } }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function lastRequest(fetchMock: ReturnType<typeof vi.fn>) {
  const calls = fetchMock.mock.calls;
  const call = calls[calls.length - 1]!;
  return { url: call[0] as string, init: call[1] as RequestInit };
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

describe("normalizeAdminUserPage", () => {
  it("data.items 봉투를 읽고 페이지 정보를 그대로 담는다", () => {
    const page = normalizeAdminUserPage({
      items: [
        {
          id: "5f1e",
          email: "a@b.c",
          name: "관리자",
          role: "ADMIN",
          isDemo: false,
          sampleDataSeeded: true,
          createdAt: "2026-01-01T00:00:00Z",
          onboardedAt: "2026-01-02T00:00:00Z",
          lastLoginAt: null,
          lastLoginIp: null,
        },
      ],
      page: 0,
      size: 50,
      totalElements: 1,
      totalPages: 1,
    });

    expect(page.items[0]).toEqual({
      id: "5f1e",
      email: "a@b.c",
      name: "관리자",
      role: "ADMIN",
      isDemo: false,
      sampleDataSeeded: true,
      createdAt: "2026-01-01T00:00:00Z",
      onboardedAt: "2026-01-02T00:00:00Z",
      lastLoginAt: null,
      lastLoginIp: null,
    });
    expect(page.totalPages).toBe(1);
  });

  it("읽을 수 없는 응답이면 빈 목록과 null 페이지 정보를 돌려준다", () => {
    expect(normalizeAdminUserPage("nope")).toEqual({
      items: [],
      page: null,
      size: null,
      totalElements: null,
      totalPages: null,
    });
    expect(normalizeAdminUserPage({ items: "nope" }).items).toEqual([]);
  });

  it("빠진 항목은 null로 채운다", () => {
    expect(normalizeAdminUserPage({ items: [{}] }).items[0]).toEqual({
      id: null,
      email: null,
      name: null,
      role: null,
      isDemo: null,
      sampleDataSeeded: null,
      createdAt: null,
      onboardedAt: null,
      lastLoginAt: null,
      lastLoginIp: null,
    });
  });
});

describe("fetchAdminUsers", () => {
  it("q·is_demo·page·size를 snake_case 쿼리로 보낸다", async () => {
    const fetchMock = stubFetchResolving({ items: [] });

    await fetchAdminUsers({ page: 2, size: 50, q: "kim", isDemo: false });

    expect(lastRequest(fetchMock).url).toBe(
      "https://api.test/api/v1/admin/users?q=kim&is_demo=false&page=2&size=50",
    );
  });

  it("검색어가 비었거나 데모 필터가 없으면 그 파라미터를 보내지 않는다", async () => {
    const fetchMock = stubFetchResolving({ items: [] });

    await fetchAdminUsers({ page: 0, size: 50, q: "" });
    expect(lastRequest(fetchMock).url).toBe(
      "https://api.test/api/v1/admin/users?page=0&size=50",
    );

    await fetchAdminUsers({ page: 0, size: 50 });
    expect(lastRequest(fetchMock).url).toBe(
      "https://api.test/api/v1/admin/users?page=0&size=50",
    );
  });
});

describe("fetchAdminUser", () => {
  it("단건 요약을 읽고 id를 인코딩한다", async () => {
    const fetchMock = stubFetchResolving({ id: "a b", email: "x@y.z" });

    const result = await fetchAdminUser("a b");

    expect(lastRequest(fetchMock).url).toBe(
      "https://api.test/api/v1/admin/users/a%20b",
    );
    expect(result.data.email).toBe("x@y.z");
  });

  it("응답이 객체가 아니면 전부 null이다", async () => {
    stubFetchResolving("nope");
    expect((await fetchAdminUser("7")).data.email).toBeNull();
  });
});

describe("normalizeAdminUserData", () => {
  it("응답에 없는 도메인도 정해진 순서로 섹션을 남긴다", () => {
    const data = normalizeAdminUserData({ holdings: [{ id: 1 }] });

    expect(Object.keys(data)).toEqual([...ADMIN_USER_DATA_DOMAINS]);
    expect(data.holdings).toEqual([{ id: 1 }]);
    expect(data.goals).toEqual([]);
  });

  it("risk_profile·user_settings처럼 단일 객체로 오는 도메인도 한 행으로 담는다", () => {
    const data = normalizeAdminUserData({
      riskProfile: { id: "r1", riskType: "balanced" },
      userSettings: null,
    });

    expect(data.riskProfile).toEqual([{ id: "r1", riskType: "balanced" }]);
    expect(data.userSettings).toEqual([]);
  });

  it("모르는 도메인도 뒤에 덧붙이고 값 형태를 가리지 않는다", () => {
    const data = normalizeAdminUserData({
      alerts: [1, "two"],
      note: "메모",
    });

    expect(data.alerts).toEqual([{ value: 1 }, { value: "two" }]);
    expect(data.note).toEqual([{ value: "메모" }]);
    expect(Object.keys(data)).toContain("alerts");
  });

  it("응답이 객체가 아니면 알려진 도메인만 빈 채로 남는다", () => {
    expect(Object.keys(normalizeAdminUserData(null))).toEqual([
      ...ADMIN_USER_DATA_DOMAINS,
    ]);
  });
});

describe("fetchAdminUserData", () => {
  it("사용자 id를 인코딩해 호출한다", async () => {
    const fetchMock = stubFetchResolving({ holdings: [] });

    await fetchAdminUserData("a/b");

    expect(lastRequest(fetchMock).url).toBe(
      "https://api.test/api/v1/admin/users/a%2Fb/data",
    );
  });
});

describe("normalizeAdminCurrencyMaster", () => {
  it("통화와 통화쌍을 읽는다", () => {
    const master = normalizeAdminCurrencyMaster({
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
          colorToken: "--usd",
          sortOrder: 1,
        },
      ],
      currencyPairs: [
        {
          pairCode: "EURKRW",
          baseCurrencyCode: "EUR",
          quoteCurrencyCode: "KRW",
          isStored: false,
          deriveViaPairCode: "EURUSD",
        },
      ],
    });

    expect(master.currencies[0]!.nameKo).toBe("미국 달러");
    expect(master.currencyPairs[0]!.deriveViaPairCode).toBe("EURUSD");
  });

  it("배열이 아니면 빈 목록으로 두고, 빠진 값은 null로 채운다", () => {
    expect(normalizeAdminCurrencyMaster(undefined)).toEqual({
      currencies: [],
      currencyPairs: [],
    });
    expect(
      normalizeAdminCurrencyMaster({ currencies: "nope" }).currencies,
    ).toEqual([]);

    const master = normalizeAdminCurrencyMaster({
      currencies: [{}],
      currencyPairs: [{}],
    });
    expect(master.currencies[0]).toMatchObject({
      currencyCode: null,
      minorUnits: null,
      isSupported: null,
    });
    expect(master.currencyPairs[0]).toMatchObject({
      pairCode: null,
      isStored: null,
    });
  });
});

describe("fetchAdminCurrencies", () => {
  it("통화 마스터 경로를 부른다", async () => {
    const fetchMock = stubFetchResolving({ currencies: [], currency_pairs: [] });

    const result = await fetchAdminCurrencies();

    expect(lastRequest(fetchMock).url).toBe(
      "https://api.test/api/v1/admin/currencies",
    );
    expect(result.meta.asOf).toBe("2026-09-07T00:00:00Z");
  });
});

describe("normalizeAdminFxRates", () => {
  it("조회 조건과 points를 그대로 읽는다", () => {
    expect(
      normalizeAdminFxRates({
        pairCode: "USDKRW",
        rateType: "mid",
        from: "2026-06-01",
        to: "2026-09-01",
        count: 2,
        points: [
          {
            quoteDate: "2026-09-01",
            rate: 1382.4,
            dataSource: "ECOS",
            fetchedAt: "2026-09-01T10:00:00Z",
          },
          {},
        ],
      }),
    ).toEqual({
      pairCode: "USDKRW",
      rateType: "mid",
      from: "2026-06-01",
      to: "2026-09-01",
      count: 2,
      points: [
        {
          quoteDate: "2026-09-01",
          rate: 1382.4,
          dataSource: "ECOS",
          fetchedAt: "2026-09-01T10:00:00Z",
        },
        { quoteDate: null, rate: null, dataSource: null, fetchedAt: null },
      ],
    });
  });

  it("읽을 수 없으면 빈 시계열이다", () => {
    expect(normalizeAdminFxRates(42)).toEqual({
      pairCode: null,
      rateType: null,
      from: null,
      to: null,
      count: null,
      points: [],
    });
  });
});

describe("fetchAdminFxRates", () => {
  it("조회 조건을 snake_case 쿼리로 보낸다", async () => {
    const fetchMock = stubFetchResolving({ points: [] });

    await fetchAdminFxRates({
      pairCode: "USDKRW",
      from: "2026-06-01",
      to: "2026-09-01",
      rateType: "mid",
    });

    expect(lastRequest(fetchMock).url).toBe(
      "https://api.test/api/v1/admin/fx-rates?pair_code=USDKRW&from=2026-06-01&to=2026-09-01&rate_type=mid",
    );
  });

  it("기간이 비어 있으면 보내지 않는다 — 서버가 기본 1년으로 잡는다", async () => {
    const fetchMock = stubFetchResolving({ points: [] });

    await fetchAdminFxRates({
      pairCode: "USDKRW",
      from: "",
      to: "",
      rateType: "mid",
    });

    expect(lastRequest(fetchMock).url).toBe(
      "https://api.test/api/v1/admin/fx-rates?pair_code=USDKRW&rate_type=mid",
    );
  });
});

describe("normalizeAdminFxRefresh", () => {
  it("갱신 보고를 그대로 읽는다", () => {
    expect(
      normalizeAdminFxRefresh({
        evictedCaches: ["fxRate"],
        totalUpserted: 3,
        hasFailure: true,
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
          {},
        ],
      }),
    ).toEqual({
      evictedCaches: ["fxRate"],
      totalUpserted: 3,
      hasFailure: true,
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
        {
          pairCode: null,
          upserted: null,
          firstDate: null,
          lastDate: null,
          failureReason: null,
        },
      ],
    });
  });

  it("읽을 수 없으면 빈 보고다", () => {
    expect(normalizeAdminFxRefresh(null)).toEqual({
      evictedCaches: [],
      totalUpserted: null,
      hasFailure: null,
      refreshedAt: null,
      elapsedMs: null,
      pairs: [],
    });
    expect(
      normalizeAdminFxRefresh({ evictedCaches: [1, "fxRate"] }).evictedCaches,
    ).toEqual(["fxRate"]);
  });
});

describe("refreshAdminFxRates", () => {
  it("본문 없이 lookback_days 쿼리로 POST한다", async () => {
    const fetchMock = stubFetchResolving({ totalUpserted: 0 });

    await refreshAdminFxRates(14);

    const { url, init } = lastRequest(fetchMock);
    expect(url).toBe(
      "https://api.test/api/v1/admin/fx-rates/refresh?lookback_days=14",
    );
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
  });
});

describe("normalizeAdminMacroRefresh", () => {
  it("시리즈 결과를 그대로 읽는다", () => {
    expect(
      normalizeAdminMacroRefresh({
        evictedCaches: [],
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
          {},
        ],
      }).series,
    ).toEqual([
      {
        seriesId: "DGS10",
        value: 4.21,
        asOf: "2026-09-05",
        source: "FRED",
        fetchedAt: "2026-09-07T00:00:00Z",
        failureReason: null,
      },
      {
        seriesId: null,
        value: null,
        asOf: null,
        source: null,
        fetchedAt: null,
        failureReason: null,
      },
    ]);
  });

  it("읽을 수 없으면 빈 보고다", () => {
    expect(normalizeAdminMacroRefresh(undefined)).toEqual({
      evictedCaches: [],
      refreshedAt: null,
      elapsedMs: null,
      series: [],
    });
  });
});

describe("refreshAdminMacro", () => {
  it("series_ids를 본문으로 POST한다", async () => {
    const fetchMock = stubFetchResolving({ series: [] });

    await refreshAdminMacro(["DGS10", "T10Y2Y"]);

    const { url, init } = lastRequest(fetchMock);
    expect(url).toBe("https://api.test/api/v1/admin/macro/refresh");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      series_ids: ["DGS10", "T10Y2Y"],
    });
  });
});

describe("normalizeAdminExtractPreview", () => {
  it("후보 목록을 원시값 그대로 읽는다", () => {
    const preview = normalizeAdminExtractPreview({
      extractor: "ClaudeEconEventExtractor",
      count: 2,
      previewedAt: "2026-09-07T00:00:00Z",
      candidates: [
        {
          eventDate: "2026-09-10",
          region: "US",
          title: "FOMC",
          impact: 3,
          valid: false,
          rejectReason: "날짜가 범위를 벗어남",
        },
        {},
      ],
    });

    expect(preview.extractor).toBe("ClaudeEconEventExtractor");
    expect(preview.count).toBe(2);
    expect(preview.candidates[0]!.impact).toBe(3);
    expect(preview.candidates[1]).toEqual({
      eventDate: null,
      region: null,
      title: null,
      impact: null,
      valid: null,
      rejectReason: null,
    });
  });

  it("응답이 비면 extractor는 null이다", () => {
    expect(normalizeAdminExtractPreview(null)).toEqual({
      extractor: null,
      count: null,
      previewedAt: null,
      candidates: [],
    });
  });
});

describe("previewAdminExtraction", () => {
  it("source_url과 text를 POST한다", async () => {
    const fetchMock = stubFetchResolving({ extractor: "x", candidates: [] });

    await previewAdminExtraction({
      sourceUrl: "https://news.example/1",
      text: "원문",
    });

    const { url, init } = lastRequest(fetchMock);
    expect(url).toBe("https://api.test/api/v1/admin/ai/extract-preview");
    expect(JSON.parse(init.body as string)).toEqual({
      source_url: "https://news.example/1",
      text: "원문",
    });
  });
});
