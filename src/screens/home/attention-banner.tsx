import { Card } from "../../components/common/card";
import { Badge } from "../../components/common/badge";
import { Icon } from "../../components/common/icon";
import type { AttentionData } from "../../types/home";

interface AttentionBannerProps {
  readonly data: AttentionData;
  readonly onNavigateToRange?: () => void;
}

export function AttentionBanner({ data, onNavigateToRange }: AttentionBannerProps) {
  return (
    <Card
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--warn)" }}>
          <Icon name="alertTriangle" size={16} />
          <span>주의 필요</span>
        </div>
      }
      action={<Badge variant={data.tone}>{data.regimeLabel}</Badge>}
      className="attention-banner"
    >
      {data.events.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
          예정된 일정이 없습니다.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {data.events.map((event) => (
            <li
              key={`${event.dateLabel}-${event.title}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.625rem 0.875rem",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <span>
                <span style={{ display: "block", fontSize: "0.875rem", fontWeight: 600 }}>
                  {event.title}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {event.currencyCode} · {event.dateLabel}
                </span>
              </span>
              <Badge variant={event.severity === "고변동성" ? "danger" : "warn"}>
                {event.severity}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {onNavigateToRange && (
        <button
          type="button"
          onClick={onNavigateToRange}
          style={{
            marginTop: "0.75rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--warn)",
            textDecoration: "underline",
            display: "block",
            width: "100%",
            textAlign: "right",
          }}
        >
          환율 범위 확인하기 →
        </button>
      )}
    </Card>
  );
}
