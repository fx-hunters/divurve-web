import type { AssetImportLoader } from "../../api/asset-import";
import type { ImportedAssetSummary } from "../../types/assets";
import type {
  CompletedDetailedDiagnosisAnswers,
  DetailedChoiceCode,
  DetailedDiagnosisAnswers,
  ExplanationDomain,
  InitialSetupEntryMode,
  QuickChoiceCode,
  QuickDiagnosisAnswers,
  QuickRiskResult,
} from "../../types/diagnosis";

export type { ExplanationDomain } from "../../types/diagnosis";

export type InitialSetupStepId =
  | "explanationDomain"
  | "assets"
  | "riskProfile";

export type AssetImportState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "success"; readonly data: ImportedAssetSummary }
  | { readonly status: "empty"; readonly data: ImportedAssetSummary }
  | { readonly status: "error"; readonly message: string };

export type RiskFlow =
  | { readonly kind: "quickQuestion"; readonly questionIndex: number }
  | { readonly kind: "quickResult"; readonly result: QuickRiskResult }
  | {
      readonly kind: "detailQuestion";
      readonly questionIndex: number;
      readonly result: QuickRiskResult;
    }
  | {
      readonly kind: "detailComplete";
      readonly result: QuickRiskResult;
      readonly detailedAnswers: CompletedDetailedDiagnosisAnswers;
    };

export interface InitialSetupDraft {
  readonly explanationDomain?: ExplanationDomain;
  readonly importedAssets?: ImportedAssetSummary;
  readonly quickAnswers?: QuickDiagnosisAnswers;
  readonly quickDiagnosis?: QuickRiskResult;
  readonly detailedAnswers?: DetailedDiagnosisAnswers;
}

export interface InitialSetupSubmission {
  readonly draft: InitialSetupDraft;
  readonly skippedSteps: readonly InitialSetupStepId[];
}

export interface InitialSetupState {
  readonly entryMode: InitialSetupEntryMode;
  readonly currentStep: InitialSetupStepId;
  readonly currentStepNumber: number;
  readonly totalSteps: number;
  readonly canGoBack: boolean;
  readonly canContinue: boolean;
  readonly draft: InitialSetupDraft;
  readonly skippedSteps: readonly InitialSetupStepId[];
  readonly assetImport: AssetImportState;
  readonly riskFlow: RiskFlow;
}

export interface InitialSetupActions {
  readonly selectExplanationDomain: (domain: ExplanationDomain) => void;
  /** 사용자의 명시적인 동작으로 계정 자산을 조회한다. */
  readonly importAssets: () => Promise<void>;
  readonly selectQuickAnswer: (choice: QuickChoiceCode) => void;
  readonly selectDetailedAnswer: (choice: DetailedChoiceCode) => void;
  readonly goBack: () => void;
  readonly goNext: () => void;
  readonly skipCurrentStep: () => void;
  readonly deferDetailedDiagnosis: () => void;
  readonly finishSetup: () => void;
}

export interface InitialSetupDependencies {
  readonly importAssets: AssetImportLoader;
}

export interface InitialSetupOptions {
  readonly entryMode?: InitialSetupEntryMode;
  readonly dependencies?: Partial<InitialSetupDependencies>;
}
