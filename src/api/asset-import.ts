import { MOCK_IMPORTED_ASSET_SUMMARY } from "./fixtures/initial-setup-assets";
import type { ImportedAssetSummary } from "../types/assets";

export type AssetImportLoader = () => Promise<ImportedAssetSummary>;

export function loadMockImportedAssets(): Promise<ImportedAssetSummary> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(MOCK_IMPORTED_ASSET_SUMMARY), 450);
  });
}
