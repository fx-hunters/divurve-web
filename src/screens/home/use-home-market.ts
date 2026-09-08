/**
 * '오늘의 시장' 카드의 통화쌍 선택과 재조회를 담당하는 훅.
 *
 * 선택 상태는 이 훅(=홈 화면) 안에만 둔다. 다른 화면이 쓰지 않는 값이라
 * 전역 스토어로 올리지 않는다(AGENTS.md §7.5).
 *
 * 첫 렌더에서는 조회하지 않는다. 홈 요약이 이미 한 통화쌍의 현재 환율과 80%
 * 범위를 실어 주기 때문에, 같은 값을 받으려고 forecast를 한 번 더 부르는 것은
 * 불필요한 왕복이다. 사용자가 통화쌍을 고른 순간부터 조회한다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import { fetchHomeMarketSnapshot, type HomeMarketPairCode } from "../../api/home";
import {
  toForecastMarketSnapshot,
  type HomeMarketLoader,
  type HomeMarketState,
} from "./home-market";

const UNKNOWN_ERROR_MESSAGE =
  "시세를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.";

function toMarketErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : UNKNOWN_ERROR_MESSAGE;
}

export interface UseHomeMarketResult {
  readonly pairCode: HomeMarketPairCode;
  readonly state: HomeMarketState;
  readonly selectPairCode: (pairCode: HomeMarketPairCode) => void;
  readonly reload: () => void;
}

export function useHomeMarket(
  initialPairCode: HomeMarketPairCode,
  loader?: HomeMarketLoader,
): UseHomeMarketResult {
  const [pairCode, setPairCode] = useState(initialPairCode);
  const [requestKey, setRequestKey] = useState(0);
  const [state, setState] = useState<HomeMarketState>({ status: "summary" });

  // 호출자가 loader를 인라인으로 넘겨도 재조회가 반복되지 않도록 최신 값만
  // 참조한다. loader 교체는 재조회 신호가 아니다.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (requestKey === 0) return;

    // 기본 조회 함수는 실제로 요청하는 순간에만 꺼낸다. 통화쌍을 바꾸지 않은
    // 렌더에서는 api 모듈을 건드리지 않는다.
    const load = loaderRef.current ?? fetchHomeMarketSnapshot;

    let isActive = true;
    setState({ status: "loading" });

    void load(pairCode)
      .then((result) => {
        if (!isActive) return;
        setState({ status: "ready", snapshot: toForecastMarketSnapshot(result) });
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setState({ status: "error", message: toMarketErrorMessage(error) });
      });

    return () => {
      isActive = false;
    };
  }, [pairCode, requestKey]);

  const selectPairCode = useCallback((next: HomeMarketPairCode) => {
    setPairCode(next);
    setRequestKey((key) => key + 1);
  }, []);

  const reload = useCallback(() => setRequestKey((key) => key + 1), []);

  return { pairCode, state, selectPairCode, reload };
}
