import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiPath,
  apiUrl,
  request,
  requestWithMeta,
  resolveApiBaseUrl,
  toCamelCase,
  toSnakeCase,
} from "./client";
import { clearApiSession, saveApiSession } from "./session";
import { registerSessionRefresher } from "./client";

const env = { VITE_API_URL: "https://api.test/" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  clearApiSession();
  registerSessionRefresher(null);
});

afterEach(() => {
  clearApiSession();
  registerSessionRefresher(null);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("API URL helpers", () => {
  it("환경변수 URL을 정규화하고 경로를 결합한다", () => {
    expect(resolveApiBaseUrl(env)).toBe("https://api.test");
    expect(apiUrl("/goals", env)).toBe("https://api.test/goals");
  });

  it("환경변수 누락을 알리고 기본 import.meta.env를 사용한다", () => {
    expect(() => resolveApiBaseUrl({ VITE_API_URL: "" })).toThrow(/VITE_API_URL/);
    vi.stubEnv("VITE_API_URL", "https://env.test");
    expect(resolveApiBaseUrl()).toBe("https://env.test");
    expect(apiUrl("plans")).toBe("https://env.test/plans");
  });

  it("정의된 쿼리 값만 URL에 인코딩한다", () => {
    expect(
      apiPath("/forecast", {
        pairCode: "USD/KRW",
        horizon: 30,
        enabled: true,
        omitted: undefined,
      }),
    ).toBe("/forecast?pair_code=USD%2FKRW&horizon=30&enabled=true");
    expect(apiPath("/events", { omitted: undefined })).toBe("/events");
  });
});

describe("API key conversion", () => {
  it("응답 객체, 배열과 원시값을 camelCase로 바꾼다", () => {
    expect(toCamelCase([{ user_id: 1, nested_obj: { first_name: "a" } }])).toEqual([
      { userId: 1, nestedObj: { firstName: "a" } },
    ]);
    expect(toCamelCase(42)).toBe(42);
    expect(toCamelCase(null)).toBeNull();
  });

  it("요청 객체, 배열과 원시값을 snake_case로 바꾼다", () => {
    expect(toSnakeCase([{ userId: 1, nestedObj: { firstName: "a" } }])).toEqual([
      { user_id: 1, nested_obj: { first_name: "a" } },
    ]);
    expect(toSnakeCase("plain")).toBe("plain");
    expect(toSnakeCase(null)).toBeNull();
  });

  // 백엔드는 숫자 경계에도 밑줄을 넣는다(`vol_30d`, `interval_80`).
  // 밑줄 뒤 숫자는 대문자화되지 않으므로 밑줄만 사라진다 — 이 대응표를
  // 고정해두지 않으면 타입 선언이 실제 응답 키와 어긋나도 드러나지 않는다.
  it.each([
    ["interval_80", "interval80"],
    ["vol_30d", "vol30d"],
    ["vol_percentile_5y", "volPercentile5y"],
    ["per_1pct_krw", "per1pctKrw"],
    ["coverage_80", "coverage80"],
    ["sensitivity_1pct", "sensitivity1pct"],
    ["sensitivity_1pct_krw", "sensitivity1pctKrw"],
    ["worst_5_rate", "worst5Rate"],
    ["p50_lo", "p50Lo"],
    ["p80_hi", "p80Hi"],
  ])("숫자 경계 응답 키 %s를 %s로 바꾼다", (snakeKey, camelKey) => {
    expect(toCamelCase({ [snakeKey]: 1 })).toEqual({ [camelKey]: 1 });
  });

  // camelToSnakeKey는 대문자 앞에만 밑줄을 넣으므로 숫자 경계를 복원하지
  // 못한다(`vol30d` → `vol30d`). 응답 전용 필드라 현재는 문제가 없지만,
  // 요청 바디에 숫자 경계 필드가 생기면 백엔드가 읽지 못한다.
  it("요청 변환은 숫자 경계 밑줄을 복원하지 못한다", () => {
    expect(toSnakeCase({ vol30d: 1, interval80: 2 })).toEqual({
      vol30d: 1,
      interval80: 2,
    });
  });
});

describe("ApiError", () => {
  it("상태와 기본 또는 서버 오류 코드를 보존한다", () => {
    expect(new ApiError("실패", 500)).toMatchObject({
      name: "ApiError",
      message: "실패",
      status: 500,
      code: "HTTP_ERROR",
    });
    expect(new ApiError("실패", 400, "VALIDATION").code).toBe("VALIDATION");
  });
});

describe("request", () => {
  it("Bearer 인증, 요청 키 변환, 응답 언래핑과 메타 변환을 수행한다", async () => {
    saveApiSession({
      accessToken: "access",
      refreshToken: "refresh",
      expiresIn: 1800,
      isDemo: true,
      onboarded: true,
    });
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: { created_at: "t" },
        meta: { asOf: "now", source_names: ["server"] },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestWithMeta<{ createdAt: string }>(
      "/api/v1/x",
      { method: "POST", body: { goalId: "g1" } },
      env,
    );

    expect(result).toEqual({
      data: { createdAt: "t" },
      meta: { asOf: "now", sourceNames: ["server"] },
    });
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(requestInit.headers);
    expect(headers.get("Authorization")).toBe("Bearer access");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Accept")).toBe("application/json");
    expect(requestInit.body).toBe('{"goal_id":"g1"}');
  });

  it("공개 GET은 토큰과 본문 없이 호출하고 data만 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ data: [{ created_at: "t" }], meta: {} }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      request<{ createdAt: string }[]>(
        "/api/v1/y",
        { requiresAuth: false },
        env,
      ),
    ).resolves.toEqual([{ createdAt: "t" }]);
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(requestInit.headers);
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.has("Content-Type")).toBe(false);
    expect(requestInit.body).toBeUndefined();
  });

  it("토큰이 필요한 요청은 fetch 전에 인증 오류를 던진다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(request("/private", {}, env)).rejects.toMatchObject({
      status: 401,
      code: "AUTH_REQUIRED",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("토큰이 없으면 갱신자를 먼저 불러 새 토큰으로 요청한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { ok: true } }));
    vi.stubGlobal("fetch", fetchMock);
    registerSessionRefresher(async () => {
      saveApiSession({
        accessToken: "renewed",
        refreshToken: "r",
        expiresIn: 1800,
        isDemo: true,
        onboarded: true,
      });
      return "renewed";
    });

    await expect(request("/private", {}, env)).resolves.toEqual({ ok: true });
    const headers = new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit).headers);
    expect(headers.get("Authorization")).toBe("Bearer renewed");
  });

  it("갱신자가 토큰을 주지 못하면 인증 오류를 던진다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    registerSessionRefresher(async () => null);

    await expect(request("/private", {}, env)).rejects.toMatchObject({
      status: 401,
      code: "AUTH_REQUIRED",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("갱신자가 실패하면 인증 오류를 던진다", async () => {
    vi.stubGlobal("fetch", vi.fn());
    registerSessionRefresher(() => Promise.reject(new Error("boom")));

    await expect(request("/private", {}, env)).rejects.toMatchObject({
      status: 401,
      code: "AUTH_REQUIRED",
    });
  });

  it("서버가 401을 주면 한 번 갱신해 재요청한다", async () => {
    saveApiSession({
      accessToken: "stale",
      refreshToken: "r",
      expiresIn: 1800,
      isDemo: true,
      onboarded: true,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } }, 401),
      )
      .mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));
    vi.stubGlobal("fetch", fetchMock);
    registerSessionRefresher(async () => {
      saveApiSession({
        accessToken: "renewed",
        refreshToken: "r",
        expiresIn: 1800,
        isDemo: true,
        onboarded: true,
      });
      return "renewed";
    });

    await expect(request("/private", {}, env)).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryHeaders = new Headers(
      (fetchMock.mock.calls[1]?.[1] as RequestInit).headers,
    );
    expect(retryHeaders.get("Authorization")).toBe("Bearer renewed");
  });

  it("재요청도 401이면 더 갱신하지 않고 서버 오류를 던진다", async () => {
    saveApiSession({
      accessToken: "stale",
      refreshToken: "r",
      expiresIn: 1800,
      isDemo: true,
      onboarded: true,
    });
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } }, 401),
    );
    vi.stubGlobal("fetch", fetchMock);
    const refresher = vi.fn().mockResolvedValue("renewed");
    registerSessionRefresher(refresher);

    await expect(request("/private", {}, env)).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refresher).toHaveBeenCalledTimes(1);
  });

  it("갱신자가 없으면 401을 그대로 던진다", async () => {
    saveApiSession({
      accessToken: "stale",
      refreshToken: "r",
      expiresIn: 1800,
      isDemo: true,
      onboarded: true,
    });
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } }, 401),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(request("/private", {}, env)).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("서버의 구조화된 오류와 일반 HTTP 오류를 변환한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: "NOT_FOUND", message: "찾을 수 없습니다." } },
          404,
        ),
      )
      .mockResolvedValueOnce(new Response("not-json", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      request("/missing", { requiresAuth: false }, env),
    ).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
      message: "찾을 수 없습니다.",
    });
    await expect(
      request("/bad-gateway", { requiresAuth: false }, env),
    ).rejects.toMatchObject({ status: 502, code: "HTTP_ERROR" });
  });

  it("네트워크 실패와 잘못된 성공 응답을 구분한다", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(jsonResponse({ meta: { asOf: "now" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      request("/offline", { requiresAuth: false }, env),
    ).rejects.toMatchObject({ code: "NETWORK_ERROR", status: 0 });
    await expect(
      request("/invalid", { requiresAuth: false }, env),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("204 응답과 메타가 없는 정상 응답을 처리한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ data: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      request<void>("/delete", { requiresAuth: false }, env),
    ).resolves.toBeUndefined();
    await expect(
      requestWithMeta<string>("/ok", { requiresAuth: false }, env),
    ).resolves.toEqual({ data: "ok", meta: { asOf: "" } });
  });
});
