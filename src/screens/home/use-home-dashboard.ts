import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type ApiResult } from "../../api/client";
import type { HomeSummaryResponse } from "../../api/generated/divurve-api";
import { fetchHomeSummary } from "../../api/home";

export type HomeSummaryLoader = () => Promise<ApiResult<HomeSummaryResponse>>;

export type HomeDashboardState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "ready"; readonly result: ApiResult<HomeSummaryResponse> };

/**
 * 모든 블록이 비어 있을 때만 빈 화면으로 본다. 서버는 데이터가 없는 블록도
 * 생략하지 않으므로 하위 객체의 존재 여부가 아니라 state로 판단해야 한다.
 */
export function hasHomeContent(data: HomeSummaryResponse): boolean {
  return data.blocks.some((block) => block.state !== "empty");
}

function toHomeErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "홈 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.";
}

export function useHomeDashboard(
  loader: HomeSummaryLoader = fetchHomeSummary,
) {
  const [state, setState] = useState<HomeDashboardState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  // 호출자가 loader를 인라인으로 만들어 넘겨도 조회가 반복되지 않도록
  // ref로 최신 값만 참조한다. loader 교체는 재조회 신호가 아니다.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let isActive = true;
    setState({ status: "loading" });

    void loaderRef
      .current()
      .then((result) => {
        if (!isActive) return;
        setState(
          hasHomeContent(result.data)
            ? { status: "ready", result }
            : { status: "empty" },
        );
      })
      .catch((error: unknown) => {
        if (isActive) {
          setState({ status: "error", message: toHomeErrorMessage(error) });
        }
      });

    return () => {
      isActive = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { state, reload };
}
