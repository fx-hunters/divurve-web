/**
 * 관리자 콘솔의 값 표시 규칙.
 *
 * 숫자는 천단위 구분만 넣고 절대 반올림하지 않는다. 서버가 준 자릿수를
 * 그대로 보여주는 것이 이 도구의 목적이다. 값이 없으면 `-`로 둔다.
 */

/** 빈 칸 표기. 서버 응답에 값이 없다는 뜻이며, 프론트가 채우지 않는다. */
export const ADMIN_EMPTY_VALUE = "-";

/**
 * 천단위 구분만 넣는다.
 *
 * `toLocaleString()`은 소수점 이하 3자리에서 반올림해 버려 원본 자릿수를
 * 잃는다. 그래서 문자열로 만든 뒤 정수부만 직접 끊는다. 지수 표기(1e21)나
 * NaN·Infinity처럼 자릿수를 끊을 수 없는 값은 손대지 않고 그대로 둔다.
 */
export function formatAdminNumber(value: number): string {
  const raw = String(value);
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return raw;
  const [integerPart, fractionPart] = raw.split(".");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fractionPart === undefined ? grouped : `${grouped}.${fractionPart}`;
}

/** 표 한 칸에 들어갈 문자열. 어떤 값도 새로 만들거나 반올림하지 않는다. */
export function formatAdminValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return ADMIN_EMPTY_VALUE;
  }
  if (typeof value === "number") return formatAdminNumber(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  return JSON.stringify(value) ?? ADMIN_EMPTY_VALUE;
}

/** 응답 원문을 그대로 보여줄 때 쓰는 들여쓰기 JSON. */
export function formatAdminJson(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? String(value);
}

/**
 * 여러 행에 등장하는 모든 키를 나온 순서대로 모은다.
 * 컬럼을 골라내지 않고 응답에 있는 키를 전부 표에 세우기 위한 것이다.
 */
export function collectAdminColumns(
  rows: readonly Readonly<Record<string, unknown>>[],
): readonly string[] {
  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  return columns;
}
