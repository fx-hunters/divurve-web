import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import {
  fetchNotifications,
  type NotificationItem,
} from "../../api/notifications";

/** 알림 조회의 비동기 상태. 한 시점에 하나의 상태만 가진다 (AGENTS.md §7.4). */
export type NotificationsState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "success";
      readonly notifications: readonly NotificationItem[];
    };

const FALLBACK_ERROR_MESSAGE =
  "알림을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.";

export function toNotificationsErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : FALLBACK_ERROR_MESSAGE;
}

/**
 * 알림 목록을 조회한다.
 *
 * 드롭다운이 닫혀 있는 동안에는 요청을 보내지 않는다. `isEnabled`가 켜질 때마다
 * 다시 조회하므로 사용자가 드롭다운을 다시 열면 최신 목록을 본다.
 */
export function useNotifications(isEnabled: boolean): NotificationsState {
  const [state, setState] = useState<NotificationsState>({ status: "idle" });

  useEffect(() => {
    if (!isEnabled) {
      setState({ status: "idle" });
      return;
    }

    let isAlive = true;
    setState({ status: "loading" });
    fetchNotifications()
      .then((notifications) => {
        if (isAlive) setState({ status: "success", notifications });
      })
      .catch((error: unknown) => {
        if (isAlive) {
          setState({
            status: "error",
            message: toNotificationsErrorMessage(error),
          });
        }
      });

    return () => {
      isAlive = false;
    };
  }, [isEnabled]);

  return state;
}
