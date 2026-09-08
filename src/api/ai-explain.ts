/**
 * 자연어 설명 API(`POST /api/v1/ai/explain`).
 *
 * 관리자 전용 경로가 아니라 로그인 사용자 API다. 수치 대조·표현 필터를
 * 통과하지 못해도 400이 아니라 200 + `fallback: true`로 돌아온다. 따라서
 * HTTP 상태로 성공을 판정하면 안 되고, `fallback`과 `verification`을 봐야 한다.
 *
 * `explain_level`·`explain_domain`은 요청이 아니라 로그인 사용자의 설정에서
 * 읽으므로 요청 본문에 넣지 않는다.
 */
import { requestWithMeta, type ApiResult } from "./client";

/**
 * `verification.fallbackReason`. 폴백에 이른 경로 넷을 가른다.
 *
 * `fallback: true` 면 반드시 채워지고, 성공이면 `null` 이다. 네 값 모두 서버
 * enum(`AiService.FallbackReason`)의 snake_case 코드 그대로다.
 */
export type AiFallbackReason =
  | "provider_error"
  | "blocked_phrases"
  | "budget_exhausted"
  | "verification_failed";

export interface ExplainVerification {
  /**
   * 문장 속 수치가 입력 facts와 일치했는지.
   *
   * 검증 단계까지 가지 못한 경로(호출 실패·예산 소진)에서는 서버가 `null` 을
   * 보낸다 — "측정하지 않았다"는 뜻이지 "통과했다"가 아니다.
   */
  readonly numericMatch: boolean | null;
  /** 급변 구간을 문장에 고지했는지. 위와 같은 규칙으로 null 이 온다. */
  readonly regimeDisclosed: boolean | null;
  readonly blockedPhrases: readonly string[];
  /** 폴백 사유. 성공이면 null. 서버가 모르는 값을 보내면 null 로 떨어뜨린다. */
  readonly fallbackReason: AiFallbackReason | null;
}

/**
 * 서버가 보내는 사유 전체. `Record<AiFallbackReason, true>` 라서 유니온에 값을
 * 더하면 여기도 채워야 컴파일된다 — 좁히기 함수가 조용히 뒤처지지 않는다.
 */
const FALLBACK_REASONS: Readonly<Record<AiFallbackReason, true>> = {
  provider_error: true,
  blocked_phrases: true,
  budget_exhausted: true,
  verification_failed: true,
};

function isFallbackReason(value: string): value is AiFallbackReason {
  return Object.prototype.hasOwnProperty.call(FALLBACK_REASONS, value);
}

export interface Explanation {
  readonly sentences: readonly string[];
  readonly sentenceCount: number | null;
  readonly explainLevel: string | null;
  readonly explainDomain: string | null;
  /** true면 LLM 결과가 검증에 걸려 고정 템플릿이 나간 상태다. */
  readonly fallback: boolean | null;
}

export interface ExplainResult {
  readonly explanation: Explanation;
  readonly verification: ExplainVerification;
}

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readRecord(source: UnknownRecord, key: string): UnknownRecord {
  const value = source[key];
  return isRecord(value) ? value : {};
}

function readStringArray(source: UnknownRecord, key: string): readonly string[] {
  const value = source[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readNullableBoolean(source: UnknownRecord, key: string): boolean | null {
  const value = source[key];
  return typeof value === "boolean" ? value : null;
}

function readFallbackReason(source: UnknownRecord): AiFallbackReason | null {
  const value = source.fallbackReason;
  return typeof value === "string" && isFallbackReason(value) ? value : null;
}

export function normalizeExplainResult(data: unknown): ExplainResult {
  const source = isRecord(data) ? data : {};
  const explanation = readRecord(source, "explanation");
  const verification = readRecord(source, "verification");
  return {
    explanation: {
      sentences: readStringArray(explanation, "sentences"),
      sentenceCount:
        typeof explanation.sentenceCount === "number"
          ? explanation.sentenceCount
          : null,
      explainLevel:
        typeof explanation.explainLevel === "string"
          ? explanation.explainLevel
          : null,
      explainDomain:
        typeof explanation.explainDomain === "string"
          ? explanation.explainDomain
          : null,
      fallback:
        typeof explanation.fallback === "boolean" ? explanation.fallback : null,
    },
    verification: {
      numericMatch: readNullableBoolean(verification, "numericMatch"),
      regimeDisclosed: readNullableBoolean(verification, "regimeDisclosed"),
      blockedPhrases: readStringArray(verification, "blockedPhrases"),
      fallbackReason: readFallbackReason(verification),
    },
  };
}

export interface ExplainInput {
  readonly surface: string;
  /** 운영자가 직접 입력한 JSON. 키를 손대지 않고 그대로 보낸다. */
  readonly facts: unknown;
}

export async function requestExplanation(
  input: ExplainInput,
): Promise<ApiResult<ExplainResult>> {
  const result = await requestWithMeta<unknown>("/api/v1/ai/explain", {
    method: "POST",
    // facts는 운영자가 적은 그대로 서버에 닿아야 한다. 표기 변환을 끈다.
    isRawBody: true,
    body: { surface: input.surface, facts: input.facts },
  });
  return { data: normalizeExplainResult(result.data), meta: result.meta };
}
