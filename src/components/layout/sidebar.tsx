import type { AccountKind } from "../../app/session-state";
import { NAV_ITEMS, type NavTabId } from "../../types/navigation";
import { Icon } from "../common/icon";

interface SidebarProps {
  readonly activeTab: NavTabId;
  readonly accountKind: AccountKind;
  readonly onSelectTab: (tab: NavTabId) => void;
  readonly onLogin?: () => void;
}

export function Sidebar({
  activeTab,
  accountKind,
  onSelectTab,
  onLogin,
}: SidebarProps) {
  const isDemoAccount = accountKind === "demo";
  return (
    <aside
      className="sidebar"
      style={{
        width: "var(--sidebar-width)",
        height: "100vh",
        backgroundColor: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        zIndex: 50,
        transition: "background-color 0.2s, border-color 0.2s",
      }}
    >
      {/* 로고 & 서비스명 */}
      <div
        style={{
          padding: "1.5rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--primary-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--primary)",
          }}
        >
          <Icon name="sparkles" size={20} />
        </div>
        <h1
          style={{
            fontSize: "1.125rem",
            fontWeight: 800,
            letterSpacing: "0.1em",
            color: "var(--text)",
          }}
        >
          DIVURVE
        </h1>
      </div>

      {/* 내비게이션 메뉴 */}
      <nav
        style={{
          flex: 1,
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.375rem",
          overflowY: "auto",
        }}
        aria-label="주 메뉴"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-tour={`tour-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--primary)" : "var(--text-muted)",
                backgroundColor: isActive ? "var(--primary-subtle)" : "transparent",
                borderLeft: `3px solid ${isActive ? "var(--primary)" : "transparent"}`,
                boxShadow: isActive ? "var(--shadow-sm)" : "none",
                transition: "all 150ms ease",
                textAlign: "left",
              }}
            >
              <Icon
                name={item.iconName}
                size={18}
                className={isActive ? "icon--active" : ""}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 하단 유틸리티 (계정 종류 표시) */}
      <div
        style={{
          padding: "1rem",
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.75rem",
            fontWeight: 500,
            color: isDemoAccount ? "var(--primary)" : "var(--text-muted)",
            padding: "0.5rem 0.625rem",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--surface-subtle)",
            border: "1px solid var(--border)",
          }}
        >
          <Icon name={isDemoAccount ? "checkCircle" : "database"} size={14} />
          <span>{isDemoAccount ? "데모 계정" : "내 계정"}</span>
        </div>

        {isDemoAccount && onLogin && (
          <button
            type="button"
            onClick={onLogin}
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              color: "var(--primary)",
              padding: "0.5rem 0.625rem",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--bg)",
              border: "1px solid var(--border)",
              textAlign: "center",
            }}
          >
            로그인하고 내 자산 보기
          </button>
        )}

        <div
          style={{
            fontSize: "0.6875rem",
            color: "var(--text-muted)",
            backgroundColor: "var(--bg)",
            padding: "0.5rem 0.625rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {isDemoAccount
            ? "데모 세션 · 화면별 출처 확인"
            : "계정 세션 · 화면별 출처 확인"}
        </div>
      </div>
    </aside>
  );
}
