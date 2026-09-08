/**
 * 사용자 화면용 AI 자연어 설명 훅(`POST /api/v1/ai/explain`).
 *
 * 계약에서 조심할 점 두 가지.
 * 1. 수치 대조·표현 필터에 걸려도 400이 아니라 200 + `fallback: true`로 온다.
 *    그래서 HTTP 상태만으로 성공을 판정하지 않고, 성공 상태에 `explanation`과
 *    `verification`을 함께 실어 화면이 성격을 구분해 표시하게 한다.
 * 2. `explain_level`·`explain_domain`은 요청에 넣지 않는다. 서버가 로그인
 *    사용자 설정에서 읽는다.
 *
 * `facts`가 비면 서버가 400을 주므로 아예 요청하지 않고 `idle`로 둔다.
 * 값과 상태만 돌려주고 JSX는 반환하지 않는다(AGENTS.md §7.3).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  requestExplanation,
  type ExplainInput,
  type ExplainVerification,
  type ExplainResult,
  type Explanation,
} from "../api/ai-explain";
import { ApiError, type ApiMeta, type ApiResult } from "../api/client";

/** 서버에 그대로 전달되는 근거 수치. 키 표기는 백엔드 계약을 따른다. */
export type ExplanationFacts = Readonly<Record<string, unknown>>;

export type ExplanationRequester = (
  input: ExplainInput,
) => Promise<ApiResult<ExplainResult>>;

export type AiExplanationState =
  /** 아직 요청할 근거 수치가 없어 호출하지 않은 상태. */
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "success";
      readonly explanation: Explanation;
      readonly verification: ExplainVerification;
      readonly meta: ApiMeta;
    };

export interface UseAiExplanationParams {
  /** 설명이 붙는 화면 지면(예: `forecast_summary`). 자유 문자열이다. */
  readonly surface: string;
  /** 비어 있으면 요청하지 않는다(서버가 400을 준다). */
  readonly facts: ExplanationFacts | null | undefined;
  readonly requester?: ExplanationRequester;
}

export interface UseAiExplanationResult {
  readonly state: AiExplanationState;
  /** 같은 surface·facts로 다시 요청한다. 에러 화면의 재시도에 쓴다. */
  readonly reload: () => void;
}

// API 계약의 `fallback`과 헷갈리지 않도록, 이 상수는 "정체를 모르는 예외"용이다.
const UNKNOWN_ERROR_MESSAGE =
  "설명을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

function hasUsableFacts(
  facts: ExplanationFacts | null | undefined,
): facts is ExplanationFacts {
  return (
    facts !== null && facts !== undefined && Object.keys(facts).length > 0
  );
}

export function useAiExplanation({
  surface,
  facts,
  requester = requestExplanation,
}: UseAiExplanationParams): UseAiExplanationResult {
  const [state, setState] = useState<AiExplanationState>({ status: "idle" });
  const [reloadKey, setReloadKey] = useState(0);

  // 호출부가 facts 객체와 requester를 렌더마다 새로 만들어도 재요청이
  // 반복되지 않도록, 재요청 신호는 직렬화한 facts 내용으로만 판정한다.
  const factsRef = useRef(facts);
  factsRef.current = facts;
  const requesterRef = useRef(requester);
  requesterRef.current = requester;
  const factsKey = JSON.stringify(facts);

  useEffect(() => {
    const currentFacts = factsRef.current;
    if (!hasUsableFacts(currentFacts)) {
      setState({ status: "idle" });
      return;
    }

    let isActive = true;
    setState({ status: "loading" });

    void requesterRef
      .current({ surface, facts: currentFacts })
      .then((result) => {
        if (!isActive) return;
        setState({
          status: "success",
          explanation: result.data.explanation,
          verification: result.data.verification,
          meta: result.meta,
        });
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setState({
          status: "error",
          message:
            error instanceof ApiError ? error.message : UNKNOWN_ERROR_MESSAGE,
        });
      });

    return () => {
      isActive = false;
    };
  }, [surface, factsKey, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  return { state, reload };
}
