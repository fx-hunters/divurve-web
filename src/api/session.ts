import type { TokenResponse } from "./generated/divurve-api";

export type SessionPersistence = "session" | "local";
export type ApiSession = TokenResponse;

/** 저장 시점에 계산한 만료 시각(epoch ms)을 함께 들고 있는 세션. */
export interface StoredApiSession extends ApiSession {
  readonly expiresAt: number;
}

export const API_SESSION_STORAGE_KEY = "divurve_api_session";

/**
 * 만료 직전 토큰으로 요청을 보내 중간에 401을 맞지 않도록 두는 여유.
 * 이 시간 안에 든 토큰은 이미 만료된 것으로 본다.
 */
export const SESSION_EXPIRY_SKEW_MS = 30_000;

let memorySession: StoredApiSession | null = null;

function isStoredApiSession(value: unknown): value is StoredApiSession {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<StoredApiSession>;
  return (
    typeof candidate.accessToken === "string" &&
    typeof candidate.refreshToken === "string" &&
    typeof candidate.expiresIn === "number" &&
    typeof candidate.isDemo === "boolean" &&
    // expiresAt이 없는 예전 형식은 만료를 판정할 수 없으므로 버린다.
    typeof candidate.expiresAt === "number"
  );
}

function readStorage(storage: Storage): StoredApiSession | null {
  try {
    const serialized = storage.getItem(API_SESSION_STORAGE_KEY);
    if (!serialized) return null;
    const parsed: unknown = JSON.parse(serialized);
    return isStoredApiSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isSessionExpired(
  session: StoredApiSession,
  now: number = Date.now(),
): boolean {
  return session.expiresAt - SESSION_EXPIRY_SKEW_MS <= now;
}

/**
 * 만료 여부와 무관하게 저장된 세션을 읽는다.
 *
 * 액세스 토큰이 만료돼도 리프레시 토큰은 살아 있을 수 있으므로,
 * 갱신 경로에서는 이쪽을 쓴다.
 */
export function readStoredApiSession(): StoredApiSession | null {
  return memorySession ?? readStorage(sessionStorage) ?? readStorage(localStorage);
}

/** 지금 바로 쓸 수 있는 세션만 돌려준다. 만료됐으면 null이다. */
export function readApiSession(): ApiSession | null {
  const stored = readStoredApiSession();
  if (stored === null || isSessionExpired(stored)) return null;
  return stored;
}

export function saveApiSession(
  session: ApiSession,
  persistence: SessionPersistence = "session",
  now: number = Date.now(),
): StoredApiSession {
  const stored: StoredApiSession = {
    ...session,
    expiresAt: now + session.expiresIn * 1000,
  };
  memorySession = stored;
  const target = persistence === "local" ? localStorage : sessionStorage;
  const other = persistence === "local" ? sessionStorage : localStorage;
  try {
    target.setItem(API_SESSION_STORAGE_KEY, JSON.stringify(stored));
    other.removeItem(API_SESSION_STORAGE_KEY);
  } catch {
    // 저장소가 차단된 환경에서는 현재 페이지의 메모리 상태만 사용한다.
  }
  return stored;
}

export function clearApiSession(): void {
  memorySession = null;
  for (const storage of [sessionStorage, localStorage]) {
    try {
      storage.removeItem(API_SESSION_STORAGE_KEY);
    } catch {
      // 차단된 저장소에는 지속 세션이 남지 않는다.
    }
  }
}

export function getApiAccessToken(): string | null {
  return readApiSession()?.accessToken ?? null;
}
