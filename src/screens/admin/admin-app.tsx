/**
 * 관리자 콘솔 셸.
 *
 * 사용자 앱과 레이아웃·내비게이션을 공유하지 않는 임시 운영 도구다.
 * 세션과 경로만 여기서 다루고, 데이터는 각 화면이 직접 부른다.
 */
import { useCallback, useEffect, useState } from "react";
import { logout } from "../../api/auth";
import { installSessionRefresh } from "../../api/session-bootstrap";
import { readApiSession } from "../../api/session";
import { AdminAiExplainScreen } from "./admin-ai-explain-screen";
import { AdminAiExtractScreen } from "./admin-ai-extract-screen";
import { AdminCurrenciesScreen } from "./admin-currencies-screen";
import {
  toAuthFailureMessage,
  type AdminAuthFailure,
} from "./admin-errors";
import { AdminFxRatesScreen } from "./admin-fx-rates-screen";
import { AdminLoginScreen } from "./admin-login-screen";
import {
  ADMIN_NAV_ITEMS,
  ADMIN_USERS_PATH,
  adminUserDetailPath,
  resolveAdminRoute,
  type AdminRoute,
} from "./admin-routing";
import { AdminUserDetailScreen } from "./admin-user-detail-screen";
import { AdminUsersScreen } from "./admin-users-screen";
import "./admin-shell.css";

type AdminSessionState =
  | { readonly status: "signedOut"; readonly notice: string | null }
  | { readonly status: "signedIn" };

function initialSessionState(): AdminSessionState {
  return readApiSession() === null
    ? { status: "signedOut", notice: null }
    : { status: "signedIn" };
}

export function AdminApp() {
  const [session, setSession] = useState<AdminSessionState>(initialSessionState);
  const [route, setRoute] = useState<AdminRoute>(() =>
    resolveAdminRoute(window.location.pathname),
  );

  useEffect(() => {
    // 401을 만났을 때 client.ts가 쓸 갱신 수단을 등록한다.
    installSessionRefresh();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(resolveAdminRoute(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    setRoute(resolveAdminRoute(path));
  }, []);

  /** 401·403을 만나면 세션을 버리고 사유와 함께 로그인 화면으로 돌린다. */
  const handleAuthFailure = useCallback((failure: AdminAuthFailure) => {
    logout();
    setSession({ status: "signedOut", notice: toAuthFailureMessage(failure) });
  }, []);

  const handleSignOut = () => {
    logout();
    setSession({ status: "signedOut", notice: null });
  };

  if (session.status === "signedOut") {
    return (
      <AdminLoginScreen
        notice={session.notice}
        onSignedIn={() => setSession({ status: "signedIn" })}
      />
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-shell__header">
        <span className="admin-shell__brand">Divurve 관리자 콘솔</span>
        <nav className="admin-shell__nav">
          {ADMIN_NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`admin-nav-item ${
                item.kinds.includes(route.kind) ? "admin-nav-item--active" : ""
              }`.trim()}
              aria-current={item.kinds.includes(route.kind) ? "page" : undefined}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button type="button" className="admin-button" onClick={handleSignOut}>
          로그아웃
        </button>
      </header>

      <main className="admin-shell__main">
        <p className="admin-panel admin-panel--warn">
          이 콘솔은 전 사용자의 데이터를 다룹니다. 화면을 스크린샷·로그로
          남기지 마세요.
        </p>

        {route.kind === "users" && (
          <AdminUsersScreen
            onAuthFailure={handleAuthFailure}
            onSelectUser={(userId) => navigate(adminUserDetailPath(userId))}
          />
        )}
        {route.kind === "userDetail" && (
          <AdminUserDetailScreen
            key={route.userId}
            userId={route.userId}
            onAuthFailure={handleAuthFailure}
            onBack={() => navigate(ADMIN_USERS_PATH)}
          />
        )}
        {route.kind === "currencies" && (
          <AdminCurrenciesScreen onAuthFailure={handleAuthFailure} />
        )}
        {route.kind === "fxRates" && (
          <AdminFxRatesScreen onAuthFailure={handleAuthFailure} />
        )}
        {route.kind === "aiExplain" && (
          <AdminAiExplainScreen onAuthFailure={handleAuthFailure} />
        )}
        {route.kind === "aiExtract" && (
          <AdminAiExtractScreen onAuthFailure={handleAuthFailure} />
        )}
      </main>
    </div>
  );
}
