/**
 * 관리자 화면에서 폴백 사유를 읽을 수 있게 옮기는 문구.
 *
 * 표현이므로 `api/` 가 아니라 여기 둔다(AGENTS.md §7.1 — `api/` 는 백엔드 경계만
 * 담당하고 화면을 몰라야 한다). `Record<AiFallbackReason, string>` 이라 서버
 * 사유가 하나라도 빠지면 컴파일이 실패한다.
 */
import type { AiFallbackReason } from "../../api/ai-explain";

const FALLBACK_REASON_LABELS: Readonly<Record<AiFallbackReason, string>> = {
  provider_error: "모델 호출이 예외로 끝남 (타임아웃·429·5xx·형식 위반)",
  blocked_phrases: "금지 표현이 검출됨",
  budget_exhausted: "총예산이 소진돼 재시도를 생략함",
  verification_failed: "수치 대조 또는 급변 구간 고지 검사에 걸림",
};

export function getFallbackReasonLabel(reason: AiFallbackReason): string {
  return FALLBACK_REASON_LABELS[reason];
}
