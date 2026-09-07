import { getApiAccessToken } from "./session";

type ApiEnv = Pick<ImportMetaEnv, "VITE_API_URL">;

/** 모든 응답이 함께 싣는 메타. 백엔드 `Meta` 스키마와 같은 형태다. */
export interface ApiMeta {
  /** 데이터 기준 시각(ISO 8601). 값이 없으면 빈 문자열. */
  readonly asOf: string;
  readonly dataState?: string;
  readonly sources?: readonly string[];
  readonly isDemo?: boolean;
  readonly regime?: string;
  readonly modelVersion?: string;
}

export interface ApiResult<T> {
  readonly data: T;
  readonly meta: ApiMeta;
}

interface ApiEnvelope {
  readonly data?: unknown;
  readonly meta?: unknown;
}

interface ApiErrorEnvelope {
  readonly error?: {
    readonly code?: unknown;
    readonly message?: unknown;
  };
}

export interface ApiRequestInit extends Omit<RequestInit, "body"> {
  readonly body?: unknown;
  readonly requiresAuth?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string = "HTTP_ERROR",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function resolveApiBaseUrl(env: ApiEnv = import.meta.env): string {
  const url = env.VITE_API_URL;
  if (!url) {
    throw new Error(
      "VITE_API_URL 환경변수가 설정되지 않았습니다. .env.example을 복사해 .env를 만드세요.",
    );
  }
  return url.replace(/\/+$/, "");
}

export function apiUrl(path: string, env?: ApiEnv): string {
  return `${resolveApiBaseUrl(env)}/${path.replace(/^\/+/, "")}`;
}

/**
 * 쿼리 문자열을 붙인다.
 *
 * 백엔드 쿼리 파라미터는 snake_case이므로(예: `pair_code`) 요청 바디와 같은
 * 규칙으로 여기서 한 번에 변환한다. 호출부는 camelCase만 쓴다.
 */
export function apiPath(
  path: string,
  params: Readonly<Record<string, string | number | boolean | undefined>>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(camelToSnakeKey(key), String(value));
  }
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_match, char: string) =>
    char.toUpperCase(),
  );
}

function camelToSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

export function toCamelCase(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toCamelCase);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        snakeToCamelKey(key),
        toCamelCase(nestedValue),
      ]),
    );
  }
  return value;
}

export function toSnakeCase(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toSnakeCase);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        camelToSnakeKey(key),
        toSnakeCase(nestedValue),
      ]),
    );
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseMeta(value: unknown): ApiMeta {
  const converted = toCamelCase(value);
  if (!isRecord(converted) || typeof converted.asOf !== "string") {
    return { asOf: "" };
  }
  return converted as unknown as ApiMeta;
}

function toApiError(payload: unknown, status: number): ApiError {
  const converted = toCamelCase(payload);
  const errorValue = isRecord(converted)
    ? (converted as ApiErrorEnvelope).error
    : undefined;
  const code = errorValue?.code;
  const message = errorValue?.message;
  return new ApiError(
    typeof message === "string"
      ? message
      : `요청이 실패했습니다 (HTTP ${status}).`,
    status,
    typeof code === "string" ? code : "HTTP_ERROR",
  );
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return { data: undefined, meta: { asOf: "" } };
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * 만료된 액세스 토큰을 갱신하고 새 토큰을 돌려준다. 갱신할 수 없으면 null.
 *
 * `api/auth.ts`가 `client.ts`를 쓰므로 반대 방향으로 직접 부르면 순환이 생긴다.
 * 그래서 갱신 수단을 밖에서 등록받는다(AGENTS.md §7.1).
 */
export type SessionRefresher = () => Promise<string | null>;

let sessionRefresher: SessionRefresher | null = null;

export function registerSessionRefresher(
  refresher: SessionRefresher | null,
): void {
  sessionRefresher = refresher;
}

const AUTH_REQUIRED_ERROR = () =>
  new ApiError(
    "로그인이 필요한 요청입니다. 로그인 후 다시 시도해 주세요.",
    401,
    "AUTH_REQUIRED",
  );

async function refreshAccessToken(): Promise<string | null> {
  if (sessionRefresher === null) return null;
  try {
    return await sessionRefresher();
  } catch {
    return null;
  }
}

export async function requestWithMeta<T>(
  path: string,
  init: ApiRequestInit = {},
  env?: ApiEnv,
): Promise<ApiResult<T>> {
  return sendRequest<T>(path, init, env, true);
}

async function sendRequest<T>(
  path: string,
  init: ApiRequestInit,
  env: ApiEnv | undefined,
  canRefresh: boolean,
): Promise<ApiResult<T>> {
  const {
    body,
    requiresAuth = true,
    headers: suppliedHeaders,
    ...requestInit
  } = init;
  const headers = new Headers(suppliedHeaders);
  headers.set("Accept", "application/json");
  if (body !== undefined) headers.set("Content-Type", "application/json");

  if (requiresAuth) {
    let accessToken = getApiAccessToken();
    if (!accessToken && canRefresh) {
      // 토큰이 만료돼 사라졌으면 네트워크를 타기 전에 먼저 갱신해 본다.
      accessToken = await refreshAccessToken();
    }
    if (!accessToken) {
      throw AUTH_REQUIRED_ERROR();
    }
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path, env), {
      ...requestInit,
      headers,
      body: body === undefined ? undefined : JSON.stringify(toSnakeCase(body)),
    });
  } catch {
    throw new ApiError(
      "서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.",
      0,
      "NETWORK_ERROR",
    );
  }

  if (response.status === 401 && requiresAuth && canRefresh) {
    // 서버가 토큰을 거절했다. 한 번만 갱신해 다시 보내고, 그래도 안 되면 던진다.
    const refreshed = await refreshAccessToken();
    if (refreshed !== null) {
      return sendRequest<T>(path, init, env, false);
    }
  }

  const payload = await parseResponseBody(response);
  if (!response.ok) throw toApiError(payload, response.status);
  if (!isRecord(payload) || !("data" in payload)) {
    throw new ApiError(
      "서버 응답 형식을 확인할 수 없습니다.",
      response.status,
      "INVALID_RESPONSE",
    );
  }

  return {
    data: toCamelCase((payload as ApiEnvelope).data) as T,
    meta: parseMeta((payload as ApiEnvelope).meta),
  };
}

export async function request<T>(
  path: string,
  init: ApiRequestInit = {},
  env?: ApiEnv,
): Promise<T> {
  return (await requestWithMeta<T>(path, init, env)).data;
}
