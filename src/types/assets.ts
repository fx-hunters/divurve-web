/**
 * 온보딩 2단계가 표시하는 보유 자산 요약.
 *
 * 값은 `GET /api/v1/xray` 응답을 그대로 옮긴 것이다. 외화 금액은 조회 시점
 * 환율로 계산되어 매번 달라지므로 화면은 특정 숫자를 전제하지 않는다.
 */
export interface ImportedAssetSummary {
  /** 외화·해외자산 원화 평가액. */
  readonly fxAssetKrw: number;
  /** 원화 자산. */
  readonly krwAssetKrw: number;
  /** 원화 평가액 내림차순 통화 코드. 외화 자산이 없으면 빈 배열이다. */
  readonly currencyCodes: readonly string[];
  /** 서버가 응답 meta로 알려준 기준 시각(ISO 8601). 값이 없으면 빈 문자열. */
  readonly asOf: string;
}
