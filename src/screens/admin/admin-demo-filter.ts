/**
 * 데모 트래픽 필터.
 *
 * 사용자 목록과 AI 호출 로그가 같은 `is_demo` 조건을 쓴다. `전체`는 값을
 * 보내지 않는 것이지 `false`가 아니다 — `false`를 보내면 데모가 빠진다.
 */
export type AdminDemoFilter = "all" | "demoOnly" | "memberOnly";

export function toIsDemoParam(filter: AdminDemoFilter): boolean | undefined {
  if (filter === "demoOnly") return true;
  if (filter === "memberOnly") return false;
  return undefined;
}
