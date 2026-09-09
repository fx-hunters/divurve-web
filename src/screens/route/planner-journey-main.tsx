import type { RefObject } from "react";
import { ProgressBar } from "../../components/common/progress-bar";
import type { PlannerViewModel } from "./planner-api-types";
import { PlannerJourneyAction } from "./planner-journey-action";
import { PlannerCurveCanvas } from "./planner-journey-curve";
import { PlannerJourneyNoAction } from "./planner-journey-outcome";

interface PlannerJourneyMainProps {
  readonly view: PlannerViewModel;
  readonly selectedSequence: number | null;
  readonly isPending: boolean;
  readonly detailButtonRef: RefObject<HTMLButtonElement>;
  readonly scenarioButtonRef: RefObject<HTMLButtonElement>;
  readonly isPlanChanged: boolean;
  readonly onSelectSequence: (sequence: number) => void;
  readonly onPreviewPlan: () => void;
  readonly onComplete: (amount: number, rate: number) => void;
  readonly onRecordDemo: () => void;
  readonly onSkip: () => void;
  readonly onExploreScenario: () => void;
  readonly onOpenDetail: () => void;
  readonly onOpenHistory?: () => void;
  readonly onBackToGoals: () => void;
  readonly onPlanChangeAnimationEnd: () => void;
}

function JourneyProgress() {
  return (
    <ol className="planner-main__progress" aria-label="플래너 진행">
      <li data-state="complete">목표 선택</li>
      <li data-state="current" aria-current="step">계획 확인</li>
      <li>상황 비교</li>
    </ol>
  );
}

export function PlannerJourneyMain({
  view,
  selectedSequence,
  isPending,
  detailButtonRef,
  scenarioButtonRef,
  isPlanChanged,
  onSelectSequence,
  onPreviewPlan,
  onComplete,
  onRecordDemo,
  onSkip,
  onExploreScenario,
  onOpenDetail,
  onOpenHistory,
  onBackToGoals,
  onPlanChangeAnimationEnd,
}: PlannerJourneyMainProps) {
  const goal = view.selectedGoal;
  if (goal === null) return null;

  const selectedStep =
    view.steps.find((step) => step.sequence === selectedSequence) ??
    view.steps.find((step) => step.status === "next") ??
    view.steps[0];

  return (
    <section
      className="planner-main"
      aria-labelledby="planner-main-title"
      data-plan-changed={isPlanChanged || undefined}
      onAnimationEnd={onPlanChangeAnimationEnd}
    >
      <JourneyProgress />
      <header className="planner-main__summary">
        <div>
          <p className="planner-api-journey__eyebrow">현재 목표</p>
          <h2 id="planner-main-title">{goal.name}</h2>
          <p>{goal.heldAmountBasisLabel}</p>
        </div>
        <dl>
          <div><dt>현재 확보</dt><dd>{goal.heldAmountLabel}</dd></div>
          <div><dt>목표</dt><dd>{goal.targetAmountLabel}</dd></div>
          <div><dt>남은 금액</dt><dd>{goal.remainingAmountLabel}</dd></div>
          <div><dt>목표일</dt><dd>{goal.targetDateLabel}</dd></div>
        </dl>
        {goal.heldAmount === null
          ? <p>{goal.progressLabel}</p>
          : <ProgressBar ratio={goal.progressPercent / 100} label={goal.progressLabel} />}
      </header>

      {view.curve === null || view.plan === null ? (
        <div className="planner-main__empty-plan">
          <h3>아직 확인할 계획 Curve가 없습니다</h3>
          <p>{view.planAvailabilityMessage}</p>
          <div className="planner-api-journey__buttons">
            {view.supportedActions.canPreviewPlan && (
              <button
                type="button"
                className="planner-api-journey__primary"
                disabled={isPending}
                onClick={onPreviewPlan}
              >
                {isPending ? "계획을 확인하는 중…" : "계획 미리보기"}
              </button>
            )}
            {onOpenHistory !== undefined && (
              <button type="button" className="planner-api-journey__secondary" onClick={onOpenHistory}>
                계획 이력 보기
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="planner-main__workspace">
          <section className="planner-main__curve" aria-labelledby="planner-main-curve-title">
            <div className="planner-main__section-heading">
              <div>
                <p className="planner-api-journey__eyebrow">계획 Curve</p>
                <h3 id="planner-main-curve-title">날짜와 누적 확보액으로 보는 계획</h3>
              </div>
              <div className="planner-main__legend" aria-label="계획 Curve 범례">
                <span data-line="actual">확인된 값</span>
                <span data-line="planned">미래 계획값</span>
              </div>
            </div>
            <div className="planner-api-curve" role="region" aria-label="계획 Curve">
              <PlannerCurveCanvas
                curve={view.curve}
                selectedSequence={selectedStep?.sequence ?? null}
                onSelect={onSelectSequence}
              />
            </div>
            {view.curve.dataNotice !== null && (
              <p className="planner-api__notice">{view.curve.dataNotice}</p>
            )}
          </section>

          <aside className="planner-main__side" aria-label="선택 지점과 다음 행동">
            {selectedStep !== undefined && (
              <section className="planner-point-detail" aria-labelledby="planner-point-title">
                <p className="planner-api-journey__eyebrow">선택 지점</p>
                <h3 id="planner-point-title">{selectedStep.actionLabel}</h3>
                <dl>
                  <div><dt>날짜</dt><dd>{selectedStep.scheduledDate}</dd></div>
                  <div><dt>이 회차</dt><dd>{selectedStep.amountLabel}</dd></div>
                  <div><dt>계획 누적액</dt><dd>{selectedStep.cumulativeAmountLabel}</dd></div>
                  <div><dt>상태</dt><dd>{selectedStep.statusLabel}</dd></div>
                </dl>
                <p>{selectedStep.calculationBasis}</p>
              </section>
            )}

            {view.nextAction === null ? (
              <PlannerJourneyNoAction
                detailButtonRef={detailButtonRef}
                onDetail={onOpenDetail}
              />
            ) : (
              <PlannerJourneyAction
                action={view.nextAction}
                sourceKind={view.dataSource.kind}
                isPending={isPending}
                canComplete={view.supportedActions.canCompleteStep}
                canSkip={view.supportedActions.canSkipStep}
                canExplore={view.supportedActions.canPreviewScenario}
                detailButtonRef={detailButtonRef}
                scenarioButtonRef={scenarioButtonRef}
                onComplete={onComplete}
                onRecordDemo={onRecordDemo}
                onSkip={onSkip}
                onExplore={onExploreScenario}
                onDetail={onOpenDetail}
              />
            )}
          </aside>
        </div>
      )}

      <footer className="planner-main__footer">
        <button type="button" className="planner-api-journey__secondary" onClick={onBackToGoals}>
          ← 목표 목록
        </button>
        {view.plan !== null && onOpenHistory !== undefined && (
          <button type="button" className="planner-api-journey__secondary" onClick={onOpenHistory}>
            계획 이력 보기
          </button>
        )}
      </footer>
    </section>
  );
}
