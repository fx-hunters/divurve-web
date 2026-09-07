import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchImportedAssetSummary } from "./asset-import";
import { fetchXrayOverview } from "./xray";

vi.mock("./xray", () => ({ fetchXrayOverview: vi.fn() }));

const OVERVIEW = {
  totalAssetKrw: 100_058_000,
  krwAssetKrw: 36_000_000,
  fxAssetKrw: 64_058_000,
  fxRatio: 0.6402,
  exposure: [
    { currencyCode: "JPY", krw: 3_800_000, share: 0.0593 },
    { currencyCode: "USD", krw: 58_658_000, share: 0.9157 },
    { currencyCode: "EUR", krw: 1_600_000, share: 0.025 },
  ],
  concentration: { status: "ok" },
  sensitivity1pct: { totalKrw: 640_580, byCurrency: {} },
};

beforeEach(() => vi.clearAllMocks());

describe("fetchImportedAssetSummary", () => {
  it("X-Ray 개요의 금액과 통화를 원화 평가액 내림차순으로 옮긴다", async () => {
    vi.mocked(fetchXrayOverview).mockResolvedValue({
      data: OVERVIEW,
      meta: { asOf: "2026-09-07T09:30:00Z" },
    });

    await expect(fetchImportedAssetSummary()).resolves.toEqual({
      fxAssetKrw: 64_058_000,
      krwAssetKrw: 36_000_000,
      currencyCodes: ["USD", "JPY", "EUR"],
      asOf: "2026-09-07T09:30:00Z",
    });
  });

  it("외화 자산이 없으면 빈 통화 목록을 돌려준다", async () => {
    vi.mocked(fetchXrayOverview).mockResolvedValue({
      data: { ...OVERVIEW, fxAssetKrw: 0, exposure: [] },
      meta: { asOf: "" },
    });

    await expect(fetchImportedAssetSummary()).resolves.toEqual({
      fxAssetKrw: 0,
      krwAssetKrw: 36_000_000,
      currencyCodes: [],
      asOf: "",
    });
  });
});
