/**
 * 목표의 계획 버전 이력과, 선택한 버전의 상세를 담는 훅.
 *
 * 목록(`GET /api/v1/goals/{id}/plans`)과 상세(`GET /api/v1/plans/{id}`)는
 * 서로 다른 요청이라 상태도 따로 둔다. 값과 핸들러만 돌려주고 JSX는 만들지
 * 않는다(AGENTS.md §7.3).
 */
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import type { PlannerPlanResponse } from "../../api/planner-contract";
import {
  fetchPlanDetail,
  fetchPlanVersions,
  type PlanVersion,
} from "../../api/planner";

export type PlanVersionsState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "success"; readonly versions: readonly PlanVersion[] };

export type PlanVersionDetailState =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly planId: string }
  | {
      readonly status: "error";
      readonly planId: string;
      readonly message: string;
    }
  | {
      readonly status: "success";
      readonly planId: string;
      readonly plan: PlannerPlanResponse;
    };

export interface PlanVersionDependencies {
  readonly loadVersions: typeof fetchPlanVersions;
  readonly loadDetail: typeof fetchPlanDetail;
}

const DEFAULT_DEPENDENCIES: PlanVersionDependencies = {
  loadVersions: fetchPlanVersions,
  loadDetail: fetchPlanDetail,
};

const LIST_FALLBACK_MESSAGE =
  "계획 이력을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.";
const DETAIL_FALLBACK_MESSAGE =
  "계획 상세를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export interface UsePlanVersionsResult {
  readonly state: PlanVersionsState;
  readonly detailState: PlanVersionDetailState;
  readonly reload: () => void;
  readonly selectVersion: (planId: string) => void;
  readonly clearSelection: () => void;
}

export function usePlanVersions(
  goalId: string,
  dependencies: PlanVersionDependencies = DEFAULT_DEPENDENCIES,
): UsePlanVersionsResult {
  const [state, setState] = useState<PlanVersionsState>({ status: "loading" });
  const [detailState, setDetailState] = useState<PlanVersionDetailState>({
    status: "idle",
  });
  const [listKey, setListKey] = useState(0);
  const [selection, setSelection] = useState<{
    readonly planId: string;
    readonly key: number;
  } | null>(null);

  useEffect(() => {
    let isActive = true;
    setState({ status: "loading" });
    void dependencies
      .loadVersions(goalId)
      .then((versions) => {
        if (!isActive) return;
        setState(
          versions.length === 0
            ? { status: "empty" }
            : { status: "success", versions },
        );
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setState({
          status: "error",
          message: errorMessage(error, LIST_FALLBACK_MESSAGE),
        });
      });
    return () => {
      isActive = false;
    };
  }, [dependencies, goalId, listKey]);

  useEffect(() => {
    if (selection === null) {
      setDetailState({ status: "idle" });
      return;
    }
    const { planId } = selection;
    let isActive = true;
    setDetailState({ status: "loading", planId });
    void dependencies
      .loadDetail(planId)
      .then((plan) => {
        if (isActive) setDetailState({ status: "success", planId, plan });
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setDetailState({
          status: "error",
          planId,
          message: errorMessage(error, DETAIL_FALLBACK_MESSAGE),
        });
      });
    return () => {
      isActive = false;
    };
  }, [dependencies, selection]);

  const reload = useCallback(() => setListKey((key) => key + 1), []);

  const selectVersion = useCallback((planId: string) => {
    setSelection((current) =>
      current !== null && current.planId === planId
        ? { planId, key: current.key + 1 }
        : { planId, key: 0 },
    );
  }, []);

  const clearSelection = useCallback(() => setSelection(null), []);

  return { state, detailState, reload, selectVersion, clearSelection };
}
