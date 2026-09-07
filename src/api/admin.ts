/**
 * 임시 운영자용 관리자 콘솔 API (백엔드 이슈 fx-hunters/divurve-api#111).
 *
 * 백엔드는 응답을 `{ data, meta }`로 감싸 snake_case로 보내며, 언래핑·표기
 * 변환은 `client.ts`가 담당한다(AGENTS.md 4·5장). 이 모듈은 경계에서
 * "응답 모양을 잃지 않고" 화면으로 넘기는 일만 한다. 어떤 수치도 여기서
 * 만들거나 고치지 않는다.
 */
import { apiPath, requestWithMeta, type ApiResult } from "./client";

const ADMIN_BASE = "/api/v1/admin";

/** 서버가 어떤 모양으로 주든 잃지 않고 담아 두기 위한 최소 단위. */
export type AdminRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is AdminRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readString(source: AdminRecord, key: string): string | null {
  const value = source[key];
  return typeof value === "string" ? value : null;
}

function readNumber(source: AdminRecord, key: string): number | null {
  const value = source[key];
  return typeof value === "number" ? value : null;
}

function readBoolean(source: AdminRecord, key: string): boolean | null {
  const value = source[key];
  return typeof value === "boolean" ? value : null;
}

function readArray(source: AdminRecord, key: string): readonly AdminRecord[] {
  const value = source[key];
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function readStringArray(source: AdminRecord, key: string): readonly string[] {
  const value = source[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/* ------------------------------------------------------------------ *
 * 2-1. 사용자 목록
 * ------------------------------------------------------------------ */

/**
 * 사용자 목록 한 행. 값이 없는 칸은 null로 두고 화면에서 `-`로 표시한다.
 *
 * `email`이 곧 로그인 식별자다 — 별도 username은 없다.
 * `lastLoginAt`/`lastLoginIp`는 **마지막 1건**만 저장된다. 접속 이력이 아니다.
 */
export interface AdminUser {
  readonly id: string | null;
  readonly email: string | null;
  readonly name: string | null;
  readonly role: string | null;
  readonly isDemo: boolean | null;
  /** 자산이 시드된 샘플인지. `isDemo`(계정 성격)와 다른 사실이다. */
  readonly sampleDataSeeded: boolean | null;
  readonly createdAt: string | null;
  readonly onboardedAt: string | null;
  readonly lastLoginAt: string | null;
  readonly lastLoginIp: string | null;
}

/** 목록 응답. 페이지 수·전체 건수는 서버가 준 값만 담는다. */
export interface AdminUserPage {
  readonly items: readonly AdminUser[];
  readonly page: number | null;
  readonly size: number | null;
  readonly totalElements: number | null;
  readonly totalPages: number | null;
}

export function toAdminUser(row: AdminRecord): AdminUser {
  return {
    id: readString(row, "id"),
    email: readString(row, "email"),
    name: readString(row, "name"),
    role: readString(row, "role"),
    isDemo: readBoolean(row, "isDemo"),
    sampleDataSeeded: readBoolean(row, "sampleDataSeeded"),
    createdAt: readString(row, "createdAt"),
    onboardedAt: readString(row, "onboardedAt"),
    lastLoginAt: readString(row, "lastLoginAt"),
    lastLoginIp: readString(row, "lastLoginIp"),
  };
}

export function normalizeAdminUserPage(data: unknown): AdminUserPage {
  const source = isRecord(data) ? data : {};
  return {
    items: readArray(source, "items").map(toAdminUser),
    page: readNumber(source, "page"),
    size: readNumber(source, "size"),
    totalElements: readNumber(source, "totalElements"),
    totalPages: readNumber(source, "totalPages"),
  };
}

export interface AdminUserQuery {
  readonly page: number;
  readonly size: number;
  /** 이메일·이름 검색어. 비어 있으면 보내지 않는다. */
  readonly q?: string;
  /**
   * 데모 계정만/제외 필터. 생략하면 데모를 포함한 전체다.
   * `is_demo`로 전송된다.
   */
  readonly isDemo?: boolean;
}

export async function fetchAdminUsers(
  query: AdminUserQuery,
): Promise<ApiResult<AdminUserPage>> {
  const result = await requestWithMeta<unknown>(
    apiPath(`${ADMIN_BASE}/users`, {
      q: query.q === undefined || query.q === "" ? undefined : query.q,
      isDemo: query.isDemo,
      page: query.page,
      size: query.size,
    }),
  );
  return { data: normalizeAdminUserPage(result.data), meta: result.meta };
}

/** 사용자 한 명 요약. 목록 행과 같은 형태다. */
export async function fetchAdminUser(
  userId: string,
): Promise<ApiResult<AdminUser>> {
  const result = await requestWithMeta<unknown>(
    `${ADMIN_BASE}/users/${encodeURIComponent(userId)}`,
  );
  return {
    data: toAdminUser(isRecord(result.data) ? result.data : {}),
    meta: result.meta,
  };
}

/* ------------------------------------------------------------------ *
 * 2-2. 사용자 상세 데이터
 * ------------------------------------------------------------------ */

/**
 * 상세 응답의 도메인 키. 응답에 없더라도 섹션을 남기기 위한 목록이며,
 * 화면에 세우는 순서이기도 하다.
 *
 * `riskProfile`·`userSettings`는 배열이 아니라 **객체 또는 null**로 온다.
 */
export const ADMIN_USER_DATA_DOMAINS = [
  "holdings",
  "fxDeposits",
  "krwAssets",
  "goals",
  "plans",
  "planSteps",
  "riskProfile",
  "userSettings",
  "stressTestRuns",
] as const;

/** 도메인 이름 → 그 도메인의 행 목록. 행의 키는 서버가 준 그대로다. */
export type AdminUserData = Readonly<Record<string, readonly AdminRecord[]>>;

/**
 * 도메인 값 하나를 행 목록으로 만든다.
 *
 * 배열이면 그대로, 단일 객체면 한 행, 그 밖의 값이면 `{ value }` 한 행으로
 * 담는다. 어떤 경우에도 서버가 보낸 값을 버리지 않는다.
 */
function toDomainRows(value: unknown): readonly AdminRecord[] {
  if (Array.isArray(value)) {
    return value.map((item) => (isRecord(item) ? item : { value: item }));
  }
  if (isRecord(value)) return [value];
  if (value === null || value === undefined) return [];
  return [{ value }];
}

export function normalizeAdminUserData(data: unknown): AdminUserData {
  const source = isRecord(data) ? data : {};
  const knownDomains: readonly string[] = ADMIN_USER_DATA_DOMAINS;
  const keys = [
    ...knownDomains,
    ...Object.keys(source).filter((key) => !knownDomains.includes(key)),
  ];
  return Object.fromEntries(keys.map((key) => [key, toDomainRows(source[key])]));
}

export async function fetchAdminUserData(
  userId: string,
): Promise<ApiResult<AdminUserData>> {
  const result = await requestWithMeta<unknown>(
    `${ADMIN_BASE}/users/${encodeURIComponent(userId)}/data`,
  );
  return { data: normalizeAdminUserData(result.data), meta: result.meta };
}

/* ------------------------------------------------------------------ *
 * 2-3. 통화 마스터
 * ------------------------------------------------------------------ */

export interface AdminCurrency {
  readonly currencyCode: string | null;
  readonly nameKo: string | null;
  readonly symbol: string | null;
  readonly minorUnits: number | null;
  readonly quoteUnit: number | null;
  readonly usdSide: string | null;
  readonly isHomeCurrency: boolean | null;
  /** false면 환율을 조달할 수 없는 통화다. 사유는 `supportNote`. */
  readonly isSupported: boolean | null;
  readonly supportNote: string | null;
  readonly colorToken: string | null;
  readonly sortOrder: number | null;
}

export interface AdminCurrencyPair {
  readonly pairCode: string | null;
  readonly baseCurrencyCode: string | null;
  readonly quoteCurrencyCode: string | null;
  /** false면 저장하지 않고 유도하는 쌍이다. 차트 조회는 400이 난다. */
  readonly isStored: boolean | null;
  readonly deriveViaPairCode: string | null;
}

export interface AdminCurrencyMaster {
  readonly currencies: readonly AdminCurrency[];
  readonly currencyPairs: readonly AdminCurrencyPair[];
}

function toCurrency(row: AdminRecord): AdminCurrency {
  return {
    currencyCode: readString(row, "currencyCode"),
    nameKo: readString(row, "nameKo"),
    symbol: readString(row, "symbol"),
    minorUnits: readNumber(row, "minorUnits"),
    quoteUnit: readNumber(row, "quoteUnit"),
    usdSide: readString(row, "usdSide"),
    isHomeCurrency: readBoolean(row, "isHomeCurrency"),
    isSupported: readBoolean(row, "isSupported"),
    supportNote: readString(row, "supportNote"),
    colorToken: readString(row, "colorToken"),
    sortOrder: readNumber(row, "sortOrder"),
  };
}

function toCurrencyPair(row: AdminRecord): AdminCurrencyPair {
  return {
    pairCode: readString(row, "pairCode"),
    baseCurrencyCode: readString(row, "baseCurrencyCode"),
    quoteCurrencyCode: readString(row, "quoteCurrencyCode"),
    isStored: readBoolean(row, "isStored"),
    deriveViaPairCode: readString(row, "deriveViaPairCode"),
  };
}

export function normalizeAdminCurrencyMaster(
  data: unknown,
): AdminCurrencyMaster {
  const source = isRecord(data) ? data : {};
  return {
    currencies: readArray(source, "currencies").map(toCurrency),
    currencyPairs: readArray(source, "currencyPairs").map(toCurrencyPair),
  };
}

export async function fetchAdminCurrencies(): Promise<
  ApiResult<AdminCurrencyMaster>
> {
  const result = await requestWithMeta<unknown>(`${ADMIN_BASE}/currencies`);
  return {
    data: normalizeAdminCurrencyMaster(result.data),
    meta: result.meta,
  };
}

/* ------------------------------------------------------------------ *
 * 2-4. 환율 조회
 * ------------------------------------------------------------------ */

/**
 * 스키마에 있는 고시 종류.
 *
 * 현재 적재되는 것은 `mid` 하나뿐이고, 나머지는 스키마에만 있어 0건이 정상이다.
 */
export const ADMIN_RATE_TYPES = [
  "mid",
  "tt_buy",
  "tt_sell",
  "cash_buy",
  "cash_sell",
] as const;

export const ADMIN_STORED_RATE_TYPE = "mid";

export interface AdminFxRatePoint {
  /** 고시일. `fetchedAt`(우리가 가져온 시각)과 다른 값이다. */
  readonly quoteDate: string | null;
  /** 1 외화당 원화. */
  readonly rate: number | null;
  readonly dataSource: string | null;
  readonly fetchedAt: string | null;
}

/** 조회 조건을 서버가 되돌려준다. 화면은 이 값을 그대로 보여준다. */
export interface AdminFxRateSeries {
  readonly pairCode: string | null;
  readonly rateType: string | null;
  readonly from: string | null;
  readonly to: string | null;
  readonly count: number | null;
  readonly points: readonly AdminFxRatePoint[];
}

export function normalizeAdminFxRates(data: unknown): AdminFxRateSeries {
  const source = isRecord(data) ? data : {};
  return {
    pairCode: readString(source, "pairCode"),
    rateType: readString(source, "rateType"),
    from: readString(source, "from"),
    to: readString(source, "to"),
    count: readNumber(source, "count"),
    points: readArray(source, "points").map((row) => ({
      quoteDate: readString(row, "quoteDate"),
      rate: readNumber(row, "rate"),
      dataSource: readString(row, "dataSource"),
      fetchedAt: readString(row, "fetchedAt"),
    })),
  };
}

export interface AdminFxRateQuery {
  readonly pairCode: string;
  /** 생략하면 서버가 오늘 기준 1년으로 잡는다. */
  readonly from?: string;
  readonly to?: string;
  readonly rateType: string;
}

export async function fetchAdminFxRates(
  query: AdminFxRateQuery,
): Promise<ApiResult<AdminFxRateSeries>> {
  const result = await requestWithMeta<unknown>(
    apiPath(`${ADMIN_BASE}/fx-rates`, {
      pairCode: query.pairCode,
      from: query.from === "" ? undefined : query.from,
      to: query.to === "" ? undefined : query.to,
      rateType: query.rateType,
    }),
  );
  return { data: normalizeAdminFxRates(result.data), meta: result.meta };
}

/* ------------------------------------------------------------------ *
 * 2-4. 수동 갱신
 * ------------------------------------------------------------------ */

/** 통화쌍 하나의 갱신 결과. `failureReason`이 있으면 실패다. */
export interface AdminFxRefreshPair {
  readonly pairCode: string | null;
  readonly upserted: number | null;
  readonly firstDate: string | null;
  readonly lastDate: string | null;
  readonly failureReason: string | null;
}

export interface AdminFxRefreshReport {
  readonly evictedCaches: readonly string[];
  readonly totalUpserted: number | null;
  readonly hasFailure: boolean | null;
  readonly refreshedAt: string | null;
  readonly elapsedMs: number | null;
  readonly pairs: readonly AdminFxRefreshPair[];
}

export function normalizeAdminFxRefresh(data: unknown): AdminFxRefreshReport {
  const source = isRecord(data) ? data : {};
  return {
    evictedCaches: readStringArray(source, "evictedCaches"),
    totalUpserted: readNumber(source, "totalUpserted"),
    hasFailure: readBoolean(source, "hasFailure"),
    refreshedAt: readString(source, "refreshedAt"),
    elapsedMs: readNumber(source, "elapsedMs"),
    pairs: readArray(source, "pairs").map((row) => ({
      pairCode: readString(row, "pairCode"),
      upserted: readNumber(row, "upserted"),
      firstDate: readString(row, "firstDate"),
      lastDate: readString(row, "lastDate"),
      failureReason: readString(row, "failureReason"),
    })),
  };
}

/** ECOS 환율 갱신. 대상 통화쌍은 서버가 정하고, 거슬러 올라갈 일수만 받는다. */
export async function refreshAdminFxRates(
  lookbackDays: number,
): Promise<ApiResult<AdminFxRefreshReport>> {
  const result = await requestWithMeta<unknown>(
    apiPath(`${ADMIN_BASE}/fx-rates/refresh`, { lookbackDays }),
    { method: "POST" },
  );
  return { data: normalizeAdminFxRefresh(result.data), meta: result.meta };
}

/** FRED 시리즈 하나의 조회 결과. 저장되지 않는다. */
export interface AdminMacroSeries {
  readonly seriesId: string | null;
  readonly value: number | null;
  readonly asOf: string | null;
  readonly source: string | null;
  readonly fetchedAt: string | null;
  readonly failureReason: string | null;
}

export interface AdminMacroRefreshReport {
  readonly evictedCaches: readonly string[];
  readonly refreshedAt: string | null;
  readonly elapsedMs: number | null;
  readonly series: readonly AdminMacroSeries[];
}

export function normalizeAdminMacroRefresh(
  data: unknown,
): AdminMacroRefreshReport {
  const source = isRecord(data) ? data : {};
  return {
    evictedCaches: readStringArray(source, "evictedCaches"),
    refreshedAt: readString(source, "refreshedAt"),
    elapsedMs: readNumber(source, "elapsedMs"),
    series: readArray(source, "series").map((row) => ({
      seriesId: readString(row, "seriesId"),
      value: readNumber(row, "value"),
      asOf: readString(row, "asOf"),
      source: readString(row, "source"),
      fetchedAt: readString(row, "fetchedAt"),
      failureReason: readString(row, "failureReason"),
    })),
  };
}

/**
 * FRED 거시지표 갱신. **저장하지 않는다** — 연동이 살아 있는지 보는 용도다.
 * `seriesIds`는 비어 있으면 서버가 400을 준다.
 */
export async function refreshAdminMacro(
  seriesIds: readonly string[],
): Promise<ApiResult<AdminMacroRefreshReport>> {
  const result = await requestWithMeta<unknown>(`${ADMIN_BASE}/macro/refresh`, {
    method: "POST",
    body: { seriesIds },
  });
  return { data: normalizeAdminMacroRefresh(result.data), meta: result.meta };
}

/* ------------------------------------------------------------------ *
 * 2-5(b). 비정형 데이터 정형화 미리보기
 * ------------------------------------------------------------------ */

/** 추출기가 꺼져 있을 때 서버가 돌려주는 구현 이름. */
export const NOOP_EXTRACTOR = "NoOpEconEventExtractor";

/**
 * 후보 하나. `eventDate`·`region`·`impact`는 **검증 전 원시값**이라
 * 형식이 어긋난 문자열이나 null이 올 수 있다. 정규화하지 않고 그대로 담는다.
 */
export interface AdminExtractCandidate {
  readonly eventDate: string | null;
  readonly region: string | null;
  readonly title: string | null;
  readonly impact: number | null;
  readonly valid: boolean | null;
  readonly rejectReason: string | null;
}

export interface AdminExtractPreview {
  /** 응답한 추출기 구현 이름. `NoOpEconEventExtractor`면 꺼져 있다는 뜻. */
  readonly extractor: string | null;
  readonly count: number | null;
  readonly previewedAt: string | null;
  readonly candidates: readonly AdminExtractCandidate[];
}

export function normalizeAdminExtractPreview(
  data: unknown,
): AdminExtractPreview {
  const source = isRecord(data) ? data : {};
  return {
    extractor: readString(source, "extractor"),
    count: readNumber(source, "count"),
    previewedAt: readString(source, "previewedAt"),
    candidates: readArray(source, "candidates").map((row) => ({
      eventDate: readString(row, "eventDate"),
      region: readString(row, "region"),
      title: readString(row, "title"),
      impact: readNumber(row, "impact"),
      valid: readBoolean(row, "valid"),
      rejectReason: readString(row, "rejectReason"),
    })),
  };
}

export interface AdminExtractRequest {
  /** 선택. 손으로 붙여넣은 원문에는 없을 수 있다. */
  readonly sourceUrl: string;
  readonly text: string;
}

/** 원문 최대 길이. 서버 검증과 같은 값이다. */
export const ADMIN_EXTRACT_TEXT_MAX_LENGTH = 20_000;

export async function previewAdminExtraction(
  input: AdminExtractRequest,
): Promise<ApiResult<AdminExtractPreview>> {
  const result = await requestWithMeta<unknown>(
    `${ADMIN_BASE}/ai/extract-preview`,
    { method: "POST", body: input },
  );
  return {
    data: normalizeAdminExtractPreview(result.data),
    meta: result.meta,
  };
}
