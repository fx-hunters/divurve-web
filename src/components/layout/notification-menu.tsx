import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { NotificationItem } from "../../api/notifications";
import { Icon } from "../common/icon";
import { useNotifications, type NotificationsState } from "./use-notifications";

const MENU_ROOT_SELECTOR = "[data-notification-menu]";
const PANEL_ID = "notification-panel";

const messageStyle: CSSProperties = {
  padding: "1.25rem 1rem",
  fontSize: "0.8125rem",
  color: "var(--text-muted)",
  textAlign: "center",
  lineHeight: 1.6,
};

/** 클릭 지점이 알림 메뉴 바깥인지 판정한다. */
function isOutsideMenu(target: EventTarget | null): boolean {
  return (
    !(target instanceof Element) || target.closest(MENU_ROOT_SELECTOR) === null
  );
}

function NotificationRow({ notification }: { notification: NotificationItem }) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.625rem",
        padding: "0.75rem 1rem",
        borderTop: "1px solid var(--border)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "6px",
          height: "6px",
          marginTop: "0.4rem",
          flexShrink: 0,
          borderRadius: "var(--radius-full)",
          backgroundColor: notification.read
            ? "var(--border)"
            : "var(--primary)",
        }}
      />
      <div style={{ display: "grid", gap: "0.125rem", textAlign: "left" }}>
        <strong style={{ fontSize: "0.8125rem", color: "var(--text)" }}>
          {notification.title}
        </strong>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          {notification.message}
        </span>
        <time
          dateTime={notification.createdAt}
          style={{
            fontSize: "0.6875rem",
            color: "var(--text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {notification.createdAt.slice(0, 10)}
        </time>
      </div>
    </li>
  );
}

function NotificationPanelBody({ state }: { state: NotificationsState }) {
  if (state.status === "idle" || state.status === "loading") {
    return (
      <p role="status" style={messageStyle}>
        알림을 불러오는 중입니다
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p role="alert" style={{ ...messageStyle, color: "var(--danger)" }}>
        {state.message}
      </p>
    );
  }

  if (state.notifications.length === 0) {
    return <p style={messageStyle}>새 알림이 없습니다</p>;
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {state.notifications.map((notification) => (
        <NotificationRow key={notification.id} notification={notification} />
      ))}
    </ul>
  );
}

/**
 * 헤더 우상단 알림 버튼과 드롭다운.
 *
 * 목록은 드롭다운을 열 때만 조회하고, Escape·바깥 클릭으로 닫는다.
 */
export function NotificationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const state = useNotifications(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const handleMouseDown = (event: MouseEvent) => {
      if (isOutsideMenu(event.target)) setIsOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen]);

  return (
    <div data-notification-menu="" style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="알림"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={PANEL_ID}
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "var(--radius-full)",
          backgroundColor: isOpen
            ? "var(--primary-subtle)"
            : "var(--surface-subtle)",
          border: `1px solid ${isOpen ? "var(--primary-border)" : "var(--border)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isOpen ? "var(--primary)" : "var(--text-muted)",
          transition: "all var(--transition-fast)",
        }}
      >
        <Icon name="bell" size={16} />
      </button>

      {isOpen && (
        <div
          id={PANEL_ID}
          role="region"
          aria-label="알림 목록"
          style={{
            position: "absolute",
            top: "calc(100% + 0.5rem)",
            right: 0,
            width: "min(20rem, calc(100vw - 3rem))",
            maxHeight: "18rem",
            overflowY: "auto",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 60,
          }}
        >
          <h3
            style={{
              padding: "0.75rem 1rem",
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            알림
          </h3>
          <NotificationPanelBody state={state} />
        </div>
      )}
    </div>
  );
}
