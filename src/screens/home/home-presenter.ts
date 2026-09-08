import type { ApiResult } from "../../api/client";
import type {
  HomeActiveGoal,
  HomeBadge,
  HomeBlockKey,
  HomeBlockState,
  HomeSummaryResponse,
  RiskGrade,
} from "../../api/generated/divurve-api";
import { toPercent } from "../../lib/percent";
import type {
  ActiveGoalItem,
  AttentionData,
  GoalsRouteData,
  HomeDashboardData,
  HomeTone,
  ProfileFitData,
  TodaySummaryData,
  UpcomingEventItem,
} from "../../types/home";
import type { ExposureShareItem } from "../../types/xray";

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

/**
 * 배지 어휘 테이블은 모두 `Record<HomeBadge, T>`다. 백엔드 배지가 늘거나 이름이
 * 바뀌면 여기서 컴파일이 깨진다 — 예전처럼 오지 않는 코드(`calm`·`elevated`)를
 * 들고 있으면서 실제로 오는 코드(`turbulent`)가 빠지는 일을 막는다.
 */
const BADGE_FALLBACK_HEADLINES: Readonly<Record<HomeBadge, string>> = {
  normal: "특별히 주의할 변화는 없습니다.",
  caution: "주의가 필요한 변화가 있습니다.",
  turbulent: "변동이 큰 국면입니다. 계획의 가정을 확인해 보세요.",
};

/** 표시 문구는 백엔드 `RegimeBadgeMapper.Badge.label()`과 같은 말을 쓴다. */
const BADGE_LABELS: Readonly<Record<HomeBadge, string>> = {
  normal: "정상",
  caution: "주의",
  turbulent: "급변",
};

const BADGE_TONES: Readonly<Record<HomeBadge, HomeTone>> = {
  normal: "normal",
  caution: "warn",
  turbulent: "danger",
};

/**
 * 응답은 런타임 검증을 거치지 않으므로(문자열 그대로 도착한다) 표에 있는 값만
 * 배지로 인정한다. 모르는 값은 좁히지 않고 호출부가 원문을 그대로 다룬다.
 */
const BADGE_CODES: ReadonlySet<string> = new Set(Object.keys(BADGE_LABELS));

function isHomeBadge(value: string): value is HomeBadge {
  return BADGE_CODES.has(value);
}

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

/**
 * 위험성향 등급 라벨.
 *
 * 백엔드가 보내는 4종은 `stable`·`balanced`·`aggressive`·`challenging` 이다.
 * 예전에는 서버가 보내지 않는 `conservative` 를 두고 `stable`·`challenging` 이
 * 없어서, 그 두 등급인 사용자에게 영어 코드가 그대로 노출됐다.
 * `Record<RiskGrade, …>` 라 어휘가 빠지면 컴파일이 막는다.
 */
const GRADE_LABELS: Readonly<Record<RiskGrade, string>> = {
  stable: "안정형",
  balanced: "중립형",
  aggressive: "공격형",
  challenging: "도전형",
};

function isRiskGrade(value: string): value is RiskGrade {
  return Object.prototype.hasOwnProperty.call(GRADE_LABELS, value);
}

export function toBadgeLabel(badge: string | undefined): string {
  if (badge === undefined) return "판정 불가";
  return isHomeBadge(badge) ? BADGE_LABELS[badge] : badge;
}

export function toBadgeTone(badge: string | undefined): HomeTone {
  if (badge === undefined || !isHomeBadge(badge)) return "default";
  return BADGE_TONES[badge];
}

export function toDateLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(parsed);
}

/** 좁은 자리(헤드라인 칩)용 월·일 표기. 연도는 떨어뜨린다. */
export function toShortDateLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(parsed);
}

/**
 * 헤드라인 띠에 올릴 일정.
 *
 * 경제 일정 카드는 화면 맨 아래에 있어 첫 화면에서는 스크롤해야 보인다.
 * "주의 필요"가 붙은 정보가 스크롤 뒤에 있으면 알림 구실을 못 하므로,
 * 신호에 해당하는 고변동성 일정 두 건만 위로 끌어올린다. 세부는 카드에 남는다.
 *
 * 순서는 서버가 준 그대로다 — 날짜 정렬을 프론트에서 다시 하지 않는다.
 */
export const HEADLINE_EVENT_LIMIT = 2;

export function toHeadlineEvents(
  events: readonly UpcomingEventItem[],
): readonly UpcomingEventItem[] {
  return events
    .filter((event) => event.severity === "고변동성")
    .slice(0, HEADLINE_EVENT_LIMIT);
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
    (badge !== undefined && isHomeBadge(badge)
      ? BADGE_FALLBACK_HEADLINES[badge]
      : undefined) ??
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
    gradeLabel:
      grade === undefined
        ? undefined
        : isRiskGrade(grade)
          ? GRADE_LABELS[grade]
          : grade,
    concentrationLabel: CONCENTRATION_LABELS[status] ?? status,
    tone: CONCENTRATION_TONES[status] ?? "default",
  };
}

/**
 * 경로(회차 계획) 기능은 항상 열려 있다. `route_enabled` 플래그는 divurve-api#84 에서
 * 사라졌으므로 프론트가 기능 가용성을 스스로 판단하지 않는다 — 목표 목록만 옮긴다.
 */
/**
 * 마감이 이른 순. 대시보드는 "오늘 무엇을 봐야 하는가"를 답하는 화면이고
 * 목표에서 그 답은 기한이다.
 *
 * 서버가 순서를 정해 주지 않아 프론트가 정한다(divurve-api#154). 계산이 아니라
 * 표시 순서라 §1과 충돌하지 않는다. 원본을 뒤집지 않도록 복사해 정렬한다(§7.6).
 */
function byTargetDate(a: HomeActiveGoal, b: HomeActiveGoal): number {
  return a.targetDate.localeCompare(b.targetDate);
}

/**
 * 목표 블록.
 *
 * 서버는 목표를 **정렬 없이 전부** 내려준다(`HomeSummaryService.resolveGoalsRoute`,
 * divurve-api#154). 여기서 마감 임박순으로 세우기만 하고 개수는 자르지 않는다 —
 * 카드가 목록을 스크롤로 담으므로 몇 개가 오든 카드 높이는 변하지 않는다.
 */
function toGoalsRoute(data: HomeSummaryResponse): GoalsRouteData {
  const goals: readonly ActiveGoalItem[] = [...data.goalsRoute.activeGoals]
    .sort(byTargetDate)
    .map((goal) => ({
      id: goal.id,
      name: goal.name,
      currencyCode: goal.currencyCode,
      targetAmount: goal.targetAmount,
      targetDateLabel: toDateLabel(goal.targetDate),
      status: goal.status,
    }));
  return { goals };
}

function toAttention(data: HomeSummaryResponse): AttentionData {
  const events: readonly UpcomingEventItem[] = data.attention.upcomingEvents.map(
    (event) => ({
      title: event.title,
      dateLabel: toDateLabel(event.date),
      shortDateLabel: toShortDateLabel(event.date),
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

/** 통화별 노출. 서버가 원화 평가액 내림차순으로 이미 정렬해 주므로 재정렬하지 않는다. */
function toExposure(data: HomeSummaryResponse): readonly ExposureShareItem[] {
  return (data.fxStatus.exposure ?? []).map((item) => ({
    currencyCode: item.currencyCode,
    krw: item.krw,
    sharePct: toPercent(item.share),
  }));
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
          : toPercent(data.fxStatus.fxRatio),
      topCurrencyCode: data.fxStatus.topCurrencyCode,
      dayChangeKrw: data.fxStatus.dayChangeKrw,
      sensitivity1pctKrw: data.fxStatus.sensitivity1pctKrw,
      exposure: toExposure(data),
    },
    goalsRoute: toGoalsRoute(data),
    attention: toAttention(data),
    asOfLabel: Number.isNaN(parsedAsOf.getTime())
      ? meta.asOf
      : new Intl.DateTimeFormat("ko-KR", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(parsedAsOf),
  };
}
