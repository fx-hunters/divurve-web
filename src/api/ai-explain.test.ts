import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeExplainResult, requestExplanation } from "./ai-explain";
import { clearApiSession, saveApiSession } from "./session";

function stubFetchResolving(data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data, meta: { as_of: "2026-09-07T00:00:00Z" } }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.stubEnv("VITE_API_URL", "https://api.test");
  saveApiSession(
    {
      accessToken: "token",
      refreshToken: "refresh",
      expiresIn: 1800,
      isDemo: false,
      onboarded: true,
    },
    "session",
  );
});

afterEach(() => {
  clearApiSession();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("normalizeExplainResult", () => {
  it("설명과 검증 결과를 읽는다", () => {
    const result = normalizeExplainResult({
      explanation: {
        sentences: ["문장1", "문장2", 3],
        sentenceCount: 2,
        explainLevel: "standard",
        explainDomain: "dev",
        fallback: true,
      },
      verification: { numericMatch: false, blockedPhrases: ["추천"] },
    });

    expect(result.explanation.sentences).toEqual(["문장1", "문장2"]);
    expect(result.explanation.fallback).toBe(true);
    expect(result.verification).toEqual({
      numericMatch: false,
      blockedPhrases: ["추천"],
    });
  });

  it("값이 없으면 null과 빈 목록으로 둔다", () => {
    expect(normalizeExplainResult(null)).toEqual({
      explanation: {
        sentences: [],
        sentenceCount: null,
        explainLevel: null,
        explainDomain: null,
        fallback: null,
      },
      verification: { numericMatch: null, blockedPhrases: [] },
    });
  });

  it("explanation·verification이 객체가 아니면 무시한다", () => {
    const result = normalizeExplainResult({
      explanation: "nope",
      verification: 3,
    });
    expect(result.explanation.sentenceCount).toBeNull();
    expect(result.verification.blockedPhrases).toEqual([]);
  });

  it("sentences가 배열이 아니면 빈 목록이다", () => {
    expect(
      normalizeExplainResult({ explanation: { sentences: "문장" } }).explanation
        .sentences,
    ).toEqual([]);
  });
});

describe("requestExplanation", () => {
  it("facts의 키를 바꾸지 않고 그대로 보낸다", async () => {
    const fetchMock = stubFetchResolving({ explanation: {}, verification: {} });

    await requestExplanation({
      surface: "forecast_summary",
      facts: { pair_code: "USDKRW", interval_80: { lo: 1, hi: 2 }, camelKey: 1 },
    });

    const call = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
    expect(call[0]).toBe("https://api.test/api/v1/ai/explain");
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({
      surface: "forecast_summary",
      facts: { pair_code: "USDKRW", interval_80: { lo: 1, hi: 2 }, camelKey: 1 },
    });
  });

  it("meta를 함께 돌려준다", async () => {
    stubFetchResolving({
      explanation: { sentences: ["문장"], fallback: false },
      verification: { numeric_match: true, blocked_phrases: [] },
    });

    const result = await requestExplanation({ surface: "s", facts: {} });

    expect(result.data.verification.numericMatch).toBe(true);
    expect(result.meta.asOf).toBe("2026-09-07T00:00:00Z");
  });
});
