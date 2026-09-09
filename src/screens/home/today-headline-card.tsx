import { Card } from "../../components/common/card";
import { Badge } from "../../components/common/badge";
import { Skeleton } from "../../components/common/skeleton";
import type { HomeTone, ProfileFitData, TodaySummaryData } from "../../types/home";
import "./today-headline-card.css";

/** 뷰 톤을 Badge 변형으로 옮긴다. Badge는 primary/normal/warn/danger/default를 받는다. */
export function toBadgeVariant(
  tone: HomeTone,
): "default" | "normal" | "warn" | "danger" {
  return tone;
}

interface TodayHeadlineCardProps {
  /** 아직 서버를 기다리는 중이면 null. 제목·라벨·버튼은 그대로 둔다. */
  readonly today: TodaySummaryData | null;
  readonly profileFit: ProfileFitData | null;
  readonly isProfileMeasured: boolean;
  readonly asOfLabel: string | null;
  readonly onNavigateToMypage?: () => void;
}

export function TodayHeadlineCard({
  today,
  profileFit,
  isProfileMeasured,
  asOfLabel,
  onNavigateToMypage,
}: TodayHeadlineCardProps) {
  return (
    <Card highlight className="today-headline">
      <div className="today-headline__band">
        <span className="today-headline__lead">
          <h3 className="today-headline__eyebrow">오늘의 핵심</h3>
          {today === null ? (
            <Skeleton width="4.5rem" />
          ) : (
            <Badge variant={toBadgeVariant(today.tone)}>{today.badgeLabel}</Badge>
          )}
          <p className="today-headline__sentence">
            {today?.headline ?? <Skeleton width="60%" />}
          </p>
        </span>

        <span className="today-headline__meta">
          <span className="today-headline__fit">
            <span className="today-headline__muted">통화 집중도</span>
            {profileFit?.gradeLabel !== undefined && (
              <span className="today-headline__muted">
                위험성향 {profileFit.gradeLabel}
              </span>
            )}
            {profileFit === null ? (
              <Skeleton width="4rem" />
            ) : (
              <Badge variant={toBadgeVariant(profileFit.tone)}>
                {profileFit.concentrationLabel}
              </Badge>
            )}
          </span>
          <span className="today-headline__asof">
            기준 시각: {asOfLabel ?? <Skeleton width="7rem" />}
          </span>
        </span>
      </div>

      {/* 진단 안내는 서버가 '진단 안 됨'이라고 답한 뒤에만 띄운다. */}
      {today !== null && !isProfileMeasured && (
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
