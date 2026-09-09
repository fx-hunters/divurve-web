import { Card } from "../../components/common/card";
import { Badge } from "../../components/common/badge";
import { Skeleton } from "../../components/common/skeleton";
import type { GoalsRouteData } from "../../types/home";
import "./goals-route-card.css";

/** 로딩 중 세워 둘 자리표시자 행 수. */
const PLACEHOLDER_GOALS = [0, 1, 2];

interface GoalsRouteCardProps {
  /** 아직 서버를 기다리는 중이면 null. 제목과 '플래너 열기'는 그대로 둔다. */
  readonly data: GoalsRouteData | null;
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
      subtitle={data !== null && data.goals.length > 1 ? "마감이 이른 순" : undefined}
    >
      {data === null && (
        <ul className="goals-route-card__list" aria-hidden="true">
          {PLACEHOLDER_GOALS.map((row) => (
            <li
              key={row}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.5rem 0.75rem",
                padding: "0.75rem 1rem",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <Skeleton width="6rem" />
              <Skeleton width="5rem" />
            </li>
          ))}
        </ul>
      )}

      {data?.goals.length === 0 && (
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          등록된 목표가 없습니다. 플래너에서 목표를 만들면 회차 계획이 이곳에
          표시됩니다.
        </p>
      )}

      {data !== null && data.goals.length > 0 && (
        <ul
          // 스크롤되는 영역은 키보드로도 훑을 수 있어야 한다.
          tabIndex={0}
          aria-label={`목표 ${data.goals.length}개, 마감이 이른 순`}
          className="goals-route-card__list"
        >
          {data.goals.map((goal) => (
            <li
              key={goal.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                // 좁은 폭에서 금액이 이름·기한을 밀어 날짜가 글자 단위로
                // 끊기지 않도록, 자리가 모자라면 금액 쪽을 아래로 내린다.
                flexWrap: "wrap",
                gap: "0.5rem 0.75rem",
                padding: "0.75rem 1rem",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: "0.875rem", fontWeight: 700 }}>
                  {goal.name}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {goal.targetDateLabel}까지
                </span>
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginLeft: "auto",
                }}
              >
                <span
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
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
