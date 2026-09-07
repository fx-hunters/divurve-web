import { describe, expect, it } from "vitest";
import { IMPORTED_ASSET_SUMMARY_FIXTURE } from "../../test/api-fixtures";
import {
  toAsOfLabel,
  toAssetSummaryRows,
  toCurrenciesLabel,
  toImportedAssetGroups,
  toKrwAmountLabel,
} from "./asset-import-presenter";

describe("asset-import-presenter", () => {
  it("원 단위 금액에 자릿수 구분을 넣는다", () => {
    expect(toKrwAmountLabel(64_058_000)).toBe("64,058,000원");
    expect(toKrwAmountLabel(0)).toBe("0원");
  });

  it("통화 목록을 순서대로 잇고, 비어 있으면 없음으로 알린다", () => {
    expect(toCurrenciesLabel(["USD", "JPY"])).toBe("USD · JPY");
    expect(toCurrenciesLabel([])).toBe("보유한 외화 없음");
  });

  it("읽을 수 없는 기준 시각은 표시하지 않는다", () => {
    expect(toAsOfLabel("")).toBeNull();
    expect(toAsOfLabel("어제")).toBeNull();
    expect(toAsOfLabel("2026-09-07T09:30:00Z")).toMatch(/기준$/);
  });

  it("요약 세 줄을 화면 표기로 만든다", () => {
    expect(toAssetSummaryRows(IMPORTED_ASSET_SUMMARY_FIXTURE)).toEqual([
      { label: "외화·해외자산", value: "64,058,000원" },
      { label: "원화 자산", value: "36,000,000원" },
      { label: "확인 통화", value: "USD · JPY · EUR" },
    ]);
  });

  it("서버가 조회한 종목·예금·원화 자산을 간단한 항목 문구로 만든다", () => {
    expect(toImportedAssetGroups(IMPORTED_ASSET_SUMMARY_FIXTURE)).toEqual([
      { label: "해외주식", items: ["AAPL · 12주 · USD"] },
      { label: "외화예금", items: ["400,000 JPY"] },
      { label: "원화 자산", items: ["생활비 통장 · 12,000,000원"] },
    ]);
    expect(
      toImportedAssetGroups({
        ...IMPORTED_ASSET_SUMMARY_FIXTURE,
        holdings: [],
        deposits: [],
        krwAssets: [
          { id: "empty-label", kind: "other", label: null, amountKrw: 10 },
        ],
      }),
    ).toEqual([
      { label: "원화 자산", items: ["이름 없는 원화 자산 · 10원"] },
    ]);
  });
});
