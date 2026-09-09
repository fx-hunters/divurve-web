/**
 * 결측 구간을 띠 위의 자리로 옮기는 순수 계산.
 *
 * 서버는 **빠진 구간**(`from`~`to`)과 영업일 수를 준다. 날짜 한 칸씩의 격자가
 * 아니다. 격자를 그리려면 어느 날이 영업일인지 알아야 하는데, 그 달력은 서버가
 * 쥐고 있다 — 고시가 없는 날은 `fx_rate_absences`에 부재로 확정돼 커버리지에
 * 포함된다. 프론트에서 주말을 세어 칸을 만들면 공휴일이 '보유'로 칠해져
 * 사실과 달라진다(AGENTS.md 1장).
 *
 * 그래서 칸이 아니라 **비율 띠**로 그린다. 조회 구간 전체를 100%로 두고 빠진
 * 구간이 차지하는 자리를 그대로 옮긴다. 서버가 준 값만 쓰고 아무것도 세지 않는다.
 */
import type {
  AdminFxGap,
  AdminFxPairCoverage,
} from "../../api/admin-fx-gaps";

const MILLIS_PER_DAY = 86_400_000;

/** `YYYY-MM-DD`를 UTC 자정 기준 일수로. 형식이 아니면 null. */
export function toDayNumber(value: string | null): number | null {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : Math.floor(parsed / MILLIS_PER_DAY);
}

/** 띠 위에 놓인 결측 구간 하나. */
export interface AdminGapSegment {
  readonly from: string;
  readonly to: string;
  readonly businessDays: number | null;
  /** 띠 왼쪽에서 떨어진 거리(%). */
  readonly leftPercent: number;
  /** 띠에서 차지하는 너비(%). */
  readonly widthPercent: number;
}

function toSegment(
  gap: AdminFxGap,
  spanStart: number,
  spanDays: number,
): AdminGapSegment | null {
  const from = toDayNumber(gap.from);
  const to = toDayNumber(gap.to);
  if (from === null || to === null || gap.from === null || gap.to === null) {
    return null;
  }
  // 양 끝을 모두 포함한 길이다. 하루짜리 구간도 눈에 보여야 한다.
  const rawWidth = ((to - from + 1) / spanDays) * 100;
  return {
    from: gap.from,
    to: gap.to,
    businessDays: gap.businessDays,
    leftPercent: Math.max(0, Math.min(100, ((from - spanStart) / spanDays) * 100)),
    widthPercent: Math.max(0.5, Math.min(100, rawWidth)),
  };
}

/**
 * 통화쌍 하나의 결측 구간을 띠 위 자리로 옮긴다.
 *
 * 조회 구간을 알 수 없거나(=`from`·`to`가 비었거나) 뒤집혀 있으면 빈 목록이다.
 * 자리를 지어내기보다 그리지 않는 쪽을 고른다.
 */
export function toGapSegments(
  coverage: AdminFxPairCoverage,
): readonly AdminGapSegment[] {
  const spanStart = toDayNumber(coverage.from);
  const spanEnd = toDayNumber(coverage.to);
  if (spanStart === null || spanEnd === null) return [];
  const spanDays = spanEnd - spanStart + 1;
  if (spanDays <= 0) return [];
  return coverage.gaps
    .map((gap) => toSegment(gap, spanStart, spanDays))
    .filter((segment): segment is AdminGapSegment => segment !== null);
}

/** 커버리지 비율 표기. 서버가 준 값을 반올림만 한다. */
export function formatCoverageRatio(ratio: number | null): string {
  return ratio === null ? "-" : `${(ratio * 100).toFixed(1)}%`;
}

/** 통화쌍 한 줄의 상태. 색과 문구를 여기서 한 번에 정한다. */
export type AdminCoverageTone = "complete" | "incomplete" | "unknown";

export function toCoverageTone(
  coverage: AdminFxPairCoverage,
): AdminCoverageTone {
  if (coverage.complete === null) return "unknown";
  return coverage.complete ? "complete" : "incomplete";
}

/** 백필 대상 구간. 화면이 서버로 그대로 넘긴다. */
export interface AdminBackfillTarget {
  readonly pairCode: string;
  readonly from: string;
  readonly to: string;
}
