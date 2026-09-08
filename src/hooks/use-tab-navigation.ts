import { useCallback, useEffect, useState } from "react";
import type { NavTabId } from "../types/navigation";

export const NAV_PATHS: Readonly<Record<NavTabId, string>> = {
  home: "/",
  planner: "/route",
  assets: "/xray",
  range: "/forecast",
  mypage: "/mypage",
};

export function getTabFromPathname(pathname: string): NavTabId {
  const normalizedPath =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  switch (normalizedPath) {
    case NAV_PATHS.planner:
      return "planner";
    case NAV_PATHS.assets:
      return "assets";
    case NAV_PATHS.range:
      return "range";
    case NAV_PATHS.mypage:
    case "/mypage/diagnosis":
      return "mypage";
    default:
      return "home";
  }
}

interface UseTabNavigationResult {
  readonly activeTab: NavTabId;
  readonly navigate: (tab: NavTabId) => void;
}

export function useTabNavigation(): UseTabNavigationResult {
  const [activeTab, setActiveTab] = useState<NavTabId>(() =>
    getTabFromPathname(window.location.pathname),
  );

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getTabFromPathname(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((tab: NavTabId) => {
    const nextPath = NAV_PATHS[tab];
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
    setActiveTab(tab);
  }, []);

  return { activeTab, navigate };
}
