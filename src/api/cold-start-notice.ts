/**
 * 백엔드 콜드 스타트 알림 상태.
 *
 * 백엔드는 무료 호스팅 인스턴스 위에 있어 일정 시간 요청이 없으면 절전 상태로
 * 내려간다. 그 뒤 첫 요청은 인스턴스가 깨어날 때까지 수십 초 매달리므로,
 * 화면에서는 응답이 오지 않는 것처럼 보인다. `api/client.ts`가 지연을 감지하면
 * 여기에 표시하고, 최상단 배너가 이 값을 구독한다.
 *
 * 한 번 켜진 알림은 끄지 않는다. 다음 요청도 같은 이유로 느릴 수 있고, 켜졌다
 * 꺼지기를 반복하면 오히려 읽기 어렵다. 새로고침하면 모듈 상태가 사라진다.
 */

/** 이 시간을 넘겨도 응답이 없으면 절전 상태로 보고 알림을 켠다. */
export const COLD_START_THRESHOLD_MS = 4_000;

type ColdStartListener = () => void;

const listeners = new Set<ColdStartListener>();
let isNoticed = false;

/** 응답이 늦거나 연결이 끊겼음을 알린다. 이미 켜져 있으면 아무 일도 하지 않는다. */
export function noticeColdStart(): void {
  if (isNoticed) return;
  isNoticed = true;
  for (const listener of listeners) listener();
}

export function getColdStartNotice(): boolean {
  return isNoticed;
}

export function subscribeColdStartNotice(
  listener: ColdStartListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 테스트 격리용. 화면·API 코드에서는 부르지 않는다. */
export function resetColdStartNotice(): void {
  isNoticed = false;
  listeners.clear();
}
