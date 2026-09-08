/**
 * 알림 API.
 *
 * 백엔드는 `{ data, meta }` 봉투에 snake_case로 응답한다. 언래핑과
 * snake_case→camelCase 변환은 `client.ts`의 request 래퍼가 담당하며,
 * 이 경계 밖(컴포넌트·훅)에서는 camelCase만 쓴다 (AGENTS.md §4·§5).
 */
import { request } from "./client";
import type {
  NotificationDto,
  NotificationsResponse,
} from "./generated/divurve-api";

export type NotificationItem = NotificationDto;

/** 로그인 계정의 알림 목록을 조회한다. 알림이 없으면 빈 배열이다. */
export async function fetchNotifications(): Promise<
  readonly NotificationItem[]
> {
  const response = await request<NotificationsResponse>(
    "/api/v1/notifications",
  );
  return response.notifications;
}
