import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import type {
  PlannerStepCompleteResponse,
  PlannerStepSkipResponse,
} from "../../api/planner-contract";
import {
  completePlanStep,
  createPlannerExecutionKey,
  fetchPlannerOverview,
  skipPlanStep,
  type PlannerApiOverview,
} from "../../api/planner";
import { validateExecutedStepInput } from "./planner-api-types";

export type PlannerApiState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "success"; readonly data: PlannerApiOverview };

export type PlannerActionState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | {
      readonly status: "success";
      readonly message: string;
      readonly result: PlannerStepCompleteResponse | PlannerStepSkipResponse;
    }
  | { readonly status: "error"; readonly message: string };

export interface PlannerApiDependencies {
  readonly load: typeof fetchPlannerOverview;
  readonly complete: typeof completePlanStep;
  readonly skip: typeof skipPlanStep;
  readonly createExecutionKey?: () => string;
  readonly getToday?: () => string;
}

const DEFAULT_DEPENDENCIES: PlannerApiDependencies = {
  load: fetchPlannerOverview,
  complete: completePlanStep,
  skip: skipPlanStep,
  createExecutionKey: createPlannerExecutionKey,
  getToday: () => new Date().toISOString().slice(0, 10),
};

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "플래너 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.";
}

export function usePlannerApi(
  dependencies: PlannerApiDependencies = DEFAULT_DEPENDENCIES,
) {
  const [state, setState] = useState<PlannerApiState>({ status: "loading" });
  const [actionState, setActionState] = useState<PlannerActionState>({
    status: "idle",
  });
  const [reloadKey, setReloadKey] = useState(0);
  const isActionPendingRef = useRef(false);
  const executionRef = useRef<{
    readonly signature: string;
    readonly key: string;
  } | null>(null);

  useEffect(() => {
    let isActive = true;
    setState({ status: "loading" });
    void dependencies
      .load()
      .then((data) => {
        if (!isActive) return;
        setState(
          data.items.length === 0
            ? { status: "empty" }
            : { status: "success", data },
        );
      })
      .catch((error: unknown) => {
        if (isActive) setState({ status: "error", message: errorMessage(error) });
      });
    return () => {
      isActive = false;
    };
  }, [dependencies, reloadKey]);

  const complete = useCallback(
    async (
      planId: string,
      sequence: number,
      executedAmount: number,
      executedRate: number,
    ) => {
      if (isActionPendingRef.current) return;
      const validation = validateExecutedStepInput({
        executedAmount,
        executedRate,
      });
      if (!validation.isValid) {
        setActionState({ status: "error", message: validation.message });
        return;
      }
      isActionPendingRef.current = true;
      setActionState({ status: "loading" });
      const signature = `${planId}:${sequence}:${executedAmount}:${executedRate}`;
      if (executionRef.current?.signature !== signature) {
        executionRef.current = {
          signature,
          key: (dependencies.createExecutionKey ?? createPlannerExecutionKey)(),
        };
      }
      try {
        const result = await dependencies.complete(planId, sequence, {
          ...validation.value,
          executedDate:
            (dependencies.getToday ?? (() => new Date().toISOString().slice(0, 10)))(),
          executionKey: executionRef.current.key,
        });
        setActionState({
          status: "success",
          message: `${result.seq}회차 기록을 서버에 저장했습니다.`,
          result,
        });
        executionRef.current = null;
        setReloadKey((key) => key + 1);
      } catch (error) {
        setActionState({ status: "error", message: errorMessage(error) });
      } finally {
        isActionPendingRef.current = false;
      }
    },
    [dependencies],
  );

  const skip = useCallback(
    async (planId: string, sequence: number) => {
      if (isActionPendingRef.current) return;
      isActionPendingRef.current = true;
      setActionState({ status: "loading" });
      try {
        const result = await dependencies.skip(planId, sequence);
        setActionState({
          status: "success",
          message: `${sequence}회차 건너뛰기 이후의 계획 미리보기입니다. 아직 계획에는 적용되지 않았습니다.`,
          result,
        });
      } catch (error) {
        setActionState({ status: "error", message: errorMessage(error) });
      } finally {
        isActionPendingRef.current = false;
      }
    },
    [dependencies],
  );

  const reload = useCallback(() => {
    setActionState({ status: "idle" });
    setReloadKey((key) => key + 1);
  }, []);

  return {
    state,
    actionState,
    reload,
    complete,
    skip,
  };
}
