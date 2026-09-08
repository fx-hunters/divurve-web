/**
 * 비율(0~1)을 소수 첫째 자리까지의 퍼센트 수치로 바꾼다. 표시 단위 변환이다.
 *
 * 홈의 통화별 노출 도넛과 X-Ray의 통화별 노출은 백엔드의 같은 `PortfolioSnapshot`에서
 * 나온 값을 그린다(divurve-api#94). 화면마다 반올림을 따로 두면 같은 값이 두 화면에서
 * 다르게 보이므로, 이 규칙은 이 파일 하나에만 둔다.
 */
export function toPercent(ratio: number): number {
  return Math.round(ratio * 1000) / 10;
}
