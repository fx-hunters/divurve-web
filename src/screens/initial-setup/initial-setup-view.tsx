import { Badge } from "../../components/common/badge";
import { Icon } from "../../components/common/icon";
import { ProgressBar } from "../../components/common/progress-bar";
import type {
  InitialSetupActions,
  InitialSetupState,
} from "./initial-setup-types";
import {
  AssetImportStep,
  DetailCompleteStep,
  DiagnosisQuestionStep,
  ExplanationDomainStep,
  QuickResultStep,
} from "./initial-setup-steps";
import {
  DETAILED_DIAGNOSIS_QUESTIONS,
  QUICK_DIAGNOSIS_QUESTIONS,
} from "./risk-diagnosis-questions";

interface InitialSetupViewProps {
  readonly state: InitialSetupState;
  readonly actions: InitialSetupActions;
}

function RiskStep({ state, actions }: InitialSetupViewProps) {
  const flow = state.riskFlow;
  switch (flow.kind) {
    case "quickQuestion": {
      const question = QUICK_DIAGNOSIS_QUESTIONS[flow.questionIndex]!;
      return (
        <DiagnosisQuestionStep
          phaseLabel="간편 위험성향 진단"
          questionNumber={flow.questionIndex + 1}
          totalQuestions={QUICK_DIAGNOSIS_QUESTIONS.length}
          code={question.code}
          title={question.title}
          options={question.options}
          selectedCode={state.draft.quickAnswers?.[question.code]}
          onSelect={actions.selectQuickAnswer}
        />
      );
    }
    case "quickResult":
      return <QuickResultStep result={flow.result} />;
    case "detailQuestion": {
      const question = DETAILED_DIAGNOSIS_QUESTIONS[flow.questionIndex]!;
      return (
        <DiagnosisQuestionStep
          phaseLabel="상세 진단"
          questionNumber={flow.questionIndex + 1}
          totalQuestions={DETAILED_DIAGNOSIS_QUESTIONS.length}
          code={question.code}
          title={question.title}
          options={question.options}
          selectedCode={state.draft.detailedAnswers?.[question.code]}
          onSelect={actions.selectDetailedAnswer}
        />
      );
    }
    case "detailComplete":
      return (
        <DetailCompleteStep
          result={flow.result}
          answers={flow.detailedAnswers}
        />
      );
  }
}

function CurrentStep({ state, actions }: InitialSetupViewProps) {
  switch (state.currentStep) {
    case "explanationDomain":
      return (
        <ExplanationDomainStep
          selectedDomain={state.draft.explanationDomain}
          onSelect={actions.selectExplanationDomain}
        />
      );
    case "assets":
      return (
        <AssetImportStep
          state={state.assetImport}
          onImport={actions.importAssets}
        />
      );
    case "riskProfile":
      return <RiskStep state={state} actions={actions} />;
  }
}

function getPrimaryLabel(state: InitialSetupState): string {
  if (state.currentStep !== "riskProfile") return "다음";

  const flow = state.riskFlow;
  if (flow.kind === "quickQuestion") {
    return flow.questionIndex === 2 ? "결과 보기" : "다음 질문";
  }
  if (flow.kind === "quickResult") {
    return state.entryMode === "onboarding"
      ? "홈 시작하기"
      : "마이페이지로 돌아가기";
  }
  if (flow.kind === "detailQuestion") {
    return flow.questionIndex === 2 ? "상세 결과 보기" : "다음 질문";
  }
  return "상세 결과 확인하기";
}

function StandardActions({ state, actions }: InitialSetupViewProps) {
  const isRiskQuestion =
    state.currentStep === "riskProfile" &&
    state.riskFlow.kind === "quickQuestion";
  const isDetailQuestion =
    state.currentStep === "riskProfile" &&
    state.riskFlow.kind === "detailQuestion";
  const canSkip =
    state.currentStep !== "riskProfile" || isRiskQuestion || isDetailQuestion;

  return (
    <footer className="initial-setup__actions">
      {canSkip ? (
        <button
          className="initial-setup__button initial-setup__button--quiet"
          type="button"
          onClick={
            isDetailQuestion
              ? actions.deferDetailedDiagnosis
              : actions.skipCurrentStep
          }
        >
          {isDetailQuestion
            ? "나중에 이어서"
            : isRiskQuestion
              ? state.entryMode === "onboarding"
                ? "진단 건너뛰고 홈으로"
                : "간편 진단 나중에 하기"
              : "건너뛰기"}
        </button>
      ) : (
        <span />
      )}
      <div className="initial-setup__action-group">
        <button
          className="initial-setup__button initial-setup__button--secondary"
          type="button"
          onClick={actions.goBack}
          disabled={!state.canGoBack}
        >
          이전
        </button>
        <button
          className="initial-setup__button initial-setup__button--primary"
          type="button"
          onClick={actions.goNext}
          disabled={!state.canContinue}
        >
          <span>{getPrimaryLabel(state)}</span>
          {state.riskFlow.kind !== "detailComplete" && (
            <Icon name="arrowRight" size={17} />
          )}
        </button>
      </div>
    </footer>
  );
}

interface ProgressCopy {
  readonly ariaLabel: string;
  readonly label: string;
  readonly current: number;
  readonly total: number;
}

function getProgressCopy(state: InitialSetupState): ProgressCopy {
  if (state.entryMode === "onboarding") {
    return {
      ariaLabel: "초기 설정 진행률",
      label: "내게 맞는 화면 준비",
      current: state.currentStepNumber,
      total: state.totalSteps,
    };
  }

  const isDetailed =
    state.riskFlow.kind === "detailQuestion" ||
    state.riskFlow.kind === "detailComplete";
  const current =
    state.riskFlow.kind === "quickQuestion" ||
    state.riskFlow.kind === "detailQuestion"
      ? state.riskFlow.questionIndex + 1
      : 3;
  const label = isDetailed ? "상세 진단" : "간편 진단";
  return {
    ariaLabel: `${label} 진행률`,
    label,
    current,
    total: 3,
  };
}

function getHeaderLabel(state: InitialSetupState): string {
  if (state.entryMode === "onboarding") return "초기 설정";
  if (
    state.riskFlow.kind === "detailQuestion" ||
    state.riskFlow.kind === "detailComplete"
  ) {
    return "상세 진단";
  }
  return "간편 진단";
}

function getPanelKey(state: InitialSetupState): string {
  if (state.currentStep !== "riskProfile") return state.currentStep;
  if (
    state.riskFlow.kind === "quickQuestion" ||
    state.riskFlow.kind === "detailQuestion"
  ) {
    return state.riskFlow.kind + "-" + state.riskFlow.questionIndex;
  }
  return state.riskFlow.kind;
}

export function InitialSetupView({ state, actions }: InitialSetupViewProps) {
  const progress = getProgressCopy(state);

  return (
    <main className="initial-setup">
      <div className="initial-setup__backdrop" aria-hidden="true" />
      <div className="initial-setup__shell">
        <header className="initial-setup__header">
          <div className="initial-setup__brand" aria-label="DIVURVE">
            <span className="initial-setup__brand-mark" aria-hidden="true">
              D
            </span>
            <span>DIVURVE</span>
          </div>
          <Badge variant="primary">{getHeaderLabel(state)}</Badge>
        </header>

        <section className="initial-setup__progress" aria-label={progress.ariaLabel}>
          <div className="initial-setup__progress-copy">
            <span>{progress.label}</span>
            <strong>
              {progress.current} / {progress.total}
            </strong>
          </div>
          <ProgressBar ratio={progress.current / progress.total} />
        </section>

        <div
          className="initial-setup__panel"
          key={getPanelKey(state)}
          aria-live="polite"
        >
          <CurrentStep state={state} actions={actions} />
        </div>

        <StandardActions state={state} actions={actions} />
      </div>
    </main>
  );
}
