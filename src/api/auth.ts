import { request } from "./client";
import type {
  LoginRequest,
  RefreshRequest,
  SignupRequest,
  TokenResponse,
} from "./generated/divurve-api";
import {
  clearApiSession,
  readStoredApiSession,
  saveApiSession,
  type ApiSession,
  type SessionPersistence,
} from "./session";

async function authenticate(
  path: string,
  body: LoginRequest | SignupRequest | RefreshRequest | undefined,
  persistence: SessionPersistence,
): Promise<ApiSession> {
  const session = await request<TokenResponse>(path, {
    method: "POST",
    body,
    requiresAuth: false,
  });
  saveApiSession(session, persistence);
  return session;
}

export function login(
  input: LoginRequest,
  persistence: SessionPersistence = "session",
): Promise<ApiSession> {
  return authenticate("/api/v1/auth/login", input, persistence);
}

export function signup(
  input: SignupRequest,
  persistence: SessionPersistence = "session",
): Promise<ApiSession> {
  return authenticate("/api/v1/auth/signup", input, persistence);
}

export function startDemoSession(): Promise<ApiSession> {
  return authenticate("/api/v1/auth/demo", undefined, "session");
}

/**
 * 리프레시 토큰으로 세션을 갱신한다.
 *
 * 액세스 토큰이 만료돼도 리프레시 토큰은 살아 있을 수 있으므로
 * 만료를 따지지 않는 `readStoredApiSession()`으로 읽는다.
 */
export async function refreshSession(): Promise<ApiSession> {
  const current = readStoredApiSession();
  if (!current) {
    throw new Error("갱신할 API 세션이 없습니다.");
  }
  return authenticate(
    "/api/v1/auth/refresh",
    { refreshToken: current.refreshToken },
    "session",
  );
}

export function logout(): void {
  clearApiSession();
}

export type { LoginRequest, SignupRequest } from "./generated/divurve-api";
