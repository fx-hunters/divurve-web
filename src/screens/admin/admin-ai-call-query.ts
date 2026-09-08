/**
 * AI 호출 로그 조회 조건.
 *
 * 이 화면만 **UTC 기준**으로 날짜를 끊는다. 집계 응답의 `day`가 UTC로 잘린
 * 값이라(백엔드 `AdminAiUsageBucket`), 서울 기준으로 기간을 보내면 화면에
 * 걸린 기간과 표에 찍힌 날짜가 9시간씩 어긋나 보인다. 그래서 서비스 시간대를
 * Asia/Seoul로 고정한 `admin-datetime.ts`를 쓰지 않고 여기서 따로 끊는다.
 *
 * 기준 시각은 인자로 받는다(AGENTS.md 7.6).
 */
import type { AdminDateRange } from "./admin-datetime";
import type { AdminDemoFilter } from "./admin-demo-filter";

/** 화면이 들고 있는 조회 조건. 비어 있는 값은 조건을 걸지 않는다는 뜻이다. */
export interface AdminAiCallFilterValues {
  readonly from: string;
  readonly to: string;
  readonly purpose: string;
  readonly outcome: string;
  readonly surface: string;
  readonly demo: AdminDemoFilter;
}

/** 기본 조회 기간의 일수. 오늘을 포함해 센다. */
export const ADMIN_AI_CALL_DEFAULT_RANGE_DAYS = 7;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** `<input type="date">`가 받는 `YYYY-MM-DD`. UTC 기준으로 끊는다. */
export function toUtcDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * 기본 기간. `to`는 오늘, `from`은 오늘을 포함해 7일 전이다.
 *
 * 기간을 아예 걸지 않으면 서버가 전 기간을 집계해 "이번 주 비용" 을 보려던
 * 사람이 누적치를 보게 된다.
 */
export function toDefaultAiCallRange(now: Date): AdminDateRange {
  const start = new Date(
    now.getTime() -
      (ADMIN_AI_CALL_DEFAULT_RANGE_DAYS - 1) * MILLISECONDS_PER_DAY,
  );
  return { from: toUtcDateInputValue(start), to: toUtcDateInputValue(now) };
}

/**
 * 날짜 하나를 그 날의 시작 시각으로 옮긴다. 비어 있으면 조건을 걸지 않는다.
 *
 * 형식이 어긋난 입력은 손대지 않고 그대로 넘긴다 — 운영 도구에서는 서버가
 * 무엇을 400으로 거절하는지가 확인해야 할 정보다.
 */
export function toUtcRangeStart(day: string): string | undefined {
  if (day === "") return undefined;
  return isDayFormat(day) ? `${day}T00:00:00Z` : day;
}

/** 위와 같되 그 날의 끝이다. `to`가 자정이면 그날 하루가 통째로 빠진다. */
export function toUtcRangeEnd(day: string): string | undefined {
  if (day === "") return undefined;
  return isDayFormat(day) ? `${day}T23:59:59.999Z` : day;
}

function isDayFormat(day: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day);
}

/** 첫 조회 조건. 기준 시각을 인자로 받는 순수 함수다(AGENTS.md 7.6). */
export function toInitialAiCallFilters(now: Date): AdminAiCallFilterValues {
  const range = toDefaultAiCallRange(now);
  return {
    from: range.from,
    to: range.to,
    purpose: "",
    outcome: "",
    surface: "",
    demo: "all",
  };
}
