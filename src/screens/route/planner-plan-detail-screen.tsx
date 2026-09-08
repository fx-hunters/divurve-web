import { useCallback, useEffect, useState } from "react";
import { ApiStateView } from "../../components/common/api-state-view";
import { DataSourceBadge } from "../../components/common/data-source-badge";
import {
  fetchPlanDetail,
  fetchPlannerOverview,
  fetchPlanVersions,
  type PlanVersion,
  type PlannerApiOverview,
} from "../../api/planner";
import type { PlannerPlanResponse } from "../../api/planner-contract";
import type { RoutePlanData } from "../../types/route";
import { presentPlannerOverview } from "./planner-api-presenter";
import type { PlannerViewModel } from "./planner-api-types";
import { findDemoPlan, presentDemoPlanner } from "./planner-demo-adapter";

interface PlannerPlanDetailPageProps {
  readonly view: PlannerViewModel;
  readonly versions: readonly PlanVersion[];
  readonly onBack: () => void;
}

function versionLabel(version: PlanVersion): string {
  return `v${version.version} · ${version.status}`;
}

export function PlannerPlanDetailPage({
  view,
  versions,
  onBack,
}: PlannerPlanDetailPageProps) {
  const goal = view.selectedGoal;
  const plan = view.plan;
  if (goal === null || plan === null) return null;

  return (
    <section className="planner-detail-page" aria-labelledby="planner-detail-page-title">
      <header className="planner-detail-page__header">
        <div>
          <p className="planner-api-journey__eyebrow">전체 계획 상세</p>
          <h1 id="planner-detail-page-title">{goal.name}</h1>
          <p>회차별 날짜, 준비 금액, 누적 금액과 저장된 계획 이력을 확인합니다.</p>
        </div>
        <DataSourceBadge kind={view.dataSource.kind} />
      </header>

      <button type="button" className="planner-api-journey__secondary" onClick={onBack}>
        플래너로 돌아가기
      </button>

      <dl className="planner-detail-page__summary">
        <div><dt>현재 확보</dt><dd>{goal.heldAmountLabel}</dd></div>
        <div><dt>목표</dt><dd>{goal.targetAmountLabel}</dd></div>
        <div><dt>계획 종료일</dt><dd>{plan.planEndDateLabel}</dd></div>
        <div><dt>상태</dt><dd>{plan.statusLabel}</dd></div>
      </dl>

      <section aria-labelledby="planner-detail-rounds-title">
        <div className="planner-detail-page__section-heading">
          <div>
            <p className="planner-api-journey__eyebrow">회차 계획</p>
            <h2 id="planner-detail-rounds-title">전체 {plan.totalRounds}회</h2>
          </div>
          <p>{goal.heldAmountBasisLabel}</p>
        </div>
        <div className="planner-detail-page__table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">회차</th>
                <th scope="col">날짜</th>
                <th scope="col">준비 금액</th>
                <th scope="col">계획 누적액</th>
                <th scope="col">상태</th>
                <th scope="col">계산 근거</th>
              </tr>
            </thead>
            <tbody>
              {view.steps.map((step) => (
                <tr key={step.sequence}>
                  <th scope="row" data-label="회차">{step.sequenceLabel}</th>
                  <td data-label="날짜">{step.scheduledDate}</td>
                  <td data-label="준비 금액">{step.amountLabel}</td>
                  <td data-label="계획 누적액">{step.cumulativeAmountLabel}</td>
                  <td data-label="상태">{step.statusLabel}</td>
                  <td data-label="계산 근거">{step.calculationBasis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="planner-detail-page__basis" aria-labelledby="planner-detail-basis-title">
        <div>
          <p className="planner-api-journey__eyebrow">데이터 기준</p>
          <h2 id="planner-detail-basis-title">계획 계산 정보</h2>
        </div>
        <dl>
          <div><dt>계산 정책</dt><dd>{plan.policyVersion ?? "제공되지 않음"}</dd></div>
          <div><dt>계산 시각</dt><dd>{plan.calculatedAtLabel ?? "제공되지 않음"}</dd></div>
          <div><dt>환율 기준 시각</dt><dd>{plan.rateAsOfLabel ?? "제공되지 않음"}</dd></div>
          <div><dt>비용 범위</dt><dd>{plan.estimatedCostLabel ?? "제공되지 않음"}</dd></div>
        </dl>
        <p className="planner-api__notice">{plan.disclaimer}</p>
      </section>

      <section className="planner-detail-page__versions" aria-labelledby="planner-detail-versions-title">
        <div>
          <p className="planner-api-journey__eyebrow">계획 변경 이력</p>
          <h2 id="planner-detail-versions-title">저장된 버전</h2>
        </div>
        {versions.length === 0 ? (
          <p>
            {view.dataSource.kind === "demo"
              ? "데모에서는 서버 계획 버전 이력을 제공하지 않습니다."
              : "저장된 계획 버전이 없습니다."}
          </p>
        ) : (
          <ol>
            {versions.map((version) => (
              <li key={version.planId}>
                <strong>{versionLabel(version)}</strong>
                <span>{version.reason ?? "변경 사유 제공되지 않음"}</span>
                <small>{version.createdAt ?? version.planEndDate ?? "날짜 제공되지 않음"}</small>
              </li>
            ))}
          </ol>
        )}
      </section>

      {plan.warnings.length > 0 && (
        <ul className="planner-detail-page__warnings">
          {plan.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}
    </section>
  );
}

export interface PlannerPlanDetailDependencies {
  readonly loadOverview: () => Promise<PlannerApiOverview>;
  readonly loadPlan: (planId: string) => Promise<PlannerPlanResponse>;
  readonly loadVersions: (goalId: string) => Promise<readonly PlanVersion[]>;
}

const DEFAULT_DEPENDENCIES: PlannerPlanDetailDependencies = {
  loadOverview: fetchPlannerOverview,
  loadPlan: fetchPlanDetail,
  loadVersions: fetchPlanVersions,
};

type DetailState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "success";
      readonly view: PlannerViewModel;
      readonly versions: readonly PlanVersion[];
    };

export function PlannerApiPlanDetailScreen({
  goalId,
  planId,
  dependencies = DEFAULT_DEPENDENCIES,
  onBack,
}: {
  readonly goalId: string;
  readonly planId: string;
  readonly dependencies?: PlannerPlanDetailDependencies;
  readonly onBack: () => void;
}) {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<DetailState>({ status: "loading" });

  useEffect(() => {
    let isActive = true;
    setState({ status: "loading" });
    void Promise.all([
      dependencies.loadOverview(),
      dependencies.loadPlan(planId),
      dependencies.loadVersions(goalId),
    ])
      .then(([overview, detail, versions]) => {
        if (!isActive) return;
        const goal = overview.items.find((item) => item.goal.id === goalId)?.goal;
        if (
          goal === undefined ||
          detail.goalId !== goalId ||
          detail.planId !== planId
        ) {
          setState({
            status: "error",
            message: "요청한 목표와 계획 정보를 확인하지 못했습니다.",
          });
          return;
        }
        const detailOverview: PlannerApiOverview = {
          ...overview,
          items: [{ goal, activePlan: detail }],
        };
        setState({
          status: "success",
          view: presentPlannerOverview(detailOverview, goalId),
          versions,
        });
      })
      .catch(() => {
        if (isActive) {
          setState({
            status: "error",
            message: "계획 상세를 불러오지 못했습니다. 다시 시도해 주세요.",
          });
        }
      });
    return () => {
      isActive = false;
    };
  }, [dependencies, goalId, planId, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  if (state.status === "loading") {
    return <ApiStateView status="loading" title="계획 상세를 불러오는 중입니다" message="회차와 버전 이력을 확인하고 있습니다." />;
  }
  if (state.status === "error") {
    return <ApiStateView status="error" title="계획 상세를 열지 못했습니다" message={state.message} onRetry={reload} />;
  }
  return <PlannerPlanDetailPage view={state.view} versions={state.versions} onBack={onBack} />;
}

export function PlannerDemoPlanDetailScreen({
  data,
  goalId,
  planId,
  onBack,
}: {
  readonly data: RoutePlanData;
  readonly goalId: string;
  readonly planId: string;
  readonly onBack: () => void;
}) {
  const plan = findDemoPlan(data, goalId);
  if (plan.id !== goalId || planId !== plan.id) {
    return <ApiStateView status="error" title="데모 계획을 찾지 못했습니다" message="플래너로 돌아가 다른 목표를 선택해 주세요." onRetry={onBack} />;
  }
  return <PlannerPlanDetailPage view={presentDemoPlanner(data, goalId)} versions={[]} onBack={onBack} />;
}
