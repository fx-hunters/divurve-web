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
  PLANNER_GOAL_SELECT,
  plannerTargetGoalId,
  type PlannerScreenSource,
  type PlannerScreenStage,
  type PlannerScreenTarget,
} from "./planner-route-target";
import type { PlannerJourneyNavigation } from "./use-planner-journey-flow";
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

/** 계정 종류. 데모 계정은 서버 플래너에 들어갈 수 없다. */
export type RouteScreenMode = "demo" | "api";

interface RouteScreenProps {
  readonly mode?: RouteScreenMode;
  readonly onNavigate?: (tab: NavTabId) => void;
  readonly loadPlan?: RoutePlanLoader;
  readonly apiDependencies?: PlannerApiDependencies;
  readonly detailDependencies?: PlannerPlanDetailDependencies;
  /** 주소가 가리키는 갈래. 데모 계정에서는 무시된다. */
  readonly source?: PlannerScreenSource;
  /** 주소가 가리키는 위치. 없으면 목표 선택이다. */
  readonly target?: PlannerScreenTarget;
  readonly onNavigatePlanner?: (
    source: PlannerScreenSource,
    target: PlannerScreenTarget,
  ) => void;
}

export function RouteScreen({
  mode = "demo",
  loadPlan = loadRoutePlan,
  apiDependencies,
  detailDependencies,
  source: routeSource = "api",
  target = PLANNER_GOAL_SELECT,
  onNavigatePlanner = () => undefined,
}: RouteScreenProps) {
  const [isTemporaryDemo, setTemporaryDemo] = useState(
    () => routeSource === "demo" || readPlannerDemoPreference(),
  );
  // URL과 로그인 조회가 바뀌어도 명시적으로 선택한 데모는 종료 전까지 유지한다.
  const source: PlannerScreenSource =
    mode === "demo" || isTemporaryDemo || routeSource === "demo" ? "demo" : "api";
  const effectiveTarget = source === "demo" && routeSource === "api"
    ? PLANNER_GOAL_SELECT : target;
  const goalId = plannerTargetGoalId(effectiveTarget);
  const navigation: PlannerJourneyNavigation = {
    stage: effectiveTarget.kind === "goal" ? effectiveTarget.stage : "goal",
    onOpenGoalSelect: () => onNavigatePlanner(source, PLANNER_GOAL_SELECT),
    onOpenGoalStage: (nextGoalId: string, stage: PlannerScreenStage) =>
      onNavigatePlanner(source, { kind: "goal", goalId: nextGoalId, stage }),
  };

  useEffect(() => {
    if (mode === "api" && routeSource === "demo") {
      writePlannerDemoPreference();
      setTemporaryDemo(true);
    }
  }, [mode, routeSource]);

  const handleExploreDemo = () => {
    writePlannerDemoPreference();
    setTemporaryDemo(true);
    onNavigatePlanner("demo", PLANNER_GOAL_SELECT);
  };
  const handleExitDemo = () => {
    clearPlannerDemoPreference();
    setTemporaryDemo(false);
    onNavigatePlanner("api", PLANNER_GOAL_SELECT);
  };

  if (effectiveTarget.kind === "planDetail") {
    return source === "api" ? (
      <PlannerApiPlanDetailScreen
        goalId={effectiveTarget.goalId}
        planId={effectiveTarget.planId}
        dependencies={detailDependencies}
        onBack={() => navigation.onOpenGoalStage(effectiveTarget.goalId, "main")}
      />
    ) : (
      <RouteDemoScreen
        loadPlan={loadPlan}
        goalId={goalId}
        navigation={navigation}
        detailTarget={effectiveTarget}
      />
    );
  }

  if (source === "api") {
    return (
      <PlannerApiScreen
        goalId={goalId}
        navigation={navigation}
        dependencies={apiDependencies}
        onExploreDemo={handleExploreDemo}
        onOpenPlanDetail={(nextGoalId, planId) =>
          onNavigatePlanner("api", { kind: "planDetail", goalId: nextGoalId, planId })
        }
      />
    );
  }

  return (
    <RouteDemoScreen
      loadPlan={loadPlan}
      goalId={goalId}
      navigation={navigation}
      onExitDemo={mode === "api" ? handleExitDemo : undefined}
      onOpenPlanDetail={(nextGoalId, planId) =>
        onNavigatePlanner("demo", { kind: "planDetail", goalId: nextGoalId, planId })
      }
    />
  );
}

function RouteDemoScreen({
  loadPlan = loadRoutePlan,
  goalId,
  navigation,
  onExitDemo,
  detailTarget,
  onOpenPlanDetail,
}: Pick<RouteScreenProps, "loadPlan"> & {
  readonly goalId: string | null;
  readonly navigation: PlannerJourneyNavigation;
  readonly onExitDemo?: () => void;
  readonly detailTarget?: Extract<
    PlannerScreenTarget,
    { readonly kind: "planDetail" }
  >;
  readonly onOpenPlanDetail?: (goalId: string, planId: string) => void;
}) {
  const { state, reload } = useRoutePlan(loadPlan);

  if (state.status === "success") {
    if (detailTarget !== undefined) {
      return (
        <PlannerDemoPlanDetailScreen
          data={state.data}
          goalId={detailTarget.goalId}
          planId={detailTarget.planId}
          onBack={() => navigation.onOpenGoalStage(detailTarget.goalId, "main")}
        />
      );
    }
    return (
      <PlannerDemoScreen
        data={state.data}
        goalId={goalId}
        navigation={navigation}
        onExitDemo={onExitDemo}
        onOpenPlanDetail={onOpenPlanDetail}
      />
    );
  }

  return <RouteStatusView state={state} onRetry={reload} />;
}
