import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import {
  fetchXrayBundle,
  previewFitAdjustment,
  runStressScenario,
} from "../../api/xray";
import type {
  FitPreviewRequest,
  FitPreviewResponse,
  StressRunRequest,
  StressRunResponse,
  XrayBundle,
} from "../../api/generated/divurve-api";
import type { XRayTabId } from "../../types/xray";
import { toStressRunResult, toXRayDashboardData } from "./xray-presenter";

export interface XRayDependencies {
  readonly loadBundle: (currencyCode?: string) => Promise<XrayBundle>;
  readonly runScenario: (input: StressRunRequest) => Promise<StressRunResponse>;
  readonly previewAdjustment: (
    input: FitPreviewRequest,
  ) => Promise<FitPreviewResponse>;
}

const DEFAULT_DEPENDENCIES: XRayDependencies = {
  loadBundle: fetchXrayBundle,
  runScenario: runStressScenario,
  previewAdjustment: previewFitAdjustment,
};

export type XRayState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "success"; readonly data: XrayBundle };

const FALLBACK_MESSAGE =
  "내 자산 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.";

export function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useXRay(dependencies: XRayDependencies = DEFAULT_DEPENDENCIES) {
  const [activeTab, setActiveTab] = useState<XRayTabId>("exposure");
  const [state, setState] = useState<XRayState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedScenarioCode, setSelectedScenarioCode] = useState<string>("");
  const [runState, setRunState] = useState<
    | { readonly status: "idle" }
    | { readonly status: "running" }
    | { readonly status: "error"; readonly message: string }
    | { readonly status: "done"; readonly run: StressRunResponse }
  >({ status: "idle" });
  const [previewState, setPreviewState] = useState<
    | { readonly status: "idle" }
    | { readonly status: "running" }
    | { readonly status: "error"; readonly message: string }
    | { readonly status: "done"; readonly preview: FitPreviewResponse }
  >({ status: "idle" });

  // 호출자가 의존성 객체를 인라인으로 만들어 넘겨도 조회가 반복되지 않도록
  // ref로 최신 값만 참조한다. 의존성 교체는 재조회 신호가 아니다.
  const dependenciesRef = useRef(dependencies);
  dependenciesRef.current = dependencies;

  useEffect(() => {
    let isActive = true;
    setState({ status: "loading" });

    void dependenciesRef.current
      .loadBundle()
      .then((bundle) => {
        if (!isActive) return;
        setState(
          bundle.overview.totalAssetKrw === 0
            ? { status: "empty" }
            : { status: "success", data: bundle },
        );
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setState({
          status: "error",
          message: toErrorMessage(error, FALLBACK_MESSAGE),
        });
      });

    return () => {
      isActive = false;
    };
  }, [reloadKey]);

  const data = useMemo(
    () => (state.status === "success" ? toXRayDashboardData(state.data) : null),
    [state],
  );

  const selectScenario = useCallback((code: string) => {
    setSelectedScenarioCode(code);
    setRunState({ status: "running" });
    void dependenciesRef.current
      .runScenario({ scenarioCode: code })
      .then((run) => setRunState({ status: "done", run }))
      .catch((error: unknown) =>
        setRunState({
          status: "error",
          message: toErrorMessage(
            error,
            "시나리오를 계산하지 못했습니다. 잠시 후 다시 확인해 주세요.",
          ),
        }),
      );
  }, []);

  const runResult = useMemo(
    () => (runState.status === "done" ? toStressRunResult(runState.run) : null),
    [runState],
  );

  const previewAdjustment = useCallback(
    (input: FitPreviewRequest) => {
      setPreviewState({ status: "running" });
      void dependenciesRef.current
        .previewAdjustment(input)
        .then((preview) => setPreviewState({ status: "done", preview }))
        .catch((error: unknown) =>
          setPreviewState({
            status: "error",
            message: toErrorMessage(
              error,
              "조정 결과를 계산하지 못했습니다. 잠시 후 다시 확인해 주세요.",
            ),
          }),
        );
    },
    [],
  );

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    activeTab,
    data,
    state,
    selectedScenarioCode,
    runState,
    runResult,
    previewState,
    setActiveTab,
    selectScenario,
    previewAdjustment,
    reload,
  };
}
