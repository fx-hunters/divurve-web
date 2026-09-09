/**
 * 플래너 화면의 배경 컨텍스트(`GET /api/v1/route/context`).
 *
 * 백엔드 `RouteController`가 "계산 없이 데이터 계약만 직렬화"하는 엔드포인트다.
 * 여기서 오는 기준 환율은 계획 계산이 쓴 것과 같은 전제이므로, 화면이 보는
 * 환율과 계획이 쓴 환율을 대조할 수 있다.
 *
 * 응답이 `NON_NULL` 직렬화라 값이 정해지지 않은 필드는 키 자체가 오지 않는다.
 * 그래서 모든 스칼라를 nullable로 받고, 없는 값은 숨기지 않고 없는 채로 둔다.
 */
import { request, requestWithMeta, type ApiResult } from "./client";

export interface RouteContextDiagnosis {
  readonly status: string | null;
  readonly grade: string | null;
  readonly score: number | null;
  readonly concentrationThreshold: number | null;
}

export interface RouteContextPortfolio {
  readonly totalAssetKrw: number | null;
  readonly fxAssetKrw: number | null;
  readonly fxRatio: number | null;
  /** 통화 코드별 비중. 값이 없으면 빈 객체다. */
  readonly exposure: Readonly<Record<string, number>>;
}

export interface RouteContextInterval {
  readonly lo: number | null;
  readonly hi: number | null;
}

/**
 * 기준 환율 요약.
 *
 * 방향 전망(모델 경로·요인)은 계약에 없다 — 전망을 계획 계산 입력으로 넘기지
 * 않는다는 규칙을 백엔드가 API 수준에서 막아 둔 것이다. 프론트도 이 값으로
 * 방향을 말하는 문구를 만들지 않는다.
 */
export interface RouteContextForecast {
  readonly pairCode: string | null;
  readonly baseRate: number | null;
  readonly interval80: RouteContextInterval | null;
  readonly vol30d: number | null;
  readonly baseDate: string | null;
}

export interface RouteContextStress {
  readonly lastRunId: string | null;
  readonly totalEffectKrw: number | null;
}

export interface RouteContextData {
  readonly asOf: string | null;
  readonly diagnosis: RouteContextDiagnosis | null;
  readonly portfolio: RouteContextPortfolio | null;
  readonly forecast: RouteContextForecast | null;
  readonly stress: RouteContextStress | null;
  readonly regime: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readRecord(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  const value = source[key];
  return isRecord(value) ? value : null;
}

function readString(
  source: Record<string, unknown>,
  key: string,
): string | null {
  const value = source[key];
  return typeof value === "string" ? value : null;
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
): number | null {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** 통화별 비중. 숫자가 아닌 값은 지어내지 않고 버린다. */
function readExposure(
  source: Record<string, unknown>,
): Readonly<Record<string, number>> {
  const exposure = readRecord(source, "exposure");
  if (exposure === null) return {};
  return Object.fromEntries(
    Object.entries(exposure).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]),
    ),
  );
}

function toDiagnosis(
  source: Record<string, unknown>,
): RouteContextDiagnosis | null {
  const row = readRecord(source, "diagnosis");
  if (row === null) return null;
  return {
    status: readString(row, "status"),
    grade: readString(row, "grade"),
    score: readNumber(row, "score"),
    concentrationThreshold: readNumber(row, "concentrationThreshold"),
  };
}

function toPortfolio(
  source: Record<string, unknown>,
): RouteContextPortfolio | null {
  const row = readRecord(source, "portfolio");
  if (row === null) return null;
  return {
    totalAssetKrw: readNumber(row, "totalAssetKrw"),
    fxAssetKrw: readNumber(row, "fxAssetKrw"),
    fxRatio: readNumber(row, "fxRatio"),
    exposure: readExposure(row),
  };
}

function toInterval(
  source: Record<string, unknown>,
): RouteContextInterval | null {
  const row = readRecord(source, "interval80");
  if (row === null) return null;
  return { lo: readNumber(row, "lo"), hi: readNumber(row, "hi") };
}

function toForecast(
  source: Record<string, unknown>,
): RouteContextForecast | null {
  const row = readRecord(source, "forecast");
  if (row === null) return null;
  return {
    pairCode: readString(row, "pairCode"),
    baseRate: readNumber(row, "baseRate"),
    interval80: toInterval(row),
    vol30d: readNumber(row, "vol30d"),
    baseDate: readString(row, "baseDate"),
  };
}

function toStress(source: Record<string, unknown>): RouteContextStress | null {
  const row = readRecord(source, "stress");
  if (row === null) return null;
  return {
    lastRunId: readString(row, "lastRunId"),
    totalEffectKrw: readNumber(row, "totalEffectKrw"),
  };
}

export function parseRouteContext(value: unknown): RouteContextData {
  const row = isRecord(value) ? value : {};
  return {
    asOf: readString(row, "asOf"),
    diagnosis: toDiagnosis(row),
    portfolio: toPortfolio(row),
    forecast: toForecast(row),
    stress: toStress(row),
    regime: readString(row, "regime"),
  };
}

/** 메타까지 필요할 때 쓴다. 기준 시각을 화면에 적는 경로가 여기다. */
export async function fetchRouteContextWithMeta(): Promise<
  ApiResult<RouteContextData>
> {
  const result = await requestWithMeta<unknown>("/api/v1/route/context");
  return { data: parseRouteContext(result.data), meta: result.meta };
}

export async function fetchRouteContext(): Promise<RouteContextData> {
  return parseRouteContext(await request<unknown>("/api/v1/route/context"));
}
