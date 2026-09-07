import type { AccountKind } from "../../app/session-state";

interface FooterProps {
  readonly accountKind?: AccountKind;
}

export function Footer({ accountKind = "demo" }: FooterProps) {
  return (
    <footer
      className="app-footer"
      style={{
        backgroundColor: "var(--surface)",
        borderTop: "1px solid var(--border)",
        padding: "0.75rem 1.5rem",
        fontSize: "0.75rem",
        color: "var(--text-muted)",
        textAlign: "center",
        zIndex: 30,
        transition: "background-color 0.2s, border-color 0.2s",
      }}
    >
      이 정보는 투자 권유가 아니며 실제 거래 전 별도 확인이 필요합니다. | 데이터 출처:{" "}
      {accountKind === "demo"
        ? "데모 세션 · 화면별 출처 확인"
        : "계정 세션 · 화면별 출처 확인"}
    </footer>
  );
}
