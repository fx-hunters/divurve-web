import type { ApiResult } from "../../api/client";
import type {
  HomeBlockKey,
  HomeBlockState,
  HomeSummaryResponse,
} from "../../api/generated/divurve-api";
import type {
  ActiveGoalItem,
  AttentionData,
  ForecastSummaryData,
  GoalsRouteData,
  HomeDashboardData,
  HomeTone,
  ProfileFitData,
  TodaySummaryData,
  UpcomingEventItem,
} from "../../types/home";

const BLOCK_KEYS: readonly HomeBlockKey[] = [
  "today",
  "profile_fit",
  "fx_status",
  "goals_route",
  "attention",
  "forecast",
];

/**
 * 오늘의 핵심 문구. 서버는 코드만 주고 문장을 주지 않으므로 표시 문구는
 * 여기서 붙인다. 모르는 코드가 오면 badge 기준의 중립 문구로 물러난다.
 */
const TODAY_HEADLINE_LABELS: Readonly<Record<string, string>> = {
  vol_calm_usd: "USD 변동성이 평시보다 낮습니다.",
  vol_normal_usd: "USD 변동성이 평시 범위입니다.",
  vol_elevated_usd: "USD 변동성이 평시보다 높습니다.",
  vol_calm_jpy: "JPY 변동성이 평시보다 낮습니다.",
  vol_normal_jpy: "JPY 변동성이 평시 범위입니다.",
  vol_elevated_jpy: "JPY 변동성이 평시보다 높습니다.",
  vol_calm_eur: "EUR 변동성이 평시보다 낮습니다.",
  vol_normal_eur: "EUR 변동성이 평시 범위입니다.",
  vol_elevated_eur: "EUR 변동성이 평시보다 높습니다.",
};

const BADGE_FALLBACK_HEADLINES: Readonly<Record<string, string>> = {
  normal: "특별히 주의할 변화는 없습니다.",
  caution: "주의가 필요한 변화가 있습니다.",
};

const BADGE_LABELS: Readonly<Record<string, string>> = {
  calm: "안정",
  normal: "정상",
  caution: "주의",
  elevated: "높음",
  extreme: "매우 높음",
};

const BADGE_TONES: Readonly<Record<string, HomeTone>> = {
  calm: "normal",
  normal: "normal",
  caution: "warn",
  elevated: "warn",
  extreme: "danger",
};

const CONCENTRATION_LABELS: Readonly<Record<string, string>> = {
  within_threshold: "기준선 이내",
  above_threshold: "기준선 초과",
  unknown: "판정 불가",
};

const CONCENTRATION_TONES: Readonly<Record<string, HomeTone>> = {
  within_threshold: "normal",
  above_threshold: "danger",
  unknown: "default",
};

const GRADE_LABELS: Readonly<Record<string, string>> = {
  conservative: "안정형",
  balanced: "중립형",
  aggressive: "공격형",
};

export function toBadgeLabel(badge: string | undefined): string {
  if (badge === undefined) return "판정 불가";
  return BADGE_LABELS[badge] ?? badge;
}

export function toBadgeTone(badge: string | undefined): HomeTone {
  if (badge === undefined) return "default";
  return BADGE_TONES[badge] ?? "default";
}

export function toDateLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(parsed);
}

export function toRateLabel(rate: number): string {
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rate);
}

export function toBlockStates(
  blocks: readonly { readonly key: HomeBlockKey; readonly state: HomeBlockState }[],
): Readonly<Record<HomeBlockKey, HomeBlockState>> {
  const states = Object.fromEntries(
    BLOCK_KEYS.map((key) => [key, "empty" as HomeBlockState]),
  ) as Record<HomeBlockKey, HomeBlockState>;
  for (const block of blocks) {
    states[block.key] = block.state;
  }
  return states;
}

function toToday(data: HomeSummaryResponse): TodaySummaryData {
  const { headlineCode, badge } = data.today;
  const headline =
    (headlineCode === undefined ? undefined : TODAY_HEADLINE_LABELS[headlineCode]) ??
    (badge === undefined ? undefined : BADGE_FALLBACK_HEADLINES[badge]) ??
    "오늘의 요약을 준비하고 있습니다.";
  return {
    headline,
    badgeLabel: toBadgeLabel(badge),
    tone: toBadgeTone(badge),
  };
}

function toProfileFit(data: HomeSummaryResponse): ProfileFitData {
  const { grade, concentrationStatus } = data.profileFit;
  const status = concentrationStatus ?? "unknown";
  return {
    gradeLabel: grade === undefined ? undefined : (GRADE_LABELS[grade] ?? grade),
    concentrationLabel: CONCENTRATION_LABELS[status] ?? status,
    tone: CONCENTRATION_TONES[status] ?? "default",
  };
}

function toGoalsRoute(data: HomeSummaryResponse): GoalsRouteData {
  const goals: readonly ActiveGoalItem[] = data.goalsRoute.activeGoals.map(
    (goal) => ({
      id: goal.id,
      name: goal.name,
      currencyCode: goal.currencyCode,
      targetAmount: goal.targetAmount,
      targetDateLabel: toDateLabel(goal.targetDate),
      status: goal.status,
    }),
  );
  return { goals, isRouteEnabled: data.goalsRoute.routeEnabled };
}

function toAttention(data: HomeSummaryResponse): AttentionData {
  const events: readonly UpcomingEventItem[] = data.attention.upcomingEvents.map(
    (event) => ({
      title: event.title,
      dateLabel: toDateLabel(event.date),
      currencyCode: event.currencyCode,
      severity:
        event.importance.toLowerCase() === "high" ? "고변동성" : "중변동성",
    }),
  );
  return {
    regimeLabel: toBadgeLabel(data.attention.regimeBadge),
    tone: toBadgeTone(data.attention.regimeBadge),
    events,
  };
}

function toForecast(data: HomeSummaryResponse): ForecastSummaryData {
  const { pairCode, currentRate, interval80 } = data.forecast;
  return {
    pairLabel: pairCode ?? "-",
    currentRateLabel:
      currentRate === undefined ? undefined : toRateLabel(currentRate),
    lowerLabel:
      interval80?.lo === undefined ? undefined : toRateLabel(interval80.lo),
    upperLabel:
      interval80?.hi === undefined ? undefined : toRateLabel(interval80.hi),
  };
}

export function toHomeDashboardData(
  result: ApiResult<HomeSummaryResponse>,
): HomeDashboardData {
  const { data, meta } = result;
  const parsedAsOf = new Date(meta.asOf);
  return {
    blockStates: toBlockStates(data.blocks),
    today: toToday(data),
    profileFit: toProfileFit(data),
    fxStatus: {
      fxRatioPct:
        data.fxStatus.fxRatio === undefined
          ? undefined
          : Math.round(data.fxStatus.fxRatio * 1000) / 10,
      topCurrencyCode: data.fxStatus.topCurrencyCode,
      dayChangeKrw: data.fxStatus.dayChangeKrw,
      sensitivity1pctKrw: data.fxStatus.sensitivity1pctKrw,
    },
    goalsRoute: toGoalsRoute(data),
    attention: toAttention(data),
    forecast: toForecast(data),
    asOfLabel: Number.isNaN(parsedAsOf.getTime())
      ? meta.asOf
      : new Intl.DateTimeFormat("ko-KR", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(parsedAsOf),
  };
}
