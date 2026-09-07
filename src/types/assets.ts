export type AssetSource = "mock_import" | "manual" | "mydata";

export interface ImportedAssetSummary {
  readonly assetSource: AssetSource;
  readonly sourceLabel: string;
  readonly foreignAssetLabel: string;
  readonly foreignAssetValue: string;
  readonly krwAssetLabel: string;
  readonly krwAssetValue: string;
  readonly currenciesLabel: string;
  readonly importedAtLabel: string;
}
