import { refreshSession, startDemoSession } from "./auth";
import { registerSessionRefresher } from "./client";
import { readApiSession, readStoredApiSession, type ApiSession } from "./session";

let inflight: Promise<ApiSession> | null = null;
let refreshInflight: Promise<ApiSession> | null = null;

/**
 * 만료된 세션을 되살린다.
 *
 * 부트스트랩과 401 복구가 같은 갱신 요청을 공유한다. 갱신 실패를 로그아웃으로
 * 취급하지 않는다. 저장된 만료 세션은 재시도에 사용하고 명시적 로그아웃 시 지운다.
 */
function refreshApiSession(): Promise<ApiSession> {
  refreshInflight ??= refreshSession().finally(() => {
    refreshInflight = null;
  });
  return refreshInflight;
}

function refreshAccessToken(): Promise<string | null> {
  return refreshApiSession()
    .then((session) => session.accessToken)
    .catch(() => null);
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
 * 쓸 수 있는 세션이 있으면 그대로 쓰고, 만료 세션은 먼저 갱신한다.
 * 저장된 세션 자체가 없는 경우에만 BE 데모 계정 세션을 발급받는다.
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

  inflight ??= (readStoredApiSession() === null
    ? startDemoSession()
    : refreshApiSession()).finally(() => {
    inflight = null;
  });

  return inflight;
}
