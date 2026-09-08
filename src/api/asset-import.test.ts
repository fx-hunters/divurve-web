import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchImportedAssetSummary } from "./asset-import";
import { request } from "./client";
import { fetchXrayOverview } from "./xray";
import type { XrayResponse } from "./generated/divurve-api";

vi.mock("./xray", () => ({ fetchXrayOverview: vi.fn() }));
vi.mock("./client", () => ({ request: vi.fn() }));

const OVERVIEW: XrayResponse = {
  totalAssetKrw: 100_058_000,
  krwAssetKrw: 36_000_000,
  fxAssetKrw: 64_058_000,
  fxRatio: 0.6402,
  exposure: [
    { currencyCode: "JPY", krw: 3_800_000, share: 0.0593 },
    { currencyCode: "USD", krw: 58_658_000, share: 0.9157 },
    { currencyCode: "EUR", krw: 1_600_000, share: 0.025 },
  ],
  concentration: { status: "within_threshold" },
  sensitivity1pct: { totalKrw: 640_580, byCurrency: {} },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(request)
    .mockResolvedValueOnce([
      { id: "holding-1", ticker: "AAPL", currencyCode: "USD", quantity: 12 },
    ])
    .mockResolvedValueOnce([
      { id: "deposit-1", currencyCode: "JPY", amount: 400_000 },
    ])
    .mockResolvedValueOnce([
      { id: "krw-1", kind: "cash", label: "생활비 통장", amountKrw: 12_000_000 },
    ]);
});

describe("fetchImportedAssetSummary", () => {
  it("X-Ray 개요의 금액과 통화를 원화 평가액 내림차순으로 옮긴다", async () => {
    vi.mocked(fetchXrayOverview).mockResolvedValue({
      data: { ...OVERVIEW, isSampleData: true },
      meta: { asOf: "2026-09-07T09:30:00Z", isSampleData: false },
    });

    await expect(fetchImportedAssetSummary()).resolves.toEqual({
      totalAssetKrw: 100_058_000,
      fxAssetKrw: 64_058_000,
      krwAssetKrw: 36_000_000,
      currencyCodes: ["USD", "JPY", "EUR"],
      asOf: "2026-09-07T09:30:00Z",
      isSampleData: true,
      hasAssets: true,
      holdings: [
        { id: "holding-1", ticker: "AAPL", currencyCode: "USD", quantity: 12 },
      ],
      deposits: [
        { id: "deposit-1", currencyCode: "JPY", amount: 400_000 },
      ],
      krwAssets: [
        { id: "krw-1", kind: "cash", label: "생활비 통장", amountKrw: 12_000_000 },
      ],
    });
    expect(request).toHaveBeenNthCalledWith(1, "/api/v1/holdings");
    expect(request).toHaveBeenNthCalledWith(2, "/api/v1/deposits");
    expect(request).toHaveBeenNthCalledWith(3, "/api/v1/krw-assets");
  });

  it("외화 자산이 없으면 빈 통화 목록을 돌려준다", async () => {
    vi.mocked(fetchXrayOverview).mockResolvedValue({
      data: {
        ...OVERVIEW,
        totalAssetKrw: 0,
        krwAssetKrw: 0,
        fxAssetKrw: 0,
        exposure: [],
      },
      meta: { asOf: "", isSampleData: false },
    });

    vi.mocked(request).mockReset().mockResolvedValue([]);

    await expect(fetchImportedAssetSummary()).resolves.toEqual({
      totalAssetKrw: 0,
      fxAssetKrw: 0,
      krwAssetKrw: 0,
      currencyCodes: [],
      asOf: "",
      isSampleData: false,
      hasAssets: false,
      holdings: [],
      deposits: [],
      krwAssets: [],
    });
  });

  it("본문에 샘플 여부가 없으면 meta 값을 사용하고 누락된 자산 이름을 보존한다", async () => {
    vi.mocked(fetchXrayOverview).mockResolvedValue({
      data: OVERVIEW,
      meta: { asOf: "", isSampleData: true },
    });
    vi.mocked(request)
      .mockReset()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "krw-2", kind: "other", amountKrw: 10 },
      ]);

    await expect(fetchImportedAssetSummary()).resolves.toMatchObject({
      isSampleData: true,
      holdings: [],
      deposits: [],
      krwAssets: [
        { id: "krw-2", kind: "other", label: null, amountKrw: 10 },
      ],
    });
  });
});
