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

/** 데모 fixture 화면과 Swagger API 화면 중 무엇을 렌더할지 정한다. */
export type RouteScreenMode = "demo" | "api";

interface RouteScreenProps {
  readonly mode?: RouteScreenMode;
  readonly onNavigate?: (tab: NavTabId) => void;
  readonly loadPlan?: RoutePlanLoader;
  readonly apiDependencies?: PlannerApiDependencies;
}

export function RouteScreen({
  mode = "demo",
  loadPlan = loadRoutePlan,
  apiDependencies,
}: RouteScreenProps) {
  if (mode === "api") {
    return <PlannerApiScreen dependencies={apiDependencies} />;
  }

  return <RouteDemoScreen loadPlan={loadPlan} />;
}

function RouteDemoScreen({
  loadPlan = loadRoutePlan,
}: Pick<RouteScreenProps, "loadPlan">) {
  const { state, reload } = useRoutePlan(loadPlan);

  if (state.status === "success") {
    return <PlannerDemoScreen data={state.data} />;
  }

  return <RouteStatusView state={state} onRetry={reload} />;
}
