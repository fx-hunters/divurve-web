import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import type { GoalResponse } from "../../api/generated/divurve-api";
import {
  applyDraftPlan,
  completePlanStep,
  createGoalPlan,
  createPlannerExecutionKey,
  fetchPlannerOverview,
  previewGoalPlan,
  previewPlanScenario,
  skipPlanStep,
  type PlannerApiOverview,
} from "../../api/planner";
import type {
  PlannerPlanResponse,
  PlannerScenarioPreviewRequest,
  PlannerScenarioPreviewResponse,
  PlannerStepCompleteResponse,
  PlannerStepSkipResponse,
} from "../../api/planner-contract";
import { validateExecutedStepInput } from "./planner-api-types";

export type PlannerApiState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "success"; readonly data: PlannerApiOverview };

type PlannerActionResult =
  | PlannerPlanResponse
  | PlannerScenarioPreviewResponse
  | PlannerStepCompleteResponse
  | PlannerStepSkipResponse;

export type PlannerActionState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | {
      readonly status: "success";
      readonly message: string;
      readonly result: PlannerActionResult;
    }
  | { readonly status: "error"; readonly message: string };

export interface PlannerApiDependencies {
  readonly load: typeof fetchPlannerOverview;
  readonly complete: typeof completePlanStep;
  readonly skip: typeof skipPlanStep;
  readonly preview?: typeof previewGoalPlan;
  readonly create?: typeof createGoalPlan;
  readonly previewScenario?: typeof previewPlanScenario;
  readonly apply?: typeof applyDraftPlan;
  readonly createExecutionKey?: () => string;
  readonly getToday?: () => string;
}

const DEFAULT_DEPENDENCIES: PlannerApiDependencies = {
  load: fetchPlannerOverview,
  complete: completePlanStep,
  skip: skipPlanStep,
  preview: previewGoalPlan,
  create: createGoalPlan,
  previewScenario: previewPlanScenario,
  apply: applyDraftPlan,
  createExecutionKey: createPlannerExecutionKey,
  getToday: () => new Date().toISOString().slice(0, 10),
};

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "플래너 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.";
}

function replaceActivePlan(
  state: PlannerApiState,
  goalId: string,
  plan: PlannerPlanResponse,
): PlannerApiState {
  if (state.status !== "success") return state;
  return {
    status: "success",
    data: {
      ...state.data,
      items: state.data.items.map((item) =>
        item.goal.id === goalId ? { ...item, activePlan: plan } : item,
      ),
    },
  };
}

export function usePlannerApi(
  dependencies: PlannerApiDependencies = DEFAULT_DEPENDENCIES,
) {
  const [state, setState] = useState<PlannerApiState>({ status: "loading" });
  const [actionState, setActionState] = useState<PlannerActionState>({
    status: "idle",
  });
  const [planPreview, setPlanPreview] = useState<{
    readonly goalId: string;
    readonly plan: PlannerPlanResponse;
  } | null>(null);
  const [scenarioPreview, setScenarioPreview] =
    useState<PlannerScenarioPreviewResponse | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const isActionPendingRef = useRef(false);
  const executionRef = useRef<{
    readonly signature: string;
    readonly key: string;
  } | null>(null);

  useEffect(() => {
    let isActive = true;
    setState((current) =>
      current.status === "success" ? current : { status: "loading" },
    );
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
    ): Promise<boolean> => {
      if (isActionPendingRef.current) return false;
      const validation = validateExecutedStepInput({
        executedAmount,
        executedRate,
      });
      if (!validation.isValid) {
        setActionState({ status: "error", message: validation.message });
        return false;
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
            (dependencies.getToday ??
              (() => new Date().toISOString().slice(0, 10)))(),
          executionKey: executionRef.current.key,
        });
        setActionState({
          status: "success",
          message: `${result.seq}회차 기록을 서버에 저장했습니다.`,
          result,
        });
        executionRef.current = null;
        setReloadKey((key) => key + 1);
        return true;
      } catch (error) {
        setActionState({ status: "error", message: errorMessage(error) });
        return false;
      } finally {
        isActionPendingRef.current = false;
      }
    },
    [dependencies],
  );

  const skip = useCallback(
    async (planId: string, sequence: number): Promise<boolean> => {
      if (isActionPendingRef.current) return false;
      isActionPendingRef.current = true;
      setActionState({ status: "loading" });
      try {
        const result = await dependencies.skip(planId, sequence);
        setActionState({
          status: "success",
          message: `${sequence}회차 건너뛰기 이후의 계획 미리보기입니다. 아직 계획에는 적용되지 않았습니다.`,
          result,
        });
        return true;
      } catch (error) {
        setActionState({ status: "error", message: errorMessage(error) });
        return false;
      } finally {
        isActionPendingRef.current = false;
      }
    },
    [dependencies],
  );

  const preview = useCallback(
    async (goal: GoalResponse): Promise<boolean> => {
      if (isActionPendingRef.current) return false;
      isActionPendingRef.current = true;
      setActionState({ status: "loading" });
      try {
        const result = await (dependencies.preview ?? previewGoalPlan)(goal);
        setPlanPreview({ goalId: goal.id, plan: result });
        setScenarioPreview(null);
        setActionState({
          status: "success",
          message: "아직 저장되지 않은 계획 미리보기입니다.",
          result,
        });
        return true;
      } catch (error) {
        setActionState({ status: "error", message: errorMessage(error) });
        return false;
      } finally {
        isActionPendingRef.current = false;
      }
    },
    [dependencies],
  );

  const create = useCallback(
    async (goal: GoalResponse): Promise<boolean> => {
      if (isActionPendingRef.current) return false;
      isActionPendingRef.current = true;
      setActionState({ status: "loading" });
      try {
        const result = await (dependencies.create ?? createGoalPlan)(goal);
        setState((current) => replaceActivePlan(current, goal.id, result));
        setPlanPreview(null);
        setActionState({
          status: "success",
          message: "계획을 만들었습니다. 최신 활성 계획을 다시 확인합니다.",
          result,
        });
        setReloadKey((key) => key + 1);
        return true;
      } catch (error) {
        setActionState({ status: "error", message: errorMessage(error) });
        return false;
      } finally {
        isActionPendingRef.current = false;
      }
    },
    [dependencies],
  );

  const previewScenario = useCallback(
    async (
      planId: string,
      input: PlannerScenarioPreviewRequest,
    ): Promise<boolean> => {
      if (isActionPendingRef.current) return false;
      isActionPendingRef.current = true;
      setActionState({ status: "loading" });
      try {
        const result = await (
          dependencies.previewScenario ?? previewPlanScenario
        )(planId, input);
        setScenarioPreview(result);
        setActionState({
          status: "success",
          message:
            "변경 전후를 비교하는 미리보기입니다. 아직 활성 계획은 바뀌지 않았습니다.",
          result,
        });
        return true;
      } catch (error) {
        setActionState({ status: "error", message: errorMessage(error) });
        return false;
      } finally {
        isActionPendingRef.current = false;
      }
    },
    [dependencies],
  );

  const apply = useCallback(
    async (goalId: string, draftPlanId: string): Promise<boolean> => {
      if (isActionPendingRef.current) return false;
      isActionPendingRef.current = true;
      setActionState({ status: "loading" });
      try {
        const result = await (dependencies.apply ?? applyDraftPlan)(draftPlanId);
        setState((current) => replaceActivePlan(current, goalId, result));
        setScenarioPreview(null);
        setActionState({
          status: "success",
          message: "확인한 대체 계획을 적용했습니다.",
          result,
        });
        setReloadKey((key) => key + 1);
        return true;
      } catch (error) {
        setActionState({ status: "error", message: errorMessage(error) });
        return false;
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
  const clearTransient = useCallback(() => {
    setPlanPreview(null);
    setScenarioPreview(null);
    setActionState({ status: "idle" });
  }, []);

  return {
    state,
    actionState,
    planPreview,
    scenarioPreview,
    reload,
    complete,
    skip,
    preview,
    create,
    previewScenario,
    apply,
    clearTransient,
  };
}
