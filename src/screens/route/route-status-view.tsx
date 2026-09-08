import { Card } from "../../components/common/card";
import type { RoutePlanState } from "./use-route-plan";

type NonSuccessRouteState = Exclude<RoutePlanState, { status: "success" }>;

interface RouteStatusViewProps {
  readonly state: NonSuccessRouteState;
  readonly onRetry: () => void;
}

export function RouteStatusView({ state, onRetry }: RouteStatusViewProps) {
  if (state.status === "loading") {
    return (
      <Card title="환전 계획 불러오기">
        <div className="route-status" role="status" aria-live="polite">
          <strong>목표와 계획을 확인하고 있습니다.</strong>
        </div>
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card title="환전 계획을 불러올 수 없습니다">
        <div className="route-status" role="alert">
          <strong>{state.message}</strong>
          <button className="route-button route-button--secondary" type="button" onClick={onRetry}>
            다시 불러오기
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="환전 계획이 없습니다">
      <div className="route-status">
        <strong>표시할 목표 또는 계획 데이터가 없습니다.</strong>
      </div>
    </Card>
  );
}
