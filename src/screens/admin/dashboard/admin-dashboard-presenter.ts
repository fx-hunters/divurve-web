/**
 * 대시보드 카드가 보여줄 값을 뽑는 순수 계산.
 *
 * 서버가 준 값을 세고 고르는 표시용 파생만 한다(AGENTS.md 7.6). 어떤 수치도
 * 새로 만들지 않는다 — 커버리지 비율·토큰 수·영업일 수는 전부 서버 값이다.
 */
import type { AdminFxCoverage, AdminFxPairCoverage } from "../../../api/admin-fx-gaps";
import type {
  AdminAiUsageBucket,
  AdminCurrency,
  AdminCurrencyMaster,
  AdminRefreshStatus,
} from "../../../api/admin";

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

/** 결과 분해 한 칸. 서버가 센 건수를 그대로 담는다. */
export interface AdminOutcomeSlice {
  readonly outcome: string;
  readonly count: number | null;
}

/**
 * 분해 막대의 너비(%).
 *
 * 합계를 프론트에서 만들지 않는다 — 총 호출 수는 서버가 센 값을 그대로 받는다.
 * 총계를 모르거나 0이면 막대를 그리지 않는다(0으로 나눈 값을 0%로 적으면
 * "없다"로 잘못 읽힌다).
 */
export function toOutcomeWidth(
  count: number | null,
  total: number | null,
): number | null {
  if (count === null || total === null || total <= 0) return null;
  return Math.max(0, Math.min(100, (count / total) * 100));
}

/** 통화 마스터 요약. */
export interface AdminCurrencyDigest {
  readonly totalCurrencies: number;
  /** 환율을 조달할 수 없는 통화. 사유는 `supportNote` 에 있다. */
  readonly unsupported: readonly AdminCurrency[];
  readonly storedPairs: number;
  /** 저장하지 않고 유도하는 쌍. 조회하면 400 이 난다. */
  readonly derivedPairs: number;
}

export function toCurrencyDigest(
  master: AdminCurrencyMaster,
): AdminCurrencyDigest {
  return {
    totalCurrencies: master.currencies.length,
    unsupported: master.currencies.filter(
      (currency) => currency.isSupported === false,
    ),
    storedPairs: master.currencyPairs.filter((pair) => pair.isStored === true)
      .length,
    derivedPairs: master.currencyPairs.filter((pair) => pair.isStored === false)
      .length,
  };
}

/** 차트 한 점. 하루치 토큰을 담는다. */
export interface AdminTokenPoint {
  readonly day: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  /** 그 날 LLM 을 실제로 부른 버킷이 하나라도 있었는지. */
  readonly hasLiveCall: boolean;
}

/**
 * 일자별 버킷을 차트 점으로 접는다.
 *
 * 같은 날에 목적·모델별 버킷이 여러 개 오므로 날짜로 묶는다. **표시용 파생일
 * 뿐이고 새 수치를 만들지 않는다**(AGENTS.md 7.6) — 각 버킷의 토큰을 그대로 더한다.
 *
 * `model === null` 은 값이 빠진 것이 아니라 **LLM 을 부르지 않았다**는 사실이다.
 * 토큰 0을 장애로 오해하지 않도록 그 날의 실호출 여부를 함께 담는다.
 */
export function toTokenPoints(
  buckets: readonly AdminAiUsageBucket[],
): readonly AdminTokenPoint[] {
  const byDay = new Map<string, { input: number; output: number; live: boolean }>();
  for (const bucket of buckets) {
    if (bucket.day === null) continue;
    const seen = byDay.get(bucket.day) ?? { input: 0, output: 0, live: false };
    byDay.set(bucket.day, {
      input: seen.input + (bucket.inputTokens ?? 0),
      output: seen.output + (bucket.outputTokens ?? 0),
      live: seen.live || bucket.model !== null,
    });
  }
  return [...byDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([day, sums]) => ({
      day,
      inputTokens: sums.input,
      outputTokens: sums.output,
      hasLiveCall: sums.live,
    }));
}

/** 한 점이라도 LLM 실호출이 있었는지. 전부 없으면 그 사실을 알린다. */
export function hasAnyLiveCall(
  points: readonly AdminTokenPoint[],
): boolean {
  return points.some((point) => point.hasLiveCall);
}
