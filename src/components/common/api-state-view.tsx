import { Card } from "./card";
import { Icon } from "./icon";

interface ApiStateViewProps {
  /*
   * 로딩은 여기서 다루지 않는다. 화면을 통째로 덮는 대신 각 화면이 골격과
   * 컨트롤을 그대로 세우고 값 자리만 자리표시자로 채운다
   * (components/common/skeleton.tsx).
   */
  readonly status: "error" | "empty";
  readonly title: string;
  readonly message: string;
  readonly onRetry?: () => void;
}

export function ApiStateView({
  status,
  title,
  message,
  onRetry,
}: ApiStateViewProps) {
  const iconName = status === "error" ? "alertCircle" : "database";

  return (
    <Card className="api-state-view">
      <div
        role={status === "error" ? "alert" : "status"}
        aria-live="polite"
        style={{
          minHeight: "280px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        {/* 바깥 컨테이너가 이미 상태를 읽어주므로, 안쪽 시각 요소는 숨긴다 */}
        <span
          aria-hidden="true"
          style={{ color: status === "error" ? "var(--danger)" : "var(--primary)" }}
        >
          <Icon name={iconName} size={28} />
        </span>
        <div>
          <h2
            style={{
              color: "var(--text)",
              fontSize: "1.25rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            {title}
          </h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{message}</p>
        </div>
        {status === "error" && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--primary)",
              color: "var(--primary-content)",
              fontWeight: 700,
            }}
          >
            다시 시도
          </button>
        )}
      </div>
    </Card>
  );
}
