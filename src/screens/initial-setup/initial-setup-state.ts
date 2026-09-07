import { loadMockImportedAssets } from "../../api/asset-import";
import type { DiagnosisProgress } from "../../types/diagnosis";
import type {
  CompletedDetailedDiagnosisAnswers,
  CompletedQuickDiagnosisAnswers,
  DetailedDiagnosisAnswers,
  InitialSetupEntryMode,
  QuickDiagnosisAnswers,
} from "../../types/diagnosis";
import { DETAILED_DIAGNOSIS_QUESTIONS } from "./risk-diagnosis-questions";
import type {
  AssetImportState,
  InitialSetupDependencies,
  InitialSetupDraft,
  InitialSetupStepId,
  RiskFlow,
} from "./initial-setup-types";

export const INITIAL_SETUP_STEPS: readonly InitialSetupStepId[] = [
  "explanationDomain",
  "assets",
  "riskProfile",
] as const;

export const DEFAULT_INITIAL_SETUP_DEPENDENCIES: InitialSetupDependencies = {
  importAssets: loadMockImportedAssets,
};

export interface InitialSetupControllerState {
  readonly entryMode: InitialSetupEntryMode;
  readonly currentStepIndex: number;
  readonly draft: InitialSetupDraft;
  readonly skippedSteps: readonly InitialSetupStepId[];
  readonly assetImport: AssetImportState;
  readonly riskFlow: RiskFlow;
}

export function removeSkippedStep(
  skippedSteps: readonly InitialSetupStepId[],
  step: InitialSetupStepId,
): readonly InitialSetupStepId[] {
  return skippedSteps.filter((skippedStep) => skippedStep !== step);
}

export function addSkippedStep(
  skippedSteps: readonly InitialSetupStepId[],
  step: InitialSetupStepId,
): readonly InitialSetupStepId[] {
  return skippedSteps.includes(step) ? skippedSteps : [...skippedSteps, step];
}

export function omitStepDraft(
  draft: InitialSetupDraft,
  step: InitialSetupStepId,
): InitialSetupDraft {
  if (step === "explanationDomain") {
    const { explanationDomain, ...remainingDraft } = draft;
    void explanationDomain;
    return remainingDraft;
  }
  if (step === "assets") {
    const { importedAssets, ...remainingDraft } = draft;
    void importedAssets;
    return remainingDraft;
  }
  const { quickAnswers, quickDiagnosis, detailedAnswers, ...remainingDraft } =
    draft;
  void quickAnswers;
  void quickDiagnosis;
  void detailedAnswers;
  return remainingDraft;
}

export function toCompletedQuickAnswers(
  answers: QuickDiagnosisAnswers | undefined,
): CompletedQuickDiagnosisAnswers | null {
  if (!answers?.Q1 || !answers.Q2 || !answers.Q3) return null;
  return { Q1: answers.Q1, Q2: answers.Q2, Q3: answers.Q3 };
}

export function toCompletedDetailedAnswers(
  answers: DetailedDiagnosisAnswers | undefined,
): CompletedDetailedDiagnosisAnswers | null {
  if (!answers?.Q4 || !answers.Q5 || !answers.Q6) return null;
  return { Q4: answers.Q4, Q5: answers.Q5, Q6: answers.Q6 };
}

export function firstUnansweredDetailedQuestion(
  answers: DetailedDiagnosisAnswers | undefined,
): number {
  const questionIndex = DETAILED_DIAGNOSIS_QUESTIONS.findIndex(
    (question) => !answers?.[question.code],
  );
  return questionIndex < 0 ? DETAILED_DIAGNOSIS_QUESTIONS.length - 1 : questionIndex;
}

export function createInitialSetupControllerState(
  entryMode: InitialSetupEntryMode,
  progress: DiagnosisProgress,
): InitialSetupControllerState {
  const base: InitialSetupControllerState = {
    entryMode,
    currentStepIndex: entryMode === "onboarding" ? 0 : 2,
    draft: {},
    skippedSteps: [],
    assetImport: { status: "idle" },
    riskFlow: { kind: "quickQuestion", questionIndex: 0 },
  };

  if (
    entryMode === "onboarding" ||
    entryMode === "quickDiagnosis" ||
    progress.status === "unmeasured"
  ) {
    return base;
  }

  const detailedAnswers =
    progress.status === "detailInProgress" ||
    progress.status === "detailComplete"
      ? progress.detailedAnswers
      : undefined;

  return {
    ...base,
    draft: {
      quickAnswers: progress.quickResult.answers,
      quickDiagnosis: progress.quickResult,
      detailedAnswers,
    },
    riskFlow:
      progress.status === "detailComplete"
        ? {
            kind: "detailComplete",
            result: progress.quickResult,
            detailedAnswers: progress.detailedAnswers,
          }
        : {
            kind: "detailQuestion",
            questionIndex: firstUnansweredDetailedQuestion(detailedAnswers),
            result: progress.quickResult,
          },
  };
}
