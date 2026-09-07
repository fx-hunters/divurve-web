import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  API_SESSION_STORAGE_KEY,
  SESSION_EXPIRY_SKEW_MS,
  clearApiSession,
  getApiAccessToken,
  isSessionExpired,
  readApiSession,
  readStoredApiSession,
  saveApiSession,
  type ApiSession,
  type StoredApiSession,
} from "./session";

const session: ApiSession = {
  accessToken: "access",
  refreshToken: "refresh",
  expiresIn: 1800,
  isDemo: true,
  onboarded: true,
};

const NOW = 1_800_000_000_000;

function storedAt(now: number, overrides: Partial<StoredApiSession> = {}) {
  return { ...session, expiresAt: now + session.expiresIn * 1000, ...overrides };
}

beforeEach(() => {
  clearApiSession();
  vi.spyOn(Date, "now").mockReturnValue(NOW);
});
afterEach(() => {
  vi.restoreAllMocks();
  clearApiSession();
});

describe("isSessionExpired", () => {
  it("만료 시각까지 여유가 있으면 유효하다", () => {
    expect(isSessionExpired(storedAt(NOW), NOW)).toBe(false);
  });

  it("남은 시간이 여유분 이하면 이미 만료된 것으로 본다", () => {
    const almost = { ...session, expiresAt: NOW + SESSION_EXPIRY_SKEW_MS };
    expect(isSessionExpired(almost, NOW)).toBe(true);
  });

  it("만료 시각이 지났으면 만료다", () => {
    expect(isSessionExpired({ ...session, expiresAt: NOW - 1 }, NOW)).toBe(true);
  });

  it("now를 넘기지 않으면 현재 시각을 쓴다", () => {
    expect(isSessionExpired({ ...session, expiresAt: NOW - 1 })).toBe(true);
  });
});

describe("API session storage", () => {
  it("만료 시각을 함께 저장하고 세션·로컬 저장소를 선택한다", () => {
    const stored = saveApiSession(session);
    expect(stored.expiresAt).toBe(NOW + 1_800_000);
    expect(readApiSession()).toEqual(stored);
    expect(getApiAccessToken()).toBe("access");
    expect(sessionStorage.getItem(API_SESSION_STORAGE_KEY)).toContain("access");

    saveApiSession({ ...session, accessToken: "local" }, "local");
    expect(readApiSession()?.accessToken).toBe("local");
    expect(sessionStorage.getItem(API_SESSION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(API_SESSION_STORAGE_KEY)).toContain("local");
  });

  it("now를 넘기지 않으면 현재 시각 기준으로 만료 시각을 계산한다", () => {
    expect(saveApiSession(session, "session").expiresAt).toBe(NOW + 1_800_000);
  });

  it("메모리 세션이 없으면 유효한 저장값을 읽고 잘못된 값은 무시한다", () => {
    clearApiSession();
    sessionStorage.setItem(API_SESSION_STORAGE_KEY, JSON.stringify(storedAt(NOW)));
    expect(readApiSession()).toEqual(storedAt(NOW));

    clearApiSession();
    sessionStorage.setItem(API_SESSION_STORAGE_KEY, "not-json");
    localStorage.setItem(API_SESSION_STORAGE_KEY, JSON.stringify(storedAt(NOW)));
    expect(readApiSession()).toEqual(storedAt(NOW));

    clearApiSession();
    sessionStorage.setItem(API_SESSION_STORAGE_KEY, JSON.stringify({ accessToken: 1 }));
    expect(readApiSession()).toBeNull();
  });

  it("만료 시각이 없는 예전 형식은 버린다", () => {
    clearApiSession();
    sessionStorage.setItem(API_SESSION_STORAGE_KEY, JSON.stringify(session));
    expect(readStoredApiSession()).toBeNull();
    expect(readApiSession()).toBeNull();
  });

  it("만료된 세션은 읽히지 않지만 갱신용으로는 남아 있다", () => {
    clearApiSession();
    const expired = { ...session, expiresAt: NOW - 1 };
    sessionStorage.setItem(API_SESSION_STORAGE_KEY, JSON.stringify(expired));

    expect(readApiSession()).toBeNull();
    expect(getApiAccessToken()).toBeNull();
    expect(readStoredApiSession()).toEqual(expired);
  });

  it("빈 저장소와 객체가 아닌 값은 세션으로 해석하지 않는다", () => {
    expect(readApiSession()).toBeNull();
    sessionStorage.setItem(API_SESSION_STORAGE_KEY, "null");
    expect(readApiSession()).toBeNull();
  });

  it("브라우저 저장소가 차단되어도 메모리 세션을 사용하고 정리를 시도한다", () => {
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    saveApiSession(session);
    expect(readApiSession()).toEqual(storedAt(NOW));
    setSpy.mockRestore();

    clearApiSession();
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readApiSession()).toBeNull();
    getSpy.mockRestore();

    const removeSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => clearApiSession()).not.toThrow();
    removeSpy.mockRestore();
  });
});
