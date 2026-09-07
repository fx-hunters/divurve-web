import { afterEach, describe, expect, it, vi } from "vitest";
import { loadMockImportedAssets } from "./asset-import";
import { MOCK_IMPORTED_ASSET_SUMMARY } from "./fixtures/initial-setup-assets";

describe("loadMockImportedAssets", () => {
  afterEach(() => vi.useRealTimers());

  it("짧은 연결 대기 뒤 공용 MOCK 자산 fixture를 반환한다", async () => {
    vi.useFakeTimers();
    const request = loadMockImportedAssets();
    await vi.advanceTimersByTimeAsync(450);
    await expect(request).resolves.toBe(MOCK_IMPORTED_ASSET_SUMMARY);
  });
});
