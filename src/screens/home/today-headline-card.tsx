import { Card } from "../../components/common/card";
import { Badge } from "../../components/common/badge";
import type { HomeTone, ProfileFitData, TodaySummaryData } from "../../types/home";

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
    <Card
      title="오늘의 핵심"
      action={<Badge variant={toBadgeVariant(today.tone)}>{today.badgeLabel}</Badge>}
      highlight
      className="today-action-card"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <p
          style={{
            margin: 0,
            fontSize: "clamp(1.125rem, 3vw, 1.5rem)",
            fontWeight: 700,
            color: "var(--text)",
            lineHeight: 1.5,
          }}
        >
          {today.headline}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>통화 집중도</span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {profileFit.gradeLabel !== undefined && (
              <span style={{ color: "var(--text-muted)" }}>
                위험성향 {profileFit.gradeLabel}
              </span>
            )}
            <Badge variant={toBadgeVariant(profileFit.tone)}>
              {profileFit.concentrationLabel}
            </Badge>
          </span>
        </div>

        {!isProfileMeasured && (
          <p
            style={{
              margin: 0,
              fontSize: "0.8125rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
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

        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
          기준 시각: {asOfLabel}
        </p>
      </div>
    </Card>
  );
}
