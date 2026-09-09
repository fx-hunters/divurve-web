import { useCallback, useRef, useState } from "react";
import {
  clearDiagnosisProgress,
  readDiagnosisProgress,
  writeDiagnosisProgress,
} from "../../api/diagnosis-progress-store";
import {
  readProfilePreferences,
  writeProfilePreferences,
} from "../../api/profile-preferences-store";
import { toExplanationLevel } from "../../components/diagnosis/diagnosis-presenter";
import type {
  DetailedChoiceCode,
  QuickChoiceCode,
} from "../../types/diagnosis";
import {
  calculateQuickRiskResult,
} from "./risk-diagnosis";
import {
  DETAILED_DIAGNOSIS_QUESTIONS,
  QUICK_DIAGNOSIS_QUESTIONS,
} from "./risk-diagnosis-questions";
import {
  addSkippedStep,
  createInitialSetupControllerState,
  DEFAULT_INITIAL_SETUP_DEPENDENCIES,
  INITIAL_SETUP_STEPS,
  omitStepDraft,
  removeSkippedStep,
  toCompletedDetailedAnswers,
  toCompletedQuickAnswers,
} from "./initial-setup-state";
import type { InitialSetupControllerState } from "./initial-setup-state";
import type {
  ExplanationDomain,
  InitialSetupActions,
  InitialSetupOptions,
  InitialSetupState,
  InitialSetupSubmission,
} from "./initial-setup-types";

function canContinue(state: InitialSetupControllerState): boolean {
  const currentStep = INITIAL_SETUP_STEPS[state.currentStepIndex]!;
  if (currentStep === "explanationDomain") {
    return state.draft.explanationDomain !== undefined;
  }
  if (currentStep === "assets") {
    return (
      state.assetImport.status === "success" ||
      state.assetImport.status === "empty"
    );
  }

  switch (state.riskFlow.kind) {
    case "quickQuestion": {
      const question = QUICK_DIAGNOSIS_QUESTIONS[state.riskFlow.questionIndex]!;
      return state.draft.quickAnswers?.[question.code] !== undefined;
    }
    case "detailQuestion": {
      const question = DETAILED_DIAGNOSIS_QUESTIONS[state.riskFlow.questionIndex]!;
      return state.draft.detailedAnswers?.[question.code] !== undefined;
    }
    case "quickResult":
    case "detailComplete":
      return true;
  }
}

function buildSubmission(
  state: InitialSetupControllerState,
): InitialSetupSubmission {
  return {
    draft: state.draft,
    skippedSteps: state.skippedSteps,
  };
}

export function useInitialSetup(
  onComplete: (submission: InitialSetupSubmission) => void,
  options: InitialSetupOptions = {},
): { readonly state: InitialSetupState; readonly actions: InitialSetupActions } {
  const entryMode = options.entryMode ?? "onboarding";
  const dependencies = {
    ...DEFAULT_INITIAL_SETUP_DEPENDENCIES,
    ...options.dependencies,
  };
  const [controller, setController] = useState<InitialSetupControllerState>(() =>
    createInitialSetupControllerState(entryMode, readDiagnosisProgress()),
  );

  const currentStep = INITIAL_SETUP_STEPS[controller.currentStepIndex]!;
  const importAssets = dependencies.importAssets;
  /** 조회가 겹치지 않게 막는다. 상태로 두면 effect가 다시 돌기 전에 겹칠 수 있다. */
  const isImportingRef = useRef(false);

  const finishSetup = () => {
    onComplete(buildSubmission(controller));
  };

  const selectExplanationDomain = (domain: ExplanationDomain) => {
    writeProfilePreferences({
      ...readProfilePreferences(),
      explanationDomain: domain,
    });
    setController((current) => ({
      ...current,
      draft: { ...current.draft, explanationDomain: domain },
      skippedSteps: removeSkippedStep(
        current.skippedSteps,
        "explanationDomain",
      ),
    }));
  };

  const loadAssets = useCallback(async () => {
    if (isImportingRef.current) return;
    isImportingRef.current = true;

    setController((current) => ({
      ...current,
      assetImport: { status: "loading" },
    }));

    try {
      const importedAssets = await importAssets();
      setController((current) => ({
        ...current,
        assetImport: {
          status: importedAssets.hasAssets ? "success" : "empty",
          data: importedAssets,
        },
        draft: { ...current.draft, importedAssets },
        skippedSteps: removeSkippedStep(current.skippedSteps, "assets"),
      }));
    } catch (error: unknown) {
      setController((current) => ({
        ...current,
        assetImport: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "보유 자산을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        },
      }));
    } finally {
      isImportingRef.current = false;
    }
  }, [importAssets]);

  const selectQuickAnswer = (choice: QuickChoiceCode) => {
    if (
      controller.currentStepIndex !== 2 ||
      controller.riskFlow.kind !== "quickQuestion"
    ) return;
    const question =
      QUICK_DIAGNOSIS_QUESTIONS[controller.riskFlow.questionIndex]!;
    setController((current) => ({
      ...current,
      draft: {
        ...current.draft,
        quickAnswers: {
          ...current.draft.quickAnswers,
          [question.code]: choice,
        },
      },
      skippedSteps: removeSkippedStep(current.skippedSteps, "riskProfile"),
    }));
  };

  const selectDetailedAnswer = (choice: DetailedChoiceCode) => {
    if (
      controller.currentStepIndex !== 2 ||
      controller.riskFlow.kind !== "detailQuestion"
    ) return;
    const question =
      DETAILED_DIAGNOSIS_QUESTIONS[controller.riskFlow.questionIndex]!;
    const result = controller.riskFlow.result;

    if (question.code === "Q5") {
      writeProfilePreferences({
        ...readProfilePreferences(),
        explanationLevel: toExplanationLevel(choice),
      });
    }

    setController((current) => {
      const detailedAnswers = {
        ...current.draft.detailedAnswers,
        [question.code]: choice,
      };
      void writeDiagnosisProgress({
        status: "detailInProgress",
        quickResult: result,
        detailedAnswers,
      });
      return {
        ...current,
        draft: { ...current.draft, detailedAnswers },
      };
    });
  };

  const goBack = () => {
    setController((current) => {
      if (current.currentStepIndex < 2) {
        return {
          ...current,
          currentStepIndex: Math.max(0, current.currentStepIndex - 1),
        };
      }

      switch (current.riskFlow.kind) {
        case "quickQuestion":
          if (current.riskFlow.questionIndex > 0) {
            return {
              ...current,
              riskFlow: {
                kind: "quickQuestion",
                questionIndex: current.riskFlow.questionIndex - 1,
              },
            };
          }
          return current.entryMode === "onboarding"
            ? { ...current, currentStepIndex: 1 }
            : current;
        case "quickResult":
          return {
            ...current,
            riskFlow: { kind: "quickQuestion", questionIndex: 2 },
          };
        case "detailQuestion":
          return current.riskFlow.questionIndex > 0
            ? {
                ...current,
                riskFlow: {
                  ...current.riskFlow,
                  questionIndex: current.riskFlow.questionIndex - 1,
                },
              }
            : current;
        case "detailComplete":
          return {
            ...current,
            riskFlow: {
              kind: "detailQuestion",
              questionIndex: 2,
              result: current.riskFlow.result,
            },
          };
      }
    });
  };

  const goNext = () => {
    if (!canContinue(controller)) return;

    if (controller.currentStepIndex < 2) {
      setController((current) => ({
        ...current,
        currentStepIndex: current.currentStepIndex + 1,
      }));
      return;
    }

    const flow = controller.riskFlow;
    switch (flow.kind) {
      case "quickQuestion": {
        if (flow.questionIndex < 2) {
          setController((current) => ({
            ...current,
            riskFlow: {
              kind: "quickQuestion",
              questionIndex: flow.questionIndex + 1,
            },
          }));
          return;
        }
        const completedAnswers = toCompletedQuickAnswers(
          controller.draft.quickAnswers,
        )!;
        const result = calculateQuickRiskResult(completedAnswers);
        void writeDiagnosisProgress({ status: "quickComplete", quickResult: result });
        setController((current) => ({
          ...current,
          draft: { ...current.draft, quickDiagnosis: result },
          riskFlow: { kind: "quickResult", result },
        }));
        return;
      }
      case "quickResult":
        finishSetup();
        return;
      case "detailQuestion": {
        if (flow.questionIndex < 2) {
          setController((current) => ({
            ...current,
            riskFlow: {
              kind: "detailQuestion",
              questionIndex: flow.questionIndex + 1,
              result: flow.result,
            },
          }));
          return;
        }
        const detailedAnswers = toCompletedDetailedAnswers(
          controller.draft.detailedAnswers,
        )!;
        void writeDiagnosisProgress({
          status: "detailComplete",
          quickResult: flow.result,
          detailedAnswers,
        });
        setController((current) => ({
          ...current,
          draft: { ...current.draft, detailedAnswers },
          riskFlow: {
            kind: "detailComplete",
            result: flow.result,
            detailedAnswers,
          },
        }));
        return;
      }
      case "detailComplete":
        finishSetup();
        return;
    }
  };

  const skipCurrentStep = () => {
    const nextSkippedSteps = addSkippedStep(
      controller.skippedSteps,
      currentStep,
    );

    if (currentStep === "riskProfile") {
      void clearDiagnosisProgress();
      onComplete({
        draft: omitStepDraft(controller.draft, "riskProfile"),
        skippedSteps: nextSkippedSteps,
      });
      return;
    }

    setController((current) => ({
      ...current,
      currentStepIndex: current.currentStepIndex + 1,
      skippedSteps: nextSkippedSteps,
      draft: omitStepDraft(current.draft, currentStep),
      assetImport:
        currentStep === "assets" ? { status: "idle" } : current.assetImport,
    }));

    if (currentStep === "explanationDomain") {
      const { explanationDomain, ...remainingPreferences } =
        readProfilePreferences();
      void explanationDomain;
      writeProfilePreferences(remainingPreferences);
    }
  };

  const deferDetailedDiagnosis = () => {
    if (controller.riskFlow.kind !== "detailQuestion") return;
    const result = controller.riskFlow.result;
    const detailedAnswers = controller.draft.detailedAnswers;
    if (detailedAnswers && Object.keys(detailedAnswers).length > 0) {
      void writeDiagnosisProgress({
        status: "detailInProgress",
        quickResult: result,
        detailedAnswers,
      });
    } else {
      void writeDiagnosisProgress({ status: "quickComplete", quickResult: result });
    }
    onComplete(buildSubmission(controller));
  };

  const getCanGoBack = (): boolean => {
    if (controller.currentStepIndex < 2) {
      return controller.currentStepIndex > 0;
    }
    if (controller.riskFlow.kind === "quickQuestion") {
      return (
        controller.riskFlow.questionIndex > 0 ||
        controller.entryMode === "onboarding"
      );
    }
    if (controller.riskFlow.kind === "detailQuestion") {
      return controller.riskFlow.questionIndex > 0;
    }
    return true;
  };

  return {
    state: {
      entryMode: controller.entryMode,
      currentStep,
      currentStepNumber: controller.currentStepIndex + 1,
      totalSteps: INITIAL_SETUP_STEPS.length,
      canGoBack: getCanGoBack(),
      canContinue: canContinue(controller),
      draft: controller.draft,
      skippedSteps: controller.skippedSteps,
      assetImport: controller.assetImport,
      riskFlow: controller.riskFlow,
    },
    actions: {
      selectExplanationDomain,
      importAssets: loadAssets,
      selectQuickAnswer,
      selectDetailedAnswer,
      goBack,
      goNext,
      skipCurrentStep,
      deferDetailedDiagnosis,
      finishSetup,
    },
  };
}
