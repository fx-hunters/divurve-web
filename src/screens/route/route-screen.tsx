import { useEffect, useState } from "react";
import {
  loadRoutePlan,
  type RoutePlanLoader,
} from "../../api/route";
import type { NavTabId } from "../../types/navigation";
import { RouteStatusView } from "./route-status-view";
import { useRoutePlan } from "./use-route-plan";
import "./route-screen.css";
import { PlannerApiScreen } from "./planner-api-screen";
import { PlannerDemoScreen } from "./planner-demo-screen";
import type { PlannerApiDependencies } from "./use-planner-api";
import {
  PlannerApiPlanDetailScreen,
  PlannerDemoPlanDetailScreen,
  type PlannerPlanDetailDependencies,
} from "./planner-plan-detail-screen";
import {
  clearPlannerDemoPreference,
  readPlannerDemoPreference,
  writePlannerDemoPreference,
} from "./planner-mode-preference";

/** 데모 fixture 화면과 Swagger API 화면 중 무엇을 렌더할지 정한다. */
export type RouteScreenMode = "demo" | "api";

interface RouteScreenProps {
  readonly mode?: RouteScreenMode;
  readonly onNavigate?: (tab: NavTabId) => void;
  readonly loadPlan?: RoutePlanLoader;
  readonly apiDependencies?: PlannerApiDependencies;
  readonly detailDependencies?: PlannerPlanDetailDependencies;
  readonly detailRoute?: {
    readonly source: RouteScreenMode;
    readonly goalId: string;
    readonly planId: string;
  };
  readonly onOpenPlanDetail?: (
    source: RouteScreenMode,
    goalId: string,
    planId: string,
  ) => void;
  readonly onBackFromDetail?: () => void;
}

export function RouteScreen({
  mode = "demo",
  loadPlan = loadRoutePlan,
  apiDependencies,
  detailDependencies,
  detailRoute,
  onOpenPlanDetail = () => undefined,
  onBackFromDetail = () => undefined,
}: RouteScreenProps) {
  const isDemoDetailRoute = detailRoute?.source === "demo";
  const [isTemporaryDemo, setTemporaryDemo] = useState(
    () => isDemoDetailRoute || readPlannerDemoPreference(),
  );
  const isDemoVisible =
    mode === "demo" || isTemporaryDemo || isDemoDetailRoute;

  useEffect(() => {
    if (mode === "api" && isDemoDetailRoute) {
      writePlannerDemoPreference();
      setTemporaryDemo(true);
    }
  }, [isDemoDetailRoute, mode]);

  const handleExploreDemo = () => {
    writePlannerDemoPreference();
    setTemporaryDemo(true);
  };

  const handleExitDemo = () => {
    clearPlannerDemoPreference();
    setTemporaryDemo(false);
  };

  if (!isDemoVisible && detailRoute?.source === "api") {
    return (
      <PlannerApiPlanDetailScreen
        goalId={detailRoute.goalId}
        planId={detailRoute.planId}
        dependencies={detailDependencies}
        onBack={onBackFromDetail}
      />
    );
  }

  if (isDemoVisible && isDemoDetailRoute) {
    return (
      <RouteDemoScreen
        loadPlan={loadPlan}
        detailRoute={detailRoute}
        onBackFromDetail={onBackFromDetail}
      />
    );
  }

  if (!isDemoVisible) {
    return (
      <PlannerApiScreen
        dependencies={apiDependencies}
        onExploreDemo={handleExploreDemo}
        onOpenPlanDetail={(goalId, planId) =>
          onOpenPlanDetail("api", goalId, planId)
        }
      />
    );
  }

  return (
    <RouteDemoScreen
      loadPlan={loadPlan}
      onExitDemo={mode === "api" ? handleExitDemo : undefined}
      onBackFromDetail={onBackFromDetail}
      onOpenPlanDetail={(goalId, planId) =>
        onOpenPlanDetail("demo", goalId, planId)
      }
    />
  );
}

function RouteDemoScreen({
  loadPlan = loadRoutePlan,
  onExitDemo,
  detailRoute,
  onOpenPlanDetail,
  onBackFromDetail,
}: Pick<RouteScreenProps, "loadPlan"> & {
  readonly onExitDemo?: () => void;
  readonly detailRoute?: RouteScreenProps["detailRoute"];
  readonly onOpenPlanDetail?: (goalId: string, planId: string) => void;
  readonly onBackFromDetail: () => void;
}) {
  const { state, reload } = useRoutePlan(loadPlan);

  if (state.status === "success") {
    if (detailRoute !== undefined) {
      return (
        <PlannerDemoPlanDetailScreen
          data={state.data}
          goalId={detailRoute.goalId}
          planId={detailRoute.planId}
          onBack={onBackFromDetail}
        />
      );
    }
    return (
      <PlannerDemoScreen
        data={state.data}
        onExitDemo={onExitDemo}
        onOpenPlanDetail={onOpenPlanDetail}
      />
    );
  }

  return <RouteStatusView state={state} onRetry={reload} />;
}
