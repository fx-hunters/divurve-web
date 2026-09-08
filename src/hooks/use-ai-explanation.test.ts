import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestExplanation } from "../api/ai-explain";
import type { ExplainResult } from "../api/ai-explain";
import { ApiError, type ApiResult } from "../api/client";
import {
  useAiExplanation,
  type ExplanationFacts,
} from "./use-ai-explanation";

vi.mock("../api/ai-explain", () => ({
  requestExplanation: vi.fn(),
}));

const FACTS: ExplanationFacts = { pairCode: "USDKRW", currentRate: 1382.4 };

function explainResult(
  overrides: {
    readonly sentences?: readonly string[];
    readonly fallback?: boolean | null;
    readonly numericMatch?: boolean | null;
  } = {},
): ApiResult<ExplainResult> {
  return {
    data: {
      explanation: {
        sentences: overrides.sentences ?? ["환율이 최근 범위 안에 있습니다."],
        sentenceCount: 1,
        explainLevel: "basic",
        explainDomain: "fx",
        fallback: overrides.fallback ?? false,
      },
      verification: {
        numericMatch: overrides.numericMatch ?? true,
        blockedPhrases: [],
      },
    },
    meta: { asOf: "2026-09-08T00:00:00Z", regime: "elevated" },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => vi.clearAllMocks());

describe("useAiExplanation", () => {
  it("facts가 있으면 surface와 함께 요청해 성공 상태가 된다", async () => {
    const requester = vi.fn().mockResolvedValue(explainResult());
    const { result } = renderHook(() =>
      useAiExplanation({ surface: "forecast_summary", facts: FACTS, requester }),
    );

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(requester).toHaveBeenCalledWith({
      surface: "forecast_summary",
      facts: FACTS,
    });
    if (result.current.state.status !== "success") throw new Error("성공 상태여야 한다");
    expect(result.current.state.explanation.sentences).toHaveLength(1);
    expect(result.current.state.verification.numericMatch).toBe(true);
    expect(result.current.state.meta.regime).toBe("elevated");
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["빈 객체", {}],
  ])("facts가 %s면 요청하지 않고 idle에 머문다", async (_label, facts) => {
    const requester = vi.fn().mockResolvedValue(explainResult());
    const { result } = renderHook(() =>
      useAiExplanation({ surface: "home_summary", facts, requester }),
    );

    expect(result.current.state.status).toBe("idle");
    expect(requester).not.toHaveBeenCalled();
  });

  it("검증에 걸려 fallback=true로 와도 성공 상태로 그대로 전달한다", async () => {
    const requester = vi
      .fn()
      .mockResolvedValue(explainResult({ fallback: true, numericMatch: false }));
    const { result } = renderHook(() =>
      useAiExplanation({ surface: "xray_summary", facts: FACTS, requester }),
    );

    await waitFor(() => expect(result.current.state.status).toBe("success"));
    if (result.current.state.status !== "success") throw new Error("성공 상태여야 한다");
    expect(result.current.state.explanation.fallback).toBe(true);
    expect(result.current.state.verification.numericMatch).toBe(false);
  });

  it("ApiError는 서버 메시지를 그대로 쓴다", async () => {
    const requester = vi
      .fn()
      .mockRejectedValue(new ApiError("facts가 비어 있습니다.", 400, "VALIDATION_FAILED"));
    const { result } = renderHook(() =>
      useAiExplanation({ surface: "home_summary", facts: FACTS, requester }),
    );

    await waitFor(() => expect(result.current.state.status).toBe("error"));
    if (result.current.state.status !== "error") throw new Error("에러 상태여야 한다");
    expect(result.current.state.message).toBe("facts가 비어 있습니다.");
  });

  it("알 수 없는 예외는 복구 가능한 안내 문구로 바꾼다", async () => {
    const requester = vi.fn().mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() =>
      useAiExplanation({ surface: "home_summary", facts: FACTS, requester }),
    );

    await waitFor(() => expect(result.current.state.status).toBe("error"));
    if (result.current.state.status !== "error") throw new Error("에러 상태여야 한다");
    expect(result.current.state.message).toBe(
      "설명을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  });

  it("reload는 같은 조건으로 다시 요청한다", async () => {
    const requester = vi.fn().mockResolvedValue(explainResult());
    const { result } = renderHook(() =>
      useAiExplanation({ surface: "home_summary", facts: FACTS, requester }),
    );
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    act(() => result.current.reload());
    await waitFor(() => expect(requester).toHaveBeenCalledTimes(2));
  });

  it("내용이 같은 facts 객체를 새로 만들어도 다시 요청하지 않는다", async () => {
    const requester = vi.fn().mockResolvedValue(explainResult());
    const { rerender, result } = renderHook(
      ({ facts }: { facts: ExplanationFacts }) =>
        useAiExplanation({ surface: "home_summary", facts, requester }),
      { initialProps: { facts: { ...FACTS } } },
    );
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    rerender({ facts: { ...FACTS } });
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(requester).toHaveBeenCalledTimes(1);
  });

  it("facts 내용이 바뀌면 다시 요청한다", async () => {
    const requester = vi.fn().mockResolvedValue(explainResult());
    const { rerender, result } = renderHook(
      ({ facts }: { facts: ExplanationFacts }) =>
        useAiExplanation({ surface: "home_summary", facts, requester }),
      { initialProps: { facts: FACTS } },
    );
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    rerender({ facts: { ...FACTS, currentRate: 1400 } });
    await waitFor(() => expect(requester).toHaveBeenCalledTimes(2));
  });

  it("requester를 넘기지 않으면 기본 API 함수를 쓴다", async () => {
    vi.mocked(requestExplanation).mockResolvedValue(explainResult());
    const { result } = renderHook(() =>
      useAiExplanation({ surface: "home_summary", facts: FACTS }),
    );

    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(requestExplanation).toHaveBeenCalledWith({
      surface: "home_summary",
      facts: FACTS,
    });
  });

  it("언마운트 뒤 응답이 와도 상태를 바꾸지 않는다", async () => {
    const pending = deferred<ApiResult<ExplainResult>>();
    const requester = vi.fn().mockReturnValue(pending.promise);
    const { result, unmount } = renderHook(() =>
      useAiExplanation({ surface: "home_summary", facts: FACTS, requester }),
    );
    expect(result.current.state.status).toBe("loading");

    unmount();
    await act(async () => {
      pending.resolve(explainResult());
      await pending.promise;
    });
    expect(result.current.state.status).toBe("loading");
  });

  it("언마운트 뒤 실패해도 상태를 바꾸지 않는다", async () => {
    const pending = deferred<ApiResult<ExplainResult>>();
    const requester = vi.fn().mockReturnValue(pending.promise);
    const { result, unmount } = renderHook(() =>
      useAiExplanation({ surface: "home_summary", facts: FACTS, requester }),
    );

    unmount();
    await act(async () => {
      pending.reject(new Error("late failure"));
      await pending.promise.catch(() => undefined);
    });
    expect(result.current.state.status).toBe("loading");
  });
});
