/**
 * 세션을 확인하는 동안 세워 두는 앱 셸.
 *
 * 다른 화면과 달리 여기서는 컨트롤이 살아 있지 않다. 이유가 있다.
 * - 실제 `Sidebar` 는 `accountKind` 를 요구하는데 부트스트랩 중에는 세션에
 *   그 값이 없다. 임의로 채우면 곧바로 뒤집히면서, 없애려던 화면 튐이 생긴다.
 * - 실제 `Header` 는 `NotificationMenu` 를 품고 그건 마운트 시 요청을 쏜다.
 *   토큰이 생기기 전이라 확정 401 이다.
 * - 애초에 세션이 없는 구간이라 어디로 이동해도 갈 곳이 없다. 값만 늦게 오는
 *   다른 화면과는 성격이 다르다.
 *
 * 실제 셸과 같은 클래스명을 쓰므로 반응형 규칙(styles/layout.css)은 그대로
 * 따라온다. 사이드바는 768px 아래에서, 하단 탭은 769px 위에서 각각 숨는다.
 *
 * 여기에 `<h1>` 이나 "DIVURVE" 글자를 넣으면 안 된다. 앱 테스트가 그 제목을
 * '진짜 셸이 떴다'는 신호로 쓴다.
 */
import { Skeleton } from "../components/common/skeleton";
import { NAV_ITEMS } from "../types/navigation";

/** 본문 자리에 세울 카드 수. 화면마다 다르지만 첫 화면 높이는 이 정도다. */
const BODY_CARDS = [0, 1, 2];

const PANEL_STYLE = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-sm)",
} as const;

function SidebarSkeleton() {
  return (
    <div
      className="sidebar"
      aria-hidden="true"
      style={{
        width: "var(--sidebar-width)",
        height: "var(--viewport-height)",
        backgroundColor: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          height: "var(--header-height)",
          boxSizing: "border-box",
          padding: "0 1.5rem",
          flexShrink: 0,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <Skeleton shape="circle" width="32px" />
        <Skeleton width="7rem" />
      </div>

      <div
        style={{
          flex: 1,
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.375rem",
        }}
      >
        {NAV_ITEMS.map((item) => (
          <Skeleton key={item.id} shape="block" height="2.75rem" />
        ))}
      </div>

      <div
        style={{
          padding: "1rem",
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <Skeleton shape="block" height="2rem" />
        <Skeleton shape="block" height="2rem" />
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="app-shell">
      <SidebarSkeleton />

      <div className="app-main-layout">
        <div
          className="app-header"
          aria-hidden="true"
          style={{
            height: "var(--header-height)",
            boxSizing: "border-box",
            padding: "0 1.5rem",
            borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <Skeleton width="8rem" />
          <span style={{ display: "flex", gap: "0.5rem" }}>
            <Skeleton shape="circle" width="38px" />
            <Skeleton shape="circle" width="38px" />
            <Skeleton shape="circle" width="38px" />
          </span>
        </div>

        <main className="app-scroll-content">
          <div
            className="app-content-container"
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {BODY_CARDS.map((card) => (
              <div
                key={card}
                aria-hidden="true"
                style={{ ...PANEL_STYLE, padding: "1.5rem" }}
              >
                <Skeleton shape="block" height="6rem" />
              </div>
            ))}
          </div>
        </main>
      </div>

      <div className="mobile-nav" aria-hidden="true">
        {NAV_ITEMS.map((item) => (
          <Skeleton key={item.id} shape="block" height="2.25rem" />
        ))}
      </div>
    </div>
  );
}
