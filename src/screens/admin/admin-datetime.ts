/**
 * 관리자 콘솔의 날짜·시각 표기.
 *
 * `admin-value.ts`는 "서버가 준 값을 그대로 보여준다"가 문서화된 계약이라 그대로 두고,
 * 날짜 표기만 이 모듈로 분리해 컬럼이 직접 골라 쓰게 한다(옵트인).
 *
 * 기준 시간대는 Asia/Seoul 하나로 고정한다. 백엔드가 같은 기준으로 날짜를 끊고
 * (`ExternalDataConfig.SERVICE_ZONE`), 보는 사람의 OS 시간대에 따라 같은 값이
 * 다르게 읽히는 일을 막기 위한 것이다.
 */
import { formatAdminValue } from "./admin-value";

const SERVICE_TIME_ZONE = "Asia/Seoul";

/**
 * 조각을 직접 조립하기 위한 포매터.
 *
 * 로케일이 붙여 주는 구분자(`2026. 09. 08.`)에 기대지 않으려고 `formatToParts`로
 * 받아 쓴다. `hourCycle: "h23"`은 자정을 `24`로 적는 구현을 피하기 위한 것이다.
 */
const SEOUL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: SERVICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 서울 기준으로 끊은 연·월·일·시·분 조각. 값은 모두 0으로 채운 문자열이다. */
function toSeoulParts(date: Date): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const part of SEOUL_FORMATTER.formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return parts;
}

function padTwo(value: number): string {
  return String(value).padStart(2, "0");
}

/** 그 달의 마지막 날. `month`는 1부터 센다. */
function toLastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * `YY.MM.DD HH:mm`.
 *
 * 서버가 준 문자열을 읽지 못하면 손대지 않고 그대로 돌려준다 — 관리자 도구에서는
 * 형식이 어긋난 값 자체가 확인해야 할 정보다.
 */
export function formatAdminDateTime(value: unknown): string {
  if (typeof value !== "string") return formatAdminValue(value);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatAdminValue(value);
  const parts = toSeoulParts(parsed);
  return `${parts.year.slice(2)}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

/** `<input type="date">`가 받는 `YYYY-MM-DD`. 서울 기준으로 끊는다. */
export function toAdminDateInputValue(date: Date): string {
  const parts = toSeoulParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** 환율 조회 기간 기본값. `to`는 오늘, `from`은 한 달 전. */
export interface AdminDateRange {
  readonly from: string;
  readonly to: string;
}

/**
 * 기준 시각을 인자로 받는 순수 함수로 둔다(AGENTS.md 7.6).
 *
 * 한 달 전이 없는 날짜(3/31 → 2/31)는 그 달의 마지막 날로 당긴다. 그대로 두면
 * `Date`가 다음 달로 넘겨 버려 "한 달 전"이 아니게 된다.
 */
export function toDefaultFxRateRange(now: Date): AdminDateRange {
  const parts = toSeoulParts(now);
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);

  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;
  const clampedDay = Math.min(day, toLastDayOfMonth(previousYear, previousMonth));

  return {
    from: `${previousYear}-${padTwo(previousMonth)}-${padTwo(clampedDay)}`,
    to: `${parts.year}-${parts.month}-${parts.day}`,
  };
}
