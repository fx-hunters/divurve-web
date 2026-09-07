import type {
  HomeBlockKey,
  HomeBlockState,
} from "../api/generated/divurve-api";

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
  readonly goals: readonly ActiveGoalItem[];
  readonly isRouteEnabled: boolean;
}

export interface UpcomingEventItem {
  readonly title: string;
  readonly dateLabel: string;
  readonly currencyCode: string;
  readonly severity: "고변동성" | "중변동성";
}

export interface AttentionData {
  readonly regimeLabel: string;
  readonly tone: HomeTone;
  readonly events: readonly UpcomingEventItem[];
}

export interface ForecastSummaryData {
  readonly pairLabel: string;
  readonly currentRateLabel?: string;
  readonly lowerLabel?: string;
  readonly upperLabel?: string;
}

export interface HomeDashboardData {
  /** 서버가 정한 고정 순서 그대로. 렌더 분기는 state로만 한다. */
  readonly blockStates: Readonly<Record<HomeBlockKey, HomeBlockState>>;
  readonly today: TodaySummaryData;
  readonly profileFit: ProfileFitData;
  readonly fxStatus: FxStatusData;
  readonly goalsRoute: GoalsRouteData;
  readonly attention: AttentionData;
  readonly forecast: ForecastSummaryData;
  readonly asOfLabel: string;
}
