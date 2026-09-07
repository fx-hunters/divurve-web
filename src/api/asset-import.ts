import { fetchXrayOverview } from "./xray";
import { request } from "./client";
import type { XrayExposure } from "./generated/divurve-api";
import type { ImportedAssetSummary } from "../types/assets";

export type AssetImportLoader = () => Promise<ImportedAssetSummary>;

interface HoldingResponse {
  readonly id: string;
  readonly ticker: string;
  readonly currencyCode: string;
  readonly quantity: number;
}

interface DepositResponse {
  readonly id: string;
  readonly currencyCode: string;
  readonly amount: number;
}

interface KrwAssetResponse {
  readonly id: string;
  readonly kind: string;
  readonly label?: string;
  readonly amountKrw: number;
}

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
  const [overview, holdings, deposits, krwAssets] = await Promise.all([
    fetchXrayOverview(),
    request<readonly HoldingResponse[]>("/api/v1/holdings"),
    request<readonly DepositResponse[]>("/api/v1/deposits"),
    request<readonly KrwAssetResponse[]>("/api/v1/krw-assets"),
  ]);
  const { data, meta } = overview;
  return {
    totalAssetKrw: data.totalAssetKrw,
    fxAssetKrw: data.fxAssetKrw,
    krwAssetKrw: data.krwAssetKrw,
    currencyCodes: [...data.exposure]
      .sort(byKrwDesc)
      .map((item) => item.currencyCode),
    asOf: meta.asOf,
    isSampleData: data.isSampleData ?? meta.isSampleData,
    hasAssets: data.totalAssetKrw > 0,
    holdings: holdings.map(({ id, ticker, currencyCode, quantity }) => ({
      id,
      ticker,
      currencyCode,
      quantity,
    })),
    deposits: deposits.map(({ id, currencyCode, amount }) => ({
      id,
      currencyCode,
      amount,
    })),
    krwAssets: krwAssets.map(({ id, kind, label, amountKrw }) => ({
      id,
      kind,
      label: label ?? null,
      amountKrw,
    })),
  };
}
