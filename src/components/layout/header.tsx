import { Icon } from "../common/icon";
import { NotificationMenu } from "./notification-menu";

interface HeaderProps {
  readonly onNavigateToMypage: () => void;
  readonly activeTabTitle?: string;
  readonly isDark: boolean;
  readonly onToggleTheme: () => void;
}

export function Header({
  onNavigateToMypage,
  activeTabTitle = "대시보드",
  isDark,
  onToggleTheme,
}: HeaderProps) {
  return (
    <header
      className="app-header"
      style={{
        // 사이드바 로고 블록과 같은 높이·같은 좌우 여백(1.5rem)을 써서
        // 두 구분선과 두 제목의 기준선을 맞춘다.
        height: "var(--header-height)",
        boxSizing: "border-box",
        backgroundColor: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 40,
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: 700,
            lineHeight: 1.2,
            color: "var(--text)",
          }}
        >
          {activeTabTitle}
        </h2>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          type="button"
          data-tour="tour-theme"
          onClick={onToggleTheme}
          aria-label={isDark ? "라이트 모드로 변경" : "다크 모드로 변경"}
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--surface-subtle)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            transition: "all 0.15s",
          }}
        >
          <Icon name={isDark ? "sun" : "moon"} size={16} />
        </button>

        <NotificationMenu />

        <button
          type="button"
          onClick={onNavigateToMypage}
          aria-label="마이페이지 이동"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--primary-subtle)",
            border: "1px solid var(--primary-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--primary)",
            transition: "all 0.15s",
          }}
        >
          <Icon name="user" size={16} />
        </button>
      </div>
    </header>
  );
}
