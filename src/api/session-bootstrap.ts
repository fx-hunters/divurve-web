import { refreshSession, startDemoSession } from "./auth";
import { registerSessionRefresher } from "./client";
import { clearApiSession, readApiSession, type ApiSession } from "./session";

let inflight: Promise<ApiSession> | null = null;
let refreshInflight: Promise<string | null> | null = null;

/**
 * 만료된 세션을 되살린다.
 *
 * 리프레시가 실패하면 남은 세션을 버려서, 다음 `ensureApiSession()` 호출이
 * 데모 세션을 새로 발급받을 수 있게 한다. 동시에 여러 요청이 401을 맞아도
 * 갱신 요청은 한 번만 나간다.
 */
function refreshAccessToken(): Promise<string | null> {
  refreshInflight ??= refreshSession()
    .then((session) => session.accessToken)
    .catch(() => {
      clearApiSession();
      return null;
    })
    .finally(() => {
      refreshInflight = null;
    });
  return refreshInflight;
}

/**
 * 401을 만났을 때 쓸 갱신 수단을 `client.ts`에 등록한다.
 *
 * `auth.ts`가 `client.ts`를 쓰므로 client가 auth를 직접 부르면 순환이 된다.
 * 의존 방향을 지키기 위해 여기서 주입한다(AGENTS.md §7.1).
 */
export function installSessionRefresh(): void {
  registerSessionRefresher(refreshAccessToken);
}

/**
 * API 세션을 보장한다.
 *
 * 쓸 수 있는 세션이 있으면 그대로 쓰고, 없으면 BE의 데모 계정 세션을 발급받는다.
 * 저장된 세션이 만료됐으면 `readApiSession()`이 null을 주므로 자연히 재발급된다.
 * 데모 계정 여부는 BE가 `TokenResponse.isDemo`로 알려주므로 프론트가 판단하지 않는다.
 *
 * 여러 호출자가 동시에 불러도 발급 요청은 한 번만 나간다. 실패하면 진행 중인
 * 요청을 비워 다음 호출이 다시 시도할 수 있게 한다.
 */
export function ensureApiSession(): Promise<ApiSession> {
  installSessionRefresh();

  const existing = readApiSession();
  if (existing) {
    return Promise.resolve(existing);
  }

  inflight ??= startDemoSession().finally(() => {
    inflight = null;
  });

  return inflight;
}
