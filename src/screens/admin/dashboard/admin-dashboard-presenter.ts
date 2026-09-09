/**
 * 대시보드 카드가 보여줄 값을 뽑는 순수 계산.
 *
 * 서버가 준 값을 세고 고르는 표시용 파생만 한다(AGENTS.md 7.6). 어떤 수치도
 * 새로 만들지 않는다 — 커버리지 비율·토큰 수·영업일 수는 전부 서버 값이다.
 */
import type { AdminFxCoverage, AdminFxPairCoverage } from "../../../api/admin-fx-gaps";
import type { AdminRefreshStatus } from "../../../api/admin";

/** 결측 요약. 어느 통화쌍이 몇 일 비었는지만 추린다. */
export interface AdminGapDigest {
  readonly totalPairs: number;
  readonly incompletePairs: readonly AdminFxPairCoverage[];
  /** 통화쌍별 결측 영업일을 더한 값. 값이 없는 칸은 세지 않는다. */
  readonly missingBusinessDays: number;
}

export function toGapDigest(coverage: AdminFxCoverage): AdminGapDigest {
  const incompletePairs = coverage.pairs.filter(
    (pair) => pair.complete === false,
  );
  return {
    totalPairs: coverage.pairs.length,
    incompletePairs,
    missingBusinessDays: coverage.pairs.reduce(
      (sum, pair) => sum + (pair.missingBusinessDays ?? 0),
      0,
    ),
  };
}

/** 결측 카드의 상태. 색과 문구를 여기서 한 번에 정한다. */
export type AdminDigestTone = "ok" | "warn" | "empty";

export function toGapTone(digest: AdminGapDigest): AdminDigestTone {
  if (digest.totalPairs === 0) return "empty";
  return digest.incompletePairs.length === 0 ? "ok" : "warn";
}

/** 갱신 상태 요약. */
export interface AdminRefreshDigest {
  readonly fxLastFetchedAt: string | null;
  readonly fxLastQuoteDate: string | null;
  readonly macroLastRefreshedAt: string | null;
  readonly pairCount: number;
  /** 마지막 수집 시각을 모르는 통화쌍. 비어 있으면 전부 받았다는 뜻이다. */
  readonly pairsWithoutFetch: readonly string[];
}

export function toRefreshDigest(
  status: AdminRefreshStatus,
): AdminRefreshDigest {
  return {
    fxLastFetchedAt: status.fx.lastFetchedAt,
    fxLastQuoteDate: status.fx.lastQuoteDate,
    macroLastRefreshedAt: status.macro.lastRefreshedAt,
    pairCount: status.fx.pairs.length,
    pairsWithoutFetch: status.fx.pairs
      .filter((pair) => pair.lastFetchedAt === null)
      .map((pair) => pair.pairCode ?? "(코드 없음)"),
  };
}

/**
 * 실패 비율 표기. 분모가 0이거나 값을 모르면 대시다 —
 * 0으로 나눈 값을 0%로 적으면 "실패가 없다"로 잘못 읽힌다.
 */
export function formatFailureRate(
  failed: number | null,
  total: number | null,
): string {
  if (failed === null || total === null || total <= 0) return "-";
  return `${((failed / total) * 100).toFixed(1)}%`;
}

/**
 * 모든 호출이 템플릿으로 나갔는지.
 *
 * 실 API 가 꺼진 기본 설정에서는 이것이 **정상**이다. 실패 0건만 보고 정상이라
 * 읽는 것을 막기 위해 따로 알린다. 호출이 없으면 판정하지 않는다.
 */
export function isAllFallback(
  fallback: number | null,
  total: number | null,
): boolean {
  if (fallback === null || total === null || total <= 0) return false;
  return fallback === total;
}
