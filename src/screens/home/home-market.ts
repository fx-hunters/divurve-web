/**
 * '오늘의 시장' 카드의 순수 변환 계층.
 *
 * 여기서 하는 일은 표시용 포매팅과 서버가 준 값의 재배치뿐이다. 환율·범위·
 * regime은 모두 엔진(백엔드)이 계산해 준 값을 그대로 나른다(AGENTS.md §1).
 */
import type { ApiResult } from "../../api/client";
import type {
  ForecastResponse,
  HomeSummaryResponse,
} from "../../api/generated/divurve-api";
import type { HomeMarketPairCode } from "../../api/home";
import type { ExplanationFacts } from "../../hooks/use-ai-explanation";

export const DEFAULT_MARKET_PAIR_CODE: HomeMarketPairCode = "USDKRW";

export interface MarketPairOption {
  readonly code: HomeMarketPairCode;
  readonly label: string;
}

/**
 * 드롭다운에 보여줄 통화쌍. 키가 `HomeMarketPairCode` 전부를 덮어야 하므로
 * 백엔드 지원 통화쌍이 늘면 컴파일이 먼저 알려 준다.
 */
const PAIR_OPTION_LABELS: Readonly<Record<HomeMarketPairCode, string>> = {
  USDKRW: "USD / KRW",
  USDJPY: "USD / JPY",
  EURUSD: "EUR / USD",
};

export const MARKET_PAIR_OPTIONS: readonly MarketPairOption[] = (
  Object.keys(PAIR_OPTION_LABELS) as readonly HomeMarketPairCode[]
).map((code) => ({ code, label: PAIR_OPTION_LABELS[code] }));

/**
 * 스파크라인 한 점. 두 출처의 키가 달라(홈 요약은 `date`, `/forecast` 는 `d`)
 * 경계에서 이 모양으로 통일한다.
 */
export interface MarketHistoryPoint {
  readonly date: string;
  readonly rate: number;
}

/** 통화쌍 하나의 시세 한 장. 값은 모두 서버가 준 원본 수치다. */
export interface HomeMarketSnapshot {
  readonly pairCode: HomeMarketPairCode;
  readonly currentRate?: number;
  readonly lower?: number;
  readonly upper?: number;
  readonly regime?: string;
  /** 최근 30영업일. 서버가 시간순으로 주므로 재정렬하지 않는다. 없으면 빈 배열. */
  readonly history?: readonly MarketHistoryPoint[];
}

export type HomeMarketLoader = (
  pairCode: HomeMarketPairCode,
) => Promise<ApiResult<ForecastResponse>>;

export type HomeMarketState =
  /** 홈 요약이 이미 준 값을 그대로 쓰는 초기 상태. 추가 요청이 없다. */
  | { readonly status: "summary" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly snapshot: HomeMarketSnapshot };

/** 카드가 그대로 그리는 표시 모델. 숫자는 이미 문자열로 포매팅돼 있다. */
export interface MarketSummaryView {
  readonly pairCode: HomeMarketPairCode;
  readonly baseCurrencyCode: string;
  readonly quoteCurrencyCode: string;
  readonly quoteSymbol: string;
  readonly currentRateLabel?: string;
  readonly lowerLabel?: string;
  readonly upperLabel?: string;
  /** 추세 그래프에 그릴 관측점. 선이 되지 않으면 빈 배열. */
  readonly trendPoints: readonly MarketHistoryPoint[];
}

/** 통화 색 고정 배정(개발 컨벤션 7.2). 상태 색과 섞지 않는다. */
const CURRENCY_COLORS: Readonly<Record<string, string>> = {
  USD: "var(--usd)",
  JPY: "var(--jpy)",
  EUR: "var(--eur)",
};

/** 표시 통화(pair의 뒤 세 자리) 기호. */
const QUOTE_SYMBOLS: Readonly<Record<HomeMarketPairCode, string>> = {
  USDKRW: "₩",
  USDJPY: "¥",
  EURUSD: "$",
};

/** 통화쌍마다 유효 자릿수가 달라 EURUSD만 소수 4자리로 표시한다. */
const RATE_FRACTION_DIGITS: Readonly<Record<HomeMarketPairCode, number>> = {
  USDKRW: 2,
  USDJPY: 2,
  EURUSD: 4,
};

export function toCurrencyColor(currencyCode: string): string {
  return CURRENCY_COLORS[currencyCode] ?? "var(--text-muted)";
}

/** 서버가 준 문자열을 지원 통화쌍으로 좁힌다. 모르는 값은 기본 통화쌍이다. */
export function resolveMarketPairCode(
  value: string | undefined,
): HomeMarketPairCode {
  const matched = MARKET_PAIR_OPTIONS.find((option) => option.code === value);
  return matched === undefined ? DEFAULT_MARKET_PAIR_CODE : matched.code;
}

export function toMarketRateLabel(
  pairCode: HomeMarketPairCode,
  rate: number,
): string {
  const digits = RATE_FRACTION_DIGITS[pairCode];
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(rate);
}

/** 추세 그래프 가로축 눈금. 축은 좁으므로 월·일만 적는다. */
export function toTrendDateLabel(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(parsed);
}

/** 홈 요약이 이미 실어 준 forecast 블록. regime은 응답 meta에 온다. */
export function toSummaryMarketSnapshot(
  result: ApiResult<HomeSummaryResponse>,
): HomeMarketSnapshot {
  const { pairCode, currentRate, interval80, history } = result.data.forecast;
  return {
    pairCode: resolveMarketPairCode(pairCode),
    currentRate,
    lower: interval80?.lo,
    upper: interval80?.hi,
    regime: result.meta.regime,
    history: history ?? [],
  };
}

export function toForecastMarketSnapshot(
  result: ApiResult<ForecastResponse>,
): HomeMarketSnapshot {
  const { pairCode, currentRate, interval80, volatility, history } =
    result.data;
  return {
    pairCode: resolveMarketPairCode(pairCode),
    currentRate,
    lower: interval80.lo,
    upper: interval80.hi,
    regime: volatility.regime,
    // `/forecast` 는 날짜 키가 `d` 라 홈 요약(`date`)과 다르다. 여기서 맞춘다.
    history: history.map((point) => ({ date: point.d, rate: point.rate })),
  };
}

/**
 * 화면에 그릴 시세를 고른다.
 *
 * 조회가 끝났으면 받은 값을, 아직이면 홈 요약이 준 값을 쓴다. 단 사용자가 다른
 * 통화쌍을 고른 뒤에는 통화쌍만 남기고 수치를 비운다 — 이전 통화쌍의 숫자가
 * 새 통화쌍의 값인 것처럼 보이면 안 된다.
 */
export function toDisplaySnapshot(
  summary: HomeMarketSnapshot,
  pairCode: HomeMarketPairCode,
  state: HomeMarketState,
): HomeMarketSnapshot {
  if (state.status === "ready") return state.snapshot;
  return pairCode === summary.pairCode ? summary : { pairCode };
}

/**
 * 추세 그래프에 넘길 관측점. 점이 하나면 선을 그릴 수 없고, 값이 모두 같으면
 * 진폭이 0 이라 그려도 정보가 없다 — 둘 다 빈 배열로 접어 카드가 그림을 감춘다.
 *
 * 축을 그리려면 날짜가 필요하므로 환율만 뽑지 않고 점을 통째로 넘긴다.
 */
function toTrendPoints(
  history: readonly MarketHistoryPoint[] | undefined,
): readonly MarketHistoryPoint[] {
  const points = history ?? [];
  if (points.length < 2) return [];
  return points.some((point) => point.rate !== points[0]!.rate) ? points : [];
}

export function toMarketView(snapshot: HomeMarketSnapshot): MarketSummaryView {
  const { pairCode } = snapshot;
  const format = (rate: number | undefined) =>
    rate === undefined ? undefined : toMarketRateLabel(pairCode, rate);
  return {
    pairCode,
    baseCurrencyCode: pairCode.slice(0, 3),
    quoteCurrencyCode: pairCode.slice(3),
    quoteSymbol: QUOTE_SYMBOLS[pairCode],
    currentRateLabel: format(snapshot.currentRate),
    lowerLabel: format(snapshot.lower),
    upperLabel: format(snapshot.upper),
    trendPoints: toTrendPoints(snapshot.history),
  };
}

/**
 * AI 설명에 넘길 근거 수치. 서버 계약대로 snake_case 키를 쓰고, 값은 엔진이 준
 * 그대로 넣는다. 수치가 하나도 없으면 `null`을 돌려 요청 자체를 막는다
 * (빈 facts에 서버가 400을 준다).
 */
export function toMarketFacts(
  snapshot: HomeMarketSnapshot,
): ExplanationFacts | null {
  const numeric: Record<string, number> = {};
  if (snapshot.currentRate !== undefined) {
    numeric.current_rate = snapshot.currentRate;
  }
  if (snapshot.lower !== undefined) numeric.interval_80_lo = snapshot.lower;
  if (snapshot.upper !== undefined) numeric.interval_80_hi = snapshot.upper;
  if (Object.keys(numeric).length === 0) return null;

  const facts = { pair_code: snapshot.pairCode, ...numeric };
  return snapshot.regime === undefined
    ? facts
    : { ...facts, regime: snapshot.regime };
}
