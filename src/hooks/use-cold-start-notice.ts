/**
 * 백엔드 콜드 스타트 알림을 구독한다.
 *
 * 알림 상태는 리액트 밖(`api/cold-start-notice.ts`)에 있다. API 요청 경로에서
 * 켜지므로 `useSyncExternalStore`로 이어 붙인다.
 *
 * 값만 돌려주고 JSX를 반환하지 않는다(AGENTS.md §7.3).
 */
import { useSyncExternalStore } from "react";
import {
  getColdStartNotice,
  subscribeColdStartNotice,
} from "../api/cold-start-notice";

export function useColdStartNotice(): boolean {
  return useSyncExternalStore(subscribeColdStartNotice, getColdStartNotice);
}
