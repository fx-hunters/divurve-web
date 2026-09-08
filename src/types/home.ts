import type {
  HomeBlockKey,
  HomeBlockState,
} from "../api/generated/divurve-api";
/** 홈과 X-Ray 가 같은 통화별 노출 값을 그리므로 타입도 하나를 공유한다(divurve-api#94). */
import type { ExposureShareItem } from "./xray";

export type HomeTone = "default" | "normal" | "warn" | "danger";

export interface TodaySummaryData {
  readonly headline: string;
  readonly badgeLabel: string;
  readonly tone: HomeTone;
}

export interface ProfileFitData {
  readonly gradeLabel?: string;
  readonly concentrationLabel: string;
  readonly tone: HomeTone;
}

export interface FxStatusData {
  readonly fxRatioPct?: number;
  readonly topCurrencyCode?: string;
  readonly dayChangeKrw?: number;
  readonly sensitivity1pctKrw?: number;
  /**
   * 통화별 노출. `/xray` 와 같은 값이라 같은 타입을 쓴다(divurve-api#94).
   * 서버가 키를 생략해도 화면 분기가 늘지 않도록 항상 배열로 둔다 — 없으면 빈 배열.
   */
  readonly exposure: readonly ExposureShareItem[];
}

export interface ActiveGoalItem {
  readonly id: string;
  readonly name: string;
  readonly currencyCode: string;
  readonly targetAmount: number;
  readonly targetDateLabel: string;
  readonly status: string;
}

export interface GoalsRouteData {
  /** 마감이 이른 순. 개수는 자르지 않는다 — 카드가 스크롤로 담는다. */
  readonly goals: readonly ActiveGoalItem[];
}

export interface UpcomingEventItem {
  readonly title: string;
  readonly dateLabel: string;
  readonly currencyCode: string;
  readonly severity: "고변동성" | "중변동성";
}

/**
 * 경제 일정 블록.
 *
 * 국면 배지는 여기 없다 — 백엔드가 `today.badge` 와 `attention.regime_badge`
 * 를 같은 `regime.badge()` 로 채우므로 `TodaySummaryData` 의 것과 늘 같은
 * 값이다. 두 벌을 들고 있으면 화면에 같은 글자가 두 번 나온다.
 */
export interface AttentionData {
  readonly events: readonly UpcomingEventItem[];
}

export interface HomeDashboardData {
  /** 서버가 정한 고정 순서 그대로. 렌더 분기는 state로만 한다. */
  readonly blockStates: Readonly<Record<HomeBlockKey, HomeBlockState>>;
  readonly today: TodaySummaryData;
  readonly profileFit: ProfileFitData;
  readonly fxStatus: FxStatusData;
  readonly goalsRoute: GoalsRouteData;
  readonly attention: AttentionData;
  readonly asOfLabel: string;
}
