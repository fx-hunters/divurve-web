/**
 * 관리자 콘솔의 요청 상태 훅.
 *
 * 낙관적 업데이트·캐시·폴링을 두지 않는다. 호출한 그 순간에만 서버를 부르고
 * 결과를 그대로 들고 있는다(AGENTS.md 7.3·7.5).
 */
import { useCallback, useRef, useState } from "react";
import type { ApiResult } from "../../api/client";
import {
  toAdminAuthFailure,
  toAdminErrorInfo,
  type AdminAuthFailure,
  type AdminErrorInfo,
} from "./admin-errors";

export type AdminRequestState<T> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly error: AdminErrorInfo }
  | { readonly status: "success"; readonly result: ApiResult<T> };

export interface UseAdminRequest<Args extends readonly unknown[], T> {
  readonly state: AdminRequestState<T>;
  readonly send: (...args: Args) => Promise<void>;
  readonly reset: () => void;
}

/**
 * @param run 실제 호출. 성공하면 `{ data, meta }`를 그대로 담는다.
 * @param onAuthFailure 401·403을 만났을 때 세션을 정리하도록 위로 알린다.
 */
export function useAdminRequest<Args extends readonly unknown[], T>(
  run: (...args: Args) => Promise<ApiResult<T>>,
  onAuthFailure: (failure: AdminAuthFailure) => void,
): UseAdminRequest<Args, T> {
  const [state, setState] = useState<AdminRequestState<T>>({ status: "idle" });
  // 연달아 누른 요청 중 마지막 것만 화면에 반영한다.
  const requestIdRef = useRef(0);

  const send = useCallback(
    async (...args: Args) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setState({ status: "loading" });
      try {
        const result = await run(...args);
        if (requestIdRef.current !== requestId) return;
        setState({ status: "success", result });
      } catch (error) {
        if (requestIdRef.current !== requestId) return;
        const failure = toAdminAuthFailure(error);
        if (failure !== null) {
          onAuthFailure(failure);
          return;
        }
        setState({ status: "error", error: toAdminErrorInfo(error) });
      }
    },
    [run, onAuthFailure],
  );

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setState({ status: "idle" });
  }, []);

  return { state, send, reset };
}
