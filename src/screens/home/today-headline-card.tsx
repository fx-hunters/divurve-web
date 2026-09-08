import { Card } from "../../components/common/card";
import { Badge } from "../../components/common/badge";
import type {
  HomeTone,
  ProfileFitData,
  TodaySummaryData,
  UpcomingEventItem,
} from "../../types/home";
import "./today-headline-card.css";

/** 뷰 톤을 Badge 변형으로 옮긴다. Badge는 primary/normal/warn/danger/default를 받는다. */
export function toBadgeVariant(
  tone: HomeTone,
): "default" | "normal" | "warn" | "danger" {
  return tone;
}

interface TodayHeadlineCardProps {
  readonly today: TodaySummaryData;
  readonly profileFit: ProfileFitData;
  readonly isProfileMeasured: boolean;
  readonly asOfLabel: string;
  /**
   * 띠에 올릴 일정. 비면 줄 자체를 그리지 않는다 — 빈 칩 줄은 자리만 먹는다.
   * 고르는 일은 presenter(`toHeadlineEvents`)가 한다.
   */
  readonly upcomingEvents?: readonly UpcomingEventItem[];
  readonly onNavigateToMypage?: () => void;
}

export function TodayHeadlineCard({
  today,
  profileFit,
  isProfileMeasured,
  asOfLabel,
  upcomingEvents = [],
  onNavigateToMypage,
}: TodayHeadlineCardProps) {
  return (
    <Card highlight className="today-headline">
      <div className="today-headline__band">
        <span className="today-headline__lead">
          <h3 className="today-headline__eyebrow">오늘의 핵심</h3>
          <Badge variant={toBadgeVariant(today.tone)}>{today.badgeLabel}</Badge>
          <p className="today-headline__sentence">{today.headline}</p>
        </span>

        <span className="today-headline__meta">
          <span className="today-headline__fit">
            <span className="today-headline__muted">통화 집중도</span>
            {profileFit.gradeLabel !== undefined && (
              <span className="today-headline__muted">
                위험성향 {profileFit.gradeLabel}
              </span>
            )}
            <Badge variant={toBadgeVariant(profileFit.tone)}>
              {profileFit.concentrationLabel}
            </Badge>
          </span>
          <span className="today-headline__asof">기준 시각: {asOfLabel}</span>
        </span>
      </div>

      {upcomingEvents.length > 0 && (
        <ul className="today-headline__events" aria-label="다가오는 고변동성 일정">
          {upcomingEvents.map((event) => (
            <li className="today-headline__event" key={`${event.dateLabel}-${event.title}`}>
              <span className="today-headline__event-date">
                {event.shortDateLabel}
              </span>
              <span className="today-headline__event-title">{event.title}</span>
            </li>
          ))}
        </ul>
      )}

      {!isProfileMeasured && (
        <p className="today-headline__notice">
          위험성향을 진단하면 내 성향에 맞는 기준선으로 집중도를 판정합니다.
          {onNavigateToMypage && (
            <button
              type="button"
              onClick={onNavigateToMypage}
              style={{
                marginLeft: "0.375rem",
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "var(--primary)",
                textDecoration: "underline",
              }}
            >
              진단하러 가기
            </button>
          )}
        </p>
      )}
    </Card>
  );
}
