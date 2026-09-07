import type { ImportedAssetSummary } from "../../types/assets";

/**
 * 초기 설정의 자산 불러오기 동작만을 위한 체험용 응답.
 *
 * 실제 X-Ray API 응답과 합성하지 않으며, 금융기관 연결 결과를 뜻하지 않는다.
 */
export const MOCK_IMPORTED_ASSET_SUMMARY: ImportedAssetSummary = {
  assetSource: "mock_import",
  sourceLabel: "체험용 자산 데이터",
  foreignAssetLabel: "외화·해외자산",
  foreignAssetValue: "64,000,000원",
  krwAssetLabel: "원화 자산",
  krwAssetValue: "36,000,000원",
  currenciesLabel: "USD · JPY · EUR",
  importedAtLabel: "방금 불러옴",
};
