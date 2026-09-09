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
  // 데모 계정에는 서버 플래너가 없다. 주소가 무엇을 가리키든 데모로 읽는다.
  const source: PlannerScreenSource = mode === "demo" ? "demo" : routeSource;
  const goalId = plannerTargetGoalId(target);
  const navigation: PlannerJourneyNavigation = {
    stage: target.kind === "goal" ? target.stage : "goal",
    onOpenGoalSelect: () => onNavigatePlanner(source, PLANNER_GOAL_SELECT),
    onOpenGoalStage: (nextGoalId: string, stage: PlannerScreenStage) =>
      onNavigatePlanner(source, { kind: "goal", goalId: nextGoalId, stage }),
  };
  if (target.kind === "planDetail") {
    return source === "api" ? (
      <PlannerApiPlanDetailScreen
        goalId={target.goalId}
        planId={target.planId}
        dependencies={detailDependencies}
        onBack={() => navigation.onOpenGoalStage(target.goalId, "main")}
      />
    ) : (
      <RouteDemoScreen
        loadPlan={loadPlan}
        goalId={goalId}
        navigation={navigation}
        detailTarget={target}
      />
    );
  }

  if (source === "api") {
    return (
      <PlannerApiScreen
        goalId={goalId}
        navigation={navigation}
        dependencies={apiDependencies}
        onExploreDemo={() => onNavigatePlanner("demo", PLANNER_GOAL_SELECT)}
        onOpenPlanDetail={(nextGoalId, planId) =>
          onNavigatePlanner("api", {
            kind: "planDetail",
            goalId: nextGoalId,
            planId,
          })
        }
      />
    );
  }

  return (
    <RouteDemoScreen
      loadPlan={loadPlan}
      goalId={goalId}
      navigation={navigation}
      onExitDemo={
        mode === "api"
          ? () => onNavigatePlanner("api", PLANNER_GOAL_SELECT)
          : undefined
      }
      onOpenPlanDetail={(nextGoalId, planId) =>
        onNavigatePlanner("demo", {
          kind: "planDetail",
          goalId: nextGoalId,
          planId,
        })
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
