import { useCallback, useEffect, useState } from "react";
import { readApiSession } from "../api/session";
import {
  normalizePathname,
  resolveAppRoute,
  toPathname,
  type AppRoute,
} from "./app-routing";

interface UseAppRouteResult {
  readonly route: AppRoute;
  /** 히스토리에 항목을 남기며 이동한다. 뒤로가기로 되돌아올 수 있다. */
  readonly navigate: (next: AppRoute) => void;
  /** 현재 히스토리 항목을 갈아끼운다. 되돌아갈 필요가 없는 이동에 쓴다. */
  readonly replace: (next: AppRoute) => void;
}

/** 진단 전용 경로의 접근 판정 기준. 데모 세션과 비로그인은 회원이 아니다. */
function isMemberSession(): boolean {
  return readApiSession()?.isDemo === false;
}

function readRouteFromLocation(): AppRoute {
  return resolveAppRoute(window.location.pathname, isMemberSession());
}

/**
 * 주소창과 화면을 한 쌍으로 묶는다.
 *
 * 화면 전환은 전부 이 훅을 거치므로, 새로고침·뒤로가기·링크 진입이
 * 모두 같은 해석기(`resolveAppRoute`)를 통과한다.
 */
export function useAppRoute(): UseAppRouteResult {
  const [route, setRoute] = useState<AppRoute>(readRouteFromLocation);

  // 별칭(`/route/`)이나 권한이 없어 되돌린 경로(`/diagnosis/quick`)가 주소창에
  // 남으면 새로고침할 때마다 같은 되돌림이 반복된다. 정식 경로로 맞춰 둔다.
  useEffect(() => {
    const canonicalPath = toPathname(route);
    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState(null, "", canonicalPath);
    }
  }, [route]);

  useEffect(() => {
    const handlePopState = () => setRoute(readRouteFromLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((next: AppRoute) => {
    const nextPath = toPathname(next);
    if (normalizePathname(window.location.pathname) !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
    setRoute(next);
  }, []);

  const replace = useCallback((next: AppRoute) => {
    window.history.replaceState(null, "", toPathname(next));
    setRoute(next);
  }, []);

  return { route, navigate, replace };
}
