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

export interface ExplainVerification {
  /** 문장 속 수치가 입력 facts와 일치했는지. 서버가 주지 않으면 null. */
  readonly numericMatch: boolean | null;
  readonly blockedPhrases: readonly string[];
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
      numericMatch:
        typeof verification.numericMatch === "boolean"
          ? verification.numericMatch
          : null,
      blockedPhrases: readStringArray(verification, "blockedPhrases"),
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
