import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "./client";
import {
  clearApiSession,
  readStoredApiSession,
  saveApiSession,
} from "./session";
import {
  login,
  logout,
  refreshSession,
  signup,
  startDemoSession,
} from "./auth";

vi.mock("./client", () => ({ request: vi.fn() }));
vi.mock("./session", () => ({
  clearApiSession: vi.fn(),
  readStoredApiSession: vi.fn(),
  saveApiSession: vi.fn(),
}));

const apiSession = {
  accessToken: "access",
  refreshToken: "refresh",
  expiresIn: 1800,
  isDemo: false,
  onboarded: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(request).mockResolvedValue(apiSession);
});

describe("auth API", () => {
  it("로그인과 회원가입 결과를 선택한 저장소에 보관한다", async () => {
    await expect(login({ email: "a@b.com", password: "pw" }, "local")).resolves.toEqual(apiSession);
    expect(request).toHaveBeenCalledWith("/api/v1/auth/login", {
      method: "POST",
      body: { email: "a@b.com", password: "pw" },
      requiresAuth: false,
    });
    expect(saveApiSession).toHaveBeenCalledWith(apiSession, "local");

    await signup({ email: "a@b.com", password: "pw", name: "A" });
    expect(request).toHaveBeenCalledWith("/api/v1/auth/signup", expect.any(Object));
    expect(saveApiSession).toHaveBeenLastCalledWith(apiSession, "session");
  });

  it("데모 계정을 발급하고 로그아웃한다", async () => {
    await startDemoSession();
    expect(request).toHaveBeenCalledWith("/api/v1/auth/demo", {
      method: "POST",
      body: undefined,
      requiresAuth: false,
    });
    logout();
    expect(clearApiSession).toHaveBeenCalledOnce();
  });

  it("만료된 세션이라도 refresh token으로 갱신을 요청한다", async () => {
    vi.mocked(readStoredApiSession).mockReturnValue({
      ...apiSession,
      expiresAt: 0,
    });
    await refreshSession();
    expect(request).toHaveBeenCalledWith("/api/v1/auth/refresh", {
      method: "POST",
      body: { refreshToken: "refresh" },
      requiresAuth: false,
    });
  });

  it("세션이 없으면 갱신 요청을 보내지 않는다", async () => {
    vi.mocked(readStoredApiSession).mockReturnValue(null);
    await expect(refreshSession()).rejects.toThrow("갱신할 API 세션이 없습니다.");
    expect(request).not.toHaveBeenCalled();
  });
});
