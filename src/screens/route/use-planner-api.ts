import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import type {
  StepCompleteResponse,
  StepSkipResponse,
} from "../../api/generated/divurve-api";
import {
  completePlanStep,
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
      readonly result: StepCompleteResponse | StepSkipResponse;
    }
  | { readonly status: "error"; readonly message: string };

export interface PlannerApiDependencies {
  readonly load: typeof fetchPlannerOverview;
  readonly complete: typeof completePlanStep;
  readonly skip: typeof skipPlanStep;
}

const DEFAULT_DEPENDENCIES: PlannerApiDependencies = {
  load: fetchPlannerOverview,
  complete: completePlanStep,
  skip: skipPlanStep,
};

const skipAmountFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 2,
});

/**
 * 건너뛰기 응답 문구.
 *
 * 백엔드 `PlanController.skipStep` 는 **미리보기**를 돌려준다 — 응답 `applied`
 * 는 항상 `false` 이고 활성 계획은 그대로다(명세 §15·§21-9). 예전 문구는
 * "서버에 저장했습니다"였고, 재조회해도 아무것도 달라지지 않아 사용자가
 * 반영됐다고 오해할 수 있었다(점검 리포트 H7).
 */
function skipPreviewMessage(result: StepSkipResponse): string {
  const before = skipAmountFormatter.format(result.amountBefore);
  const after = skipAmountFormatter.format(result.amountAfter);
  const budgetNote = result.exceedsBudget
    ? " 재분배된 금액이 입력한 예산을 넘습니다."
    : "";
  return (
    `${result.seq}회차를 건너뛰었을 때의 변경안입니다. 아직 계획에 반영되지 않았습니다. ` +
    `남은 ${result.remainingRounds}회차가 회차당 ${before} → ${after} 로 바뀝니다.${budgetNote}`
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
  const [reloadKey, setReloadKey] = useState(0);
  const isActionPendingRef = useRef(false);

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
      try {
        const result = await dependencies.complete(planId, sequence, {
          ...validation.value,
        });
        setActionState({
          status: "success",
          message: `${result.seq}회차 기록을 서버에 저장했습니다.`,
          result,
        });
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
        // 저장된 것이 없으므로 재조회하지 않는다. 다시 불러와 봐야 같은 계획이다.
        setActionState({
          status: "success",
          message: skipPreviewMessage(result),
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
