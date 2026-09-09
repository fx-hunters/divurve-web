import { Badge } from "../../../components/common/badge";
import type { ForecastEventItem } from "../../../types/forecast";
import { CARD_PADDING, CARD_SURFACE, CARD_TITLE } from "./card-surface";

/**
 * 목록 최대 높이. 항목이 서너 개를 넘어도 카드가 계속 길어지지 않게 여기서
 * 자르고 스크롤로 넘긴다. 다음 항목이 절반쯤 걸치도록 잡아 스크롤이 있다는
 * 사실이 보이게 한다.
 */
const LIST_MAX_HEIGHT = "14.5rem";

interface EventsCardProps {
  readonly events: readonly ForecastEventItem[];
}

/** 다가오는 일정 카드. props 만 받아 그린다(§7.2). */
export function EventsCard({ events }: EventsCardProps) {
  return (
    <div style={{ ...CARD_SURFACE, padding: CARD_PADDING }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <h3 style={CARD_TITLE}>다가오는 일정</h3>
        {events.length > 0 && (
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {events.length}건
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          maxHeight: LIST_MAX_HEIGHT,
          overflowY: "auto",
        }}
      >
        {events.length === 0 && (
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
            예정된 일정이 없습니다.
          </p>
        )}
        {events.map((event) => (
          <div
            key={event.title}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.75rem",
              backgroundColor: "var(--bg)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>
                {event.title}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginTop: "0.125rem",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {event.dateLabel}
              </div>
            </div>
            <Badge variant={event.severity === "고변동성" ? "danger" : "warn"}>
              {event.severity}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
