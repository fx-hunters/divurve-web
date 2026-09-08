export type NavTabId = "home" | "planner" | "range" | "assets" | "mypage";

export interface NavItem {
  readonly id: NavTabId;
  readonly label: string;
  readonly iconName: "home" | "planner" | "range" | "assets" | "mypage";
}

/** 사이드바·모바일 내비게이션이 공유하는 주 메뉴. 순서가 곧 노출 순서다. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "home", label: "대시보드", iconName: "home" },
  { id: "planner", label: "환전 플래너", iconName: "planner" },
  { id: "range", label: "환율 전망", iconName: "range" },
  { id: "assets", label: "내 자산", iconName: "assets" },
  { id: "mypage", label: "마이페이지", iconName: "mypage" },
] as const;
