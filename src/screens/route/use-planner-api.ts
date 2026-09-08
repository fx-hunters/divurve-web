import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import type { GoalResponse } from "../../api/generated/divurve-api";
import {
  applyDraftPlan,
  completePlanStep,
  createPlannerGoal,
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
  PlannerGoalCreateRequest,
  PlannerScenarioPreviewRequest,
  PlannerScenarioPreviewResponse,
  PlannerStepCompleteResponse,
  PlannerStepSkipResponse,
} from "../../api/planner-contract";
import { validateExecutedStepInput } from "./planner-api-types";

export type PlannerApiState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "success"; readonly data: PlannerApiOverview };

type PlannerActionResult =
  | GoalResponse
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
  readonly preview: typeof previewGoalPlan;
  readonly create: typeof createGoalPlan;
  readonly createGoal: typeof createPlannerGoal;
  readonly previewScenario: typeof previewPlanScenario;
  readonly apply: typeof applyDraftPlan;
  readonly createExecutionKey: () => string;
  readonly getToday: () => string;
}

export function getPlannerToday(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_DEPENDENCIES: PlannerApiDependencies = {
  load: fetchPlannerOverview,
  complete: completePlanStep,
  skip: skipPlanStep,
  preview: previewGoalPlan,
  create: createGoalPlan,
  createGoal: createPlannerGoal,
  previewScenario: previewPlanScenario,
  apply: applyDraftPlan,
  createExecutionKey: createPlannerExecutionKey,
  getToday: getPlannerToday,
};

const skipAmountFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 2,
});

function skipPreviewMessage(result: PlannerStepSkipResponse): string {
  const before = skipAmountFormatter.format(result.amountBefore);
  const after = skipAmountFormatter.format(result.amountAfter);
  const budgetNote = result.exceedsBudget
    ? " 재분배된 금액이 입력한 예산을 넘습니다."
    : "";
  return (
    `${result.seq}회차를 건너뛰었을 때의 변경안입니다. 아직 계획에 반영되지 않았습니다. ` +
    `남은 ${result.remainingRounds}회차가 회차당 ${before} → ${after}로 바뀝니다.${budgetNote}`
  );
}

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
  const [planPreview, setPlanPreview] = useState<{
    readonly goalId: string;
    readonly plan: PlannerPlanResponse;
  } | null>(null);
  const [scenarioPreview, setScenarioPreview] =
    useState<PlannerScenarioPreviewResponse | null>(null);
  const [skipPreview, setSkipPreview] =
    useState<PlannerStepSkipResponse | null>(null);
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
        setState({ status: "success", data });
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
          key: dependencies.createExecutionKey(),
        };
      }
      try {
        const result = await dependencies.complete(planId, sequence, {
          ...validation.value,
          executedDate: dependencies.getToday(),
          executionKey: executionRef.current.key,
        });
        const refreshed = await dependencies.load();
        setState({ status: "success", data: refreshed });
        setSkipPreview(null);
        setActionState({
          status: "success",
          message: `${result.seq}회차 기록 후 최신 계획을 확인했습니다.`,
          result,
        });
        executionRef.current = null;
        isActionPendingRef.current = false;
        return true;
      } catch (error) {
        setActionState({ status: "error", message: errorMessage(error) });
        isActionPendingRef.current = false;
        return false;
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
        setSkipPreview(result);
        setScenarioPreview(null);
        setActionState({
          status: "success",
          message: skipPreviewMessage(result),
          result,
        });
        isActionPendingRef.current = false;
        return true;
      } catch (error) {
        setActionState({ status: "error", message: errorMessage(error) });
        isActionPendingRef.current = false;
        return false;
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
        const result = await dependencies.preview(goal);
        setPlanPreview({ goalId: goal.id, plan: result });
        setSkipPreview(null);
        setScenarioPreview(null);
        setActionState({
          status: "success",
          message: "아직 저장되지 않은 계획 미리보기입니다.",
          result,
        });
        isActionPendingRef.current = false;
        return true;
      } catch (error) {
        setActionState({ status: "error", message: errorMessage(error) });
        isActionPendingRef.current = false;
        return false;
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
        await dependencies.create(goal);
        const refreshed = await dependencies.load();
        const refreshedPlan = refreshed.items.find(
          (item) => item.goal.id === goal.id,
        )?.activePlan;
        if (typeof refreshedPlan?.planId !== "string") {
          setActionState({
            status: "error",
            message:
              "계획 생성 후 활성 계획을 확인하지 못했습니다. 다시 확인해 주세요.",
          });
          isActionPendingRef.current = false;
          return false;
        }
        setState({ status: "success", data: refreshed });
        setPlanPreview(null);
        setSkipPreview(null);
        setActionState({
          status: "success",
          message: "계획을 만들고 최신 활성 계획을 확인했습니다.",
          result: refreshedPlan,
        });
        isActionPendingRef.current = false;
        return true;
      } catch (error) {
        setActionState({ status: "error", message: errorMessage(error) });
        isActionPendingRef.current = false;
        return false;
      }
    },
    [dependencies],
  );

  const createGoal = useCallback(
    async (input: PlannerGoalCreateRequest): Promise<GoalResponse | null> => {
      if (isActionPendingRef.current) return null;
      isActionPendingRef.current = true;
      setActionState({ status: "loading" });
      try {
        const result = await dependencies.createGoal(input);
        const refreshed = await dependencies.load();
        setState({ status: "success", data: refreshed });
        setActionState({
          status: "success",
          message: "목표를 만들고 서버에서 다시 확인했습니다.",
          result,
        });
        isActionPendingRef.current = false;
        return result;
      } catch (error) {
        setActionState({ status: "error", message: errorMessage(error) });
        isActionPendingRef.current = false;
        return null;
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
        const result = await dependencies.previewScenario(planId, input);
        setSkipPreview(null);
        setScenarioPreview(result);
        setActionState({
          status: "success",
          message:
            "변경 전후를 비교하는 미리보기입니다. 아직 활성 계획은 바뀌지 않았습니다.",
          result,
        });
        isActionPendingRef.current = false;
        return true;
      } catch (error) {
        setActionState({ status: "error", message: errorMessage(error) });
        isActionPendingRef.current = false;
        return false;
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
        const result = await dependencies.apply(draftPlanId);
        const refreshed = await dependencies.load();
        const refreshedPlan = refreshed.items.find(
          (item) => item.goal.id === goalId,
        )?.activePlan;
        if (typeof refreshedPlan?.planId !== "string") {
          setActionState({
            status: "error",
            message:
              "변경안 적용 후 활성 계획을 확인하지 못했습니다. 다시 확인해 주세요.",
          });
          isActionPendingRef.current = false;
          return false;
        }
        setState({ status: "success", data: refreshed });
        setSkipPreview(null);
        setScenarioPreview(null);
        setActionState({
          status: "success",
          message: "변경안을 적용하고 최신 활성 계획을 확인했습니다.",
          result,
        });
        isActionPendingRef.current = false;
        return true;
      } catch (error) {
        setActionState({ status: "error", message: errorMessage(error) });
        isActionPendingRef.current = false;
        return false;
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
    setSkipPreview(null);
    setScenarioPreview(null);
    setActionState({ status: "idle" });
  }, []);

  return {
    state,
    actionState,
    planPreview,
    skipPreview,
    scenarioPreview,
    reload,
    complete,
    skip,
    preview,
    create,
    createGoal,
    previewScenario,
    apply,
    clearTransient,
  };
}
