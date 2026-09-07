import { useRef, useState } from "react";
import { ApiStateView } from "../../components/common/api-state-view";
import { Badge } from "../../components/common/badge";
import { presentPlannerOverview } from "./planner-api-presenter";
import { PlannerJourneyAction } from "./planner-journey-action";
import { PlannerJourneyCurve } from "./planner-journey-curve";
import { PlannerJourneyDetail } from "./planner-journey-detail";
import { PlannerJourneyGoalSelect } from "./planner-journey-goal-select";
import { PlannerJourneyStatus } from "./planner-journey-status";
import { usePlannerApi, type PlannerApiDependencies } from "./use-planner-api";
import "./planner-api-screen.css";

type JourneyStage = "goal" | "status" | "curve" | "action" | "noPlan";
interface PlannerApiScreenProps { readonly dependencies?: PlannerApiDependencies; }

export function PlannerApiScreen({ dependencies }: PlannerApiScreenProps) {
  const { state, actionState, reload, complete, skip } = usePlannerApi(dependencies);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [stage, setStage] = useState<JourneyStage>("goal");
  const [selectedSequence, setSelectedSequence] = useState<number | null>(null);
  const [isDetailOpen, setDetailOpen] = useState(false);
  const detailTrigger = useRef<HTMLButtonElement>(null);
  if (state.status === "loading") return <ApiStateView status="loading" title="플래너를 불러오는 중입니다" message="목표와 활성 계획을 서버에서 확인하고 있습니다." />;
  if (state.status === "error") return <ApiStateView status="error" title="플래너를 불러오지 못했습니다" message={state.message} onRetry={reload} />;
  if (state.status === "empty") return <ApiStateView status="empty" title="등록된 외화 목표가 없습니다" message="외화 목표를 등록한 뒤 이곳에서 계획을 확인할 수 있습니다." />;

  const view = presentPlannerOverview(state.data, selectedGoalId);
  const goal = view.selectedGoal!;
  const action = view.nextAction;
  const selectGoal = (goalId: string) => { setSelectedGoalId(goalId); setStage("status"); setSelectedSequence(null); };
  const showCurve = () => { if (view.plan === null) { setStage("noPlan"); return; } setSelectedSequence(view.nextAction?.sequence ?? null); setStage("curve"); };
  return <section className="planner-api" aria-label="API 플래너">
    <header className="planner-api__header"><div><h1>내 외화 플래너</h1><p>{view.dataSource.label}의 목표와 계획을 표시합니다.</p></div><Badge variant="primary">서버 연결</Badge></header>
    <div className="planner-api-journey">
      {stage === "goal" && <PlannerJourneyGoalSelect goals={view.goalItems} selectedGoalId={goal.id} onSelect={selectGoal} onContinue={() => setStage("status")} />}
      {stage === "status" && <PlannerJourneyStatus goal={goal} onBack={() => setStage("goal")} onContinue={showCurve} />}
      {stage === "curve" && view.curve !== null && <PlannerJourneyCurve curve={view.curve} steps={view.steps} selectedSequence={selectedSequence} onSelect={setSelectedSequence} onBack={() => setStage("status")} onContinue={() => setStage("action")} />}
      {stage === "action" && action !== null && <PlannerJourneyAction step={view.steps.find((step) => step.sequence === action.sequence)!} detailButtonRef={detailTrigger} isPending={actionState.status === "loading"} onComplete={(amount, rate) => void complete(action.planId, action.sequence, amount, rate)} onSkip={() => void skip(action.planId, action.sequence)} onBack={() => setStage("curve")} onDetail={() => setDetailOpen(true)} />}
      {stage === "noPlan" && <div className="planner-api-journey__scene"><p className="planner-api-journey__eyebrow">활성 계획</p><h2>이 목표에는 활성 계획이 없습니다</h2><p className="planner-api__no-plan">현재 서버에 저장된 활성 계획이 없어 Curve와 다음 행동을 표시할 수 없습니다.</p><div className="planner-api-journey__buttons"><button type="button" className="planner-api-journey__secondary" onClick={() => setStage("status")}>현재 상태</button><button type="button" className="planner-api-journey__secondary" onClick={() => setStage("goal")}>다른 목표 보기</button></div></div>}
      {view.plan !== null && action === null && stage === "action" && <div className="planner-api-journey__scene"><p className="planner-api-journey__eyebrow">다음 행동</p><h2>남은 회차가 없습니다</h2><button ref={detailTrigger} type="button" className="planner-api-journey__secondary" onClick={() => setDetailOpen(true)}>전체 계획 상세 보기</button></div>}
      {actionState.status !== "idle" && <div className="planner-api__notice" role={actionState.status === "error" ? "alert" : "status"}>{actionState.status === "loading" ? "서버에 반영 중…" : actionState.message}{actionState.status === "error" && <button type="button" onClick={reload}>현재 상태 다시 확인</button>}</div>}
    </div>
    {isDetailOpen && view.plan !== null && <PlannerJourneyDetail plan={view.plan} steps={view.steps} returnFocus={detailTrigger.current} onClose={() => setDetailOpen(false)} />}
  </section>;
}
