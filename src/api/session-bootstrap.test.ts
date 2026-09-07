import { beforeEach, describe, expect, it, vi } from "vitest";
import { refreshSession, startDemoSession } from "./auth";
import { registerSessionRefresher, type SessionRefresher } from "./client";
import { clearApiSession, readApiSession } from "./session";
import { ensureApiSession, installSessionRefresh } from "./session-bootstrap";

vi.mock("./auth", () => ({
  refreshSession: vi.fn(),
  startDemoSession: vi.fn(),
}));
vi.mock("./client", () => ({ registerSessionRefresher: vi.fn() }));
vi.mock("./session", () => ({
  clearApiSession: vi.fn(),
  readApiSession: vi.fn(),
}));

/** `installSessionRefresh()`가 client에 등록한 갱신자를 꺼낸다. */
function registeredRefresher(): SessionRefresher {
  installSessionRefresh();
  const [call] = vi.mocked(registerSessionRefresher).mock.calls;
  if (!call?.[0]) throw new Error("갱신자가 등록되지 않았습니다.");
  return call[0];
}

const DEMO_SESSION = {
  accessToken: "demo",
  refreshToken: "refresh",
  expiresIn: 1800,
  isDemo: true,
  onboarded: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readApiSession).mockReturnValue(null);
  vi.mocked(startDemoSession).mockResolvedValue(DEMO_SESSION);
});

describe("ensureApiSession", () => {
  it("저장된 세션이 있으면 발급 요청 없이 그대로 사용한다", async () => {
    const member = { ...DEMO_SESSION, isDemo: false };
    vi.mocked(readApiSession).mockReturnValue(member);

    await expect(ensureApiSession()).resolves.toBe(member);
    expect(startDemoSession).not.toHaveBeenCalled();
  });

  it("세션이 없으면 BE 데모 계정 세션을 발급받는다", async () => {
    await expect(ensureApiSession()).resolves.toBe(DEMO_SESSION);
    expect(startDemoSession).toHaveBeenCalledTimes(1);
  });

  it("동시에 여러 번 호출해도 발급 요청은 한 번만 나간다", async () => {
    const [first, second] = await Promise.all([
      ensureApiSession(),
      ensureApiSession(),
    ]);

    expect(first).toBe(DEMO_SESSION);
    expect(second).toBe(DEMO_SESSION);
    expect(startDemoSession).toHaveBeenCalledTimes(1);
  });

  it("발급에 실패하면 다음 호출이 다시 시도할 수 있다", async () => {
    vi.mocked(startDemoSession).mockRejectedValueOnce(new Error("network"));

    await expect(ensureApiSession()).rejects.toThrow("network");
    await expect(ensureApiSession()).resolves.toBe(DEMO_SESSION);
    expect(startDemoSession).toHaveBeenCalledTimes(2);
  });

  it("세션을 확보하면서 401 갱신자를 client에 등록한다", async () => {
    await ensureApiSession();
    expect(registerSessionRefresher).toHaveBeenCalledWith(expect.any(Function));
  });
});

describe("installSessionRefresh", () => {
  it("등록된 갱신자는 새 액세스 토큰을 돌려준다", async () => {
    vi.mocked(refreshSession).mockResolvedValue({
      ...DEMO_SESSION,
      accessToken: "renewed",
    });

    await expect(registeredRefresher()()).resolves.toBe("renewed");
    expect(clearApiSession).not.toHaveBeenCalled();
  });

  it("갱신에 실패하면 남은 세션을 버리고 null을 돌려준다", async () => {
    vi.mocked(refreshSession).mockRejectedValue(new Error("expired"));

    await expect(registeredRefresher()()).resolves.toBeNull();
    expect(clearApiSession).toHaveBeenCalledTimes(1);
  });

  it("동시에 여러 요청이 갱신을 요청해도 한 번만 나간다", async () => {
    vi.mocked(refreshSession).mockResolvedValue({
      ...DEMO_SESSION,
      accessToken: "renewed",
    });
    const refresh = registeredRefresher();

    await Promise.all([refresh(), refresh()]);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });
});
