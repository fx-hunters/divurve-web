/**
 * 플래너 배경 컨텍스트를 따로 읽는 훅.
 *
 * 목표·계획 조회와 요청을 분리한 이유는 실패의 무게가 다르기 때문이다. 컨텍스트를
 * 못 받아도 계획은 그대로 쓸 수 있어야 하므로, 실패하면 화면을 막지 않고 항목만
 * 빠진다. 반대로 목표 조회가 실패하면 플래너 자체가 뜨지 않는다.
 *
 * `load`는 렌더마다 같은 참조여야 한다(`usePlannerApi`의 dependencies와 같은 규칙).
 * 인라인 함수를 넘기면 효과가 매 렌더 다시 돌아 요청이 끝없이 반복된다.
 */
import { useEffect, useState } from "react";
import {
  fetchRouteContext,
  type RouteContextData,
} from "../../api/route-context";

export type PlannerContextState =
  | { readonly status: "loading" }
  | { readonly status: "unavailable" }
  | { readonly status: "success"; readonly data: RouteContextData };

export type PlannerContextLoader = typeof fetchRouteContext;

export function usePlannerContext(
  load: PlannerContextLoader = fetchRouteContext,
): PlannerContextState {
  const [state, setState] = useState<PlannerContextState>({
    status: "loading",
  });

  useEffect(() => {
    let isActive = true;
    setState({ status: "loading" });
    void load()
      .then((data) => {
        if (isActive) setState({ status: "success", data });
      })
      .catch(() => {
        // 배경 정보라 재시도 버튼을 두지 않는다. 없으면 없는 대로 계획을 보여준다.
        if (isActive) setState({ status: "unavailable" });
      });
    return () => {
      isActive = false;
    };
  }, [load]);

  return state;
}
