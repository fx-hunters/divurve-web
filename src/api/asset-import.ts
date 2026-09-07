import { fetchXrayOverview } from "./xray";
import type { XrayExposure } from "./generated/divurve-api";
import type { ImportedAssetSummary } from "../types/assets";

export type AssetImportLoader = () => Promise<ImportedAssetSummary>;

/** 원화 평가액이 큰 통화가 앞에 오도록. 서버도 같은 순서지만 표시 순서는 여기서 확정한다. */
function byKrwDesc(left: XrayExposure, right: XrayExposure): number {
  return right.krw - left.krw;
}

/**
 * 온보딩 2단계가 보여줄 보유 자산을 조회한다.
 *
 * 자산은 계정 생성 시점에 이미 채워지므로 별도의 "불러오기" 요청은 없다.
 * 화면은 `GET /api/v1/xray`를 조회해 그대로 표시하기만 한다.
 */
export async function fetchImportedAssetSummary(): Promise<ImportedAssetSummary> {
  const { data, meta } = await fetchXrayOverview();
  return {
    fxAssetKrw: data.fxAssetKrw,
    krwAssetKrw: data.krwAssetKrw,
    currencyCodes: [...data.exposure]
      .sort(byKrwDesc)
      .map((item) => item.currencyCode),
    asOf: meta.asOf,
  };
}
