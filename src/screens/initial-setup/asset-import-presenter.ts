import type { ImportedAssetSummary } from "../../types/assets";

const krwFormatter = new Intl.NumberFormat("ko-KR");
const asOfFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** 원 단위 정수를 화면 표기로 바꾼다. 값 자체는 서버가 준 그대로다. */
export function toKrwAmountLabel(amountKrw: number): string {
  return `${krwFormatter.format(amountKrw)}원`;
}

/** 통화 개수를 가정하지 않는다. 외화 자산이 없으면 빈 배열이 온다. */
export function toCurrenciesLabel(codes: readonly string[]): string {
  return codes.length > 0 ? codes.join(" · ") : "보유한 외화 없음";
}

/** 기준 시각을 못 읽으면 표시하지 않는다. */
export function toAsOfLabel(asOf: string): string | null {
  const parsed = new Date(asOf);
  if (asOf === "" || Number.isNaN(parsed.getTime())) return null;
  return `${asOfFormatter.format(parsed)} 기준`;
}

export interface AssetSummaryRow {
  readonly label: string;
  readonly value: string;
}

export function toAssetSummaryRows(
  summary: ImportedAssetSummary,
): readonly AssetSummaryRow[] {
  return [
    { label: "외화·해외자산", value: toKrwAmountLabel(summary.fxAssetKrw) },
    { label: "원화 자산", value: toKrwAmountLabel(summary.krwAssetKrw) },
    { label: "확인 통화", value: toCurrenciesLabel(summary.currencyCodes) },
  ];
}
