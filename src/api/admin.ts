/**
 * 임시 운영자용 관리자 콘솔 API (백엔드 이슈 fx-hunters/divurve-api#111).
 *
 * 백엔드는 응답을 `{ data, meta }`로 감싸 snake_case로 보내며, 언래핑·표기
 * 변환은 `client.ts`가 담당한다(AGENTS.md 4·5장). 이 모듈은 경계에서
 * "응답 모양을 잃지 않고" 화면으로 넘기는 일만 한다. 어떤 수치도 여기서
 * 만들거나 고치지 않는다.
 */
import { apiPath, requestWithMeta, type ApiResult } from "./client";
import {
  isRecord,
  readArray,
  readBoolean,
  readNumber,
  readString,
  readStringArray,
  type AdminRecord,
} from "./admin-record";

/** 화면이 `api/admin`에서 그대로 가져다 쓰던 타입이라 재수출한다. */
export type { AdminRecord };


const ADMIN_BASE = "/api/v1/admin";

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

/**
 * 마지막 갱신 시각 (백엔드 이슈 fx-hunters/divurve-api#128).
 *
 * 갱신 응답의 `refreshedAt`은 버튼을 누른 그 응답에만 실려 화면을 벗어나면
 * 사라진다. 이 조회는 서버에 남아 있는 값(`fx_rates.fetched_at`의 최댓값)을
 * 읽어 오므로, 스케줄러가 돌린 갱신도 함께 보인다.
 *
 * FRED는 결과를 저장하지 않아 서버 기준 마지막 갱신이 없다 — `macro`는
 * 당분간 `null`로 온다.
 */
export interface AdminFxPairStatus {
  readonly pairCode: string | null;
  readonly lastFetchedAt: string | null;
  readonly lastQuoteDate: string | null;
}

export interface AdminRefreshStatus {
  readonly fx: {
    readonly lastFetchedAt: string | null;
    readonly lastQuoteDate: string | null;
    readonly pairs: readonly AdminFxPairStatus[];
  };
  readonly macro: {
    readonly lastRefreshedAt: string | null;
  };
}

export function normalizeAdminRefreshStatus(data: unknown): AdminRefreshStatus {
  const source = isRecord(data) ? data : {};
  const fx = isRecord(source.fx) ? source.fx : {};
  const macro = isRecord(source.macro) ? source.macro : {};
  return {
    fx: {
      lastFetchedAt: readString(fx, "lastFetchedAt"),
      lastQuoteDate: readString(fx, "lastQuoteDate"),
      pairs: readArray(fx, "pairs").map((row) => ({
        pairCode: readString(row, "pairCode"),
        lastFetchedAt: readString(row, "lastFetchedAt"),
        lastQuoteDate: readString(row, "lastQuoteDate"),
      })),
    },
    macro: { lastRefreshedAt: readString(macro, "lastRefreshedAt") },
  };
}

/** 읽기 전용이다. 이 호출은 갱신을 일으키지 않는다. */
export async function fetchAdminRefreshStatus(): Promise<
  ApiResult<AdminRefreshStatus>
> {
  const result = await requestWithMeta<unknown>(
    `${ADMIN_BASE}/fx-rates/status`,
  );
  return { data: normalizeAdminRefreshStatus(result.data), meta: result.meta };
}

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
  /**
   * 서버가 URL로 본문을 수집했을 때만 채워지는 값
   * (백엔드 이슈 fx-hunters/divurve-api#129). 그 전까지는 모두 null이다.
   */
  readonly resolvedSourceUrl: string | null;
  readonly fetchedCharCount: number | null;
  readonly fetchedTextPreview: string | null;
  /** 수집·추출이 실패한 사유. HTTP는 200으로 온다. */
  readonly failureReason: string | null;
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
    resolvedSourceUrl: readString(source, "resolvedSourceUrl"),
    fetchedCharCount: readNumber(source, "fetchedCharCount"),
    fetchedTextPreview: readString(source, "fetchedTextPreview"),
    failureReason: readString(source, "failureReason"),
  };
}

/**
 * 둘 중 하나만 있어도 된다.
 *
 * `sourceUrl`만 보내면 서버가 본문을 수집해 추출한다. 둘 다 보내면 손으로
 * 붙여넣은 `text`가 우선한다(백엔드 이슈 fx-hunters/divurve-api#129).
 */
export interface AdminExtractRequest {
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

/* ------------------------------------------------------------------ *
 * 2-6. AI 호출 로그·사용량 집계
 * ------------------------------------------------------------------ */

/**
 * AI 호출 용도 (백엔드 이슈 fx-hunters/divurve-api#143).
 *
 * `narrate`는 사용자 요청마다 동기로 일어나고, `extract`는 배치에서 돈다 —
 * 비용 성격이 다른 두 경로라 집계에서 갈라 본다.
 */
export const ADMIN_AI_PURPOSES = ["narrate", "extract"] as const;

/**
 * 호출 결과 어휘.
 *
 * `cache_hit`(응답 캐시, divurve-api#139)·`quota_blocked`(쿼터, #140)는 백엔드가
 * 아직 만들지 않아 지금은 0건이다. 그래도 어휘에 넣어 두는 이유는, 그 기능이
 * 켜지는 날 화면이 값을 모르는 상태로 깨지지 않게 하기 위해서다.
 */
export const ADMIN_AI_OUTCOMES = [
  "success",
  "fallback",
  "cache_hit",
  "quota_blocked",
  "error",
] as const;

/** 한 페이지 최대 크기. 서버 검증(`AiCallLogQueryService.MAX_PAGE_SIZE`)과 같은 값이다. */
export const ADMIN_AI_CALLS_MAX_PAGE_SIZE = 200;

/**
 * 호출 한 건.
 *
 * `userId`가 null인 것은 정상값이다 — 데모 정리로 계정이 지워져도 비용 이력은
 * 남고(FK가 `on delete set null`), `extract`는 배치라 사용자가 없다.
 * `model`이 null이면 LLM을 부르지 않은 요청이라는 뜻이며 토큰이 0이다.
 */
export interface AdminAiCall {
  readonly id: string | null;
  readonly requestedAt: string | null;
  readonly userId: string | null;
  readonly isDemo: boolean | null;
  readonly purpose: string | null;
  readonly surface: string | null;
  readonly model: string | null;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  /** 프롬프트 캐싱을 쓰지 않으면 null. 캐싱은 단가가 달라 비용 계산이 바뀐다. */
  readonly cacheReadInputTokens: number | null;
  readonly cacheCreationInputTokens: number | null;
  readonly outcome: string | null;
  readonly fallbackReason: string | null;
  readonly latencyMs: number | null;
  readonly errorSummary: string | null;
}

export interface AdminAiCallPage {
  readonly items: readonly AdminAiCall[];
  readonly page: number | null;
  readonly size: number | null;
  readonly totalElements: number | null;
  readonly totalPages: number | null;
}

export function toAdminAiCall(row: AdminRecord): AdminAiCall {
  return {
    id: readString(row, "id"),
    requestedAt: readString(row, "requestedAt"),
    userId: readString(row, "userId"),
    isDemo: readBoolean(row, "isDemo"),
    purpose: readString(row, "purpose"),
    surface: readString(row, "surface"),
    model: readString(row, "model"),
    inputTokens: readNumber(row, "inputTokens"),
    outputTokens: readNumber(row, "outputTokens"),
    cacheReadInputTokens: readNumber(row, "cacheReadInputTokens"),
    cacheCreationInputTokens: readNumber(row, "cacheCreationInputTokens"),
    outcome: readString(row, "outcome"),
    fallbackReason: readString(row, "fallbackReason"),
    latencyMs: readNumber(row, "latencyMs"),
    errorSummary: readString(row, "errorSummary"),
  };
}

export function normalizeAdminAiCallPage(data: unknown): AdminAiCallPage {
  const source = isRecord(data) ? data : {};
  return {
    items: readArray(source, "items").map(toAdminAiCall),
    page: readNumber(source, "page"),
    size: readNumber(source, "size"),
    totalElements: readNumber(source, "totalElements"),
    totalPages: readNumber(source, "totalPages"),
  };
}

/**
 * 조회 조건.
 *
 * `from`·`to`는 ISO 8601 datetime이다. `purpose`·`outcome`에 어휘 밖의 값을
 * 보내면 빈 결과가 아니라 **400**이 온다 — 오타를 "그 기간에 호출이 없었다"로
 * 읽는 것을 서버가 막는다. `from > to`도 400이다.
 */
export interface AdminAiCallQuery {
  readonly page: number;
  readonly size: number;
  readonly from?: string;
  readonly to?: string;
  readonly purpose?: string;
  readonly surface?: string;
  readonly outcome?: string;
  /** `is_demo`로 전송된다. 생략하면 데모를 포함한 전체다. */
  readonly isDemo?: boolean;
}

/** 비어 있는 문자열은 조건을 걸지 않는다는 뜻이므로 보내지 않는다. */
function omitBlank(value: string | undefined): string | undefined {
  return value === undefined || value === "" ? undefined : value;
}

export async function fetchAdminAiCalls(
  query: AdminAiCallQuery,
): Promise<ApiResult<AdminAiCallPage>> {
  const result = await requestWithMeta<unknown>(
    apiPath(`${ADMIN_BASE}/ai/calls`, {
      from: omitBlank(query.from),
      to: omitBlank(query.to),
      purpose: omitBlank(query.purpose),
      surface: omitBlank(query.surface),
      outcome: omitBlank(query.outcome),
      isDemo: query.isDemo,
      page: query.page,
      size: query.size,
    }),
  );
  return { data: normalizeAdminAiCallPage(result.data), meta: result.meta };
}

/**
 * 하루·용도·모델별 집계 한 칸.
 *
 * `day`는 **UTC 기준**으로 자른 날짜다. 서울 기준으로 옮겨 읽으면 하루 경계가
 * 9시간 어긋나므로 서버가 준 문자열을 그대로 표시한다.
 * 비용 금액은 서버가 내지 않는다 — 토큰 수까지다.
 */
export interface AdminAiUsageBucket {
  readonly day: string | null;
  readonly purpose: string | null;
  readonly model: string | null;
  readonly calls: number | null;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
}

export interface AdminAiUsageSummary {
  readonly buckets: readonly AdminAiUsageBucket[];
}

export function normalizeAdminAiUsageSummary(
  data: unknown,
): AdminAiUsageSummary {
  const source = isRecord(data) ? data : {};
  return {
    buckets: readArray(source, "buckets").map((row) => ({
      day: readString(row, "day"),
      purpose: readString(row, "purpose"),
      model: readString(row, "model"),
      calls: readNumber(row, "calls"),
      inputTokens: readNumber(row, "inputTokens"),
      outputTokens: readNumber(row, "outputTokens"),
    })),
  };
}

export interface AdminAiUsageQuery {
  readonly from?: string;
  readonly to?: string;
}

export async function fetchAdminAiUsageSummary(
  query: AdminAiUsageQuery,
): Promise<ApiResult<AdminAiUsageSummary>> {
  const result = await requestWithMeta<unknown>(
    apiPath(`${ADMIN_BASE}/ai/usage-summary`, {
      from: omitBlank(query.from),
      to: omitBlank(query.to),
    }),
  );
  return {
    data: normalizeAdminAiUsageSummary(result.data),
    meta: result.meta,
  };
}
