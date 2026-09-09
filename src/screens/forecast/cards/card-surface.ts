import type { CSSProperties } from "react";

/**
 * 전망 화면 카드가 공유하는 표면 스타일. 카드마다 같은 네 줄을 베껴 두면
 * 토큰이 바뀔 때 한 곳을 놓친다(AGENTS §6 — 색은 항상 토큰).
 */
export const CARD_SURFACE: CSSProperties = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-sm)",
};

/** 카드 제목(대문자 소제목) 공통 타이포. */
export const CARD_TITLE: CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 700,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  margin: 0,
};

/** 카드 안쪽 여백. 하단 3단 카드가 같은 리듬을 갖게 한 곳에서 정한다. */
export const CARD_PADDING = "1.25rem";
