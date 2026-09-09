/**
 * 관리자 응답을 읽는 최소 도구.
 *
 * 서버가 어떤 모양으로 주든 잃지 않고 담아 두기 위한 것들이다. 값이 없거나
 * 타입이 다르면 `null`(배열은 빈 배열)로 떨어뜨리고, 어떤 수치도 여기서
 * 만들거나 고치지 않는다(AGENTS.md 1장).
 *
 * `admin.ts`에 있던 것을 옮겼다 — 관리자 API 모듈이 여럿으로 갈리면서
 * (`admin-fx-gaps.ts` 등) 같은 리더를 여러 벌 두지 않기 위해서다.
 */

/** 서버가 어떤 모양으로 주든 잃지 않고 담아 두기 위한 최소 단위. */
export type AdminRecord = Readonly<Record<string, unknown>>;

export function isRecord(value: unknown): value is AdminRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function readString(source: AdminRecord, key: string): string | null {
  const value = source[key];
  return typeof value === "string" ? value : null;
}

export function readNumber(source: AdminRecord, key: string): number | null {
  const value = source[key];
  return typeof value === "number" ? value : null;
}

export function readBoolean(source: AdminRecord, key: string): boolean | null {
  const value = source[key];
  return typeof value === "boolean" ? value : null;
}

export function readArray(
  source: AdminRecord,
  key: string,
): readonly AdminRecord[] {
  const value = source[key];
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function readStringArray(
  source: AdminRecord,
  key: string,
): readonly string[] {
  const value = source[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
