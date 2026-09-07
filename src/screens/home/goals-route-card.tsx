import { Card } from "../../components/common/card";
import { Badge } from "../../components/common/badge";
import type { GoalsRouteData } from "../../types/home";

interface GoalsRouteCardProps {
  readonly data: GoalsRouteData;
  readonly onNavigateToPlanner?: () => void;
}

export function GoalsRouteCard({ data, onNavigateToPlanner }: GoalsRouteCardProps) {
  return (
    <Card
      title="내 목표"
      action={
        onNavigateToPlanner && (
          <button
            type="button"
            onClick={onNavigateToPlanner}
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--primary)",
              textDecoration: "underline",
            }}
          >
            플래너 열기
          </button>
        )
      }
      className="goals-route-card"
    >
      {!data.isRouteEnabled && (
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          환전 경로 계산 기능은 아직 서버에서 준비 중입니다. 준비되면 목표별 회차
          계획이 이곳에 표시됩니다.
        </p>
      )}

      {data.isRouteEnabled && data.goals.length === 0 && (
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
          등록된 목표가 없습니다.
        </p>
      )}

      {data.goals.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {data.goals.map((goal) => (
            <li
              key={goal.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span>
                <span style={{ display: "block", fontSize: "0.875rem", fontWeight: 700 }}>
                  {goal.name}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {goal.targetDateLabel}까지
                </span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.9375rem", fontWeight: 700 }}>
                  {goal.currencyCode} {goal.targetAmount.toLocaleString()}
                </span>
                <Badge variant="default">{goal.status}</Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
