/**
 * AI 호출 로그의 어휘 표기.
 *
 * 서버가 주는 코드를 화면 문구로 옮기기만 한다. 어휘에 없는 값이 와도
 * 원문을 그대로 보여준다 — 관리자 도구에서는 모르는 값 자체가 확인해야 할
 * 정보이므로, 빈칸으로 지우거나 "기타" 로 뭉뚱그리지 않는다.
 */
import { ADMIN_EMPTY_VALUE } from "./admin-value";

/** 배지 색조. `admin-shell.css`의 `admin-badge--*` 와 짝이다. */
export type AdminAiBadgeTone = "ok" | "warn" | "off" | "unknown";

const PURPOSE_LABELS: Readonly<Record<string, string>> = {
  narrate: "narrate (서술)",
  extract: "extract (추출)",
};

const OUTCOME_LABELS: Readonly<Record<string, string>> = {
  success: "success (실 호출 성공)",
  fallback: "fallback (템플릿 대체)",
  cache_hit: "cache_hit (캐시 응답)",
  quota_blocked: "quota_blocked (쿼터 차단)",
  error: "error (산출물 없음)",
};

/**
 * 결과별 색조.
 *
 * `fallback`을 실패로 칠하지 않는다 — 사용자에게는 템플릿 문장이 나갔고,
 * 아무것도 얻지 못한 `error`와는 다른 사실이다.
 */
const OUTCOME_TONES: Readonly<Record<string, AdminAiBadgeTone>> = {
  success: "ok",
  fallback: "warn",
  cache_hit: "ok",
  quota_blocked: "warn",
  error: "off",
};

export function toAdminAiPurposeLabel(purpose: string | null): string {
  if (purpose === null) return ADMIN_EMPTY_VALUE;
  return PURPOSE_LABELS[purpose] ?? purpose;
}

export function toAdminAiOutcomeLabel(outcome: string | null): string {
  if (outcome === null) return ADMIN_EMPTY_VALUE;
  return OUTCOME_LABELS[outcome] ?? outcome;
}

export function toAdminAiOutcomeTone(outcome: string | null): AdminAiBadgeTone {
  if (outcome === null) return "unknown";
  return OUTCOME_TONES[outcome] ?? "unknown";
}

/**
 * 모델 칸의 표기.
 *
 * `null`은 값이 빠진 것이 아니라 **LLM을 부르지 않았다**는 사실이다. 다른 빈
 * 칸과 같은 `-`로 두면 "응답이 안 왔다"로 읽혀, 토큰 0을 장애로 오해한다.
 */
export const ADMIN_AI_TEMPLATE_MODEL_LABEL = "템플릿 (LLM 미호출)";

export function toAdminAiModelLabel(model: string | null): string {
  return model === null ? ADMIN_AI_TEMPLATE_MODEL_LABEL : model;
}
