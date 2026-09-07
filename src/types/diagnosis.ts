export type QuickQuestionCode = "Q1" | "Q2" | "Q3";
export type DetailedQuestionCode = "Q4" | "Q5" | "Q6";
export type QuickChoiceCode = "A" | "B" | "C" | "D";
export type DetailedChoiceCode = "A" | "B" | "C";

export type QuickDiagnosisAnswers = Partial<
  Readonly<Record<QuickQuestionCode, QuickChoiceCode>>
>;

export type CompletedQuickDiagnosisAnswers = Readonly<
  Record<QuickQuestionCode, QuickChoiceCode>
>;

export type DetailedDiagnosisAnswers = Partial<
  Readonly<Record<DetailedQuestionCode, DetailedChoiceCode>>
>;

export type CompletedDetailedDiagnosisAnswers = Readonly<
  Record<DetailedQuestionCode, DetailedChoiceCode>
>;

export type RiskProfileKind =
  | "stable"
  | "balanced"
  | "active"
  | "challenger";

export type ExplanationDomain = "finance" | "dev" | "marketing" | "plain";

export type ExplanationLevel = "simple" | "reasoned" | "analytical";

export interface ProfileExplanationPreferences {
  readonly explanationDomain?: ExplanationDomain;
  readonly explanationLevel?: ExplanationLevel;
}

export interface QuickRiskResult {
  readonly kind: RiskProfileKind;
  readonly label: string;
  readonly score: number;
  readonly summary: string;
  readonly evidence: readonly string[];
  readonly answers: CompletedQuickDiagnosisAnswers;
}

export type DiagnosisProgress =
  | { readonly status: "unmeasured" }
  | {
      readonly status: "quickComplete";
      readonly quickResult: QuickRiskResult;
    }
  | {
      readonly status: "detailInProgress";
      readonly quickResult: QuickRiskResult;
      readonly detailedAnswers: DetailedDiagnosisAnswers;
    }
  | {
      readonly status: "detailComplete";
      readonly quickResult: QuickRiskResult;
      readonly detailedAnswers: CompletedDetailedDiagnosisAnswers;
    };

export type InitialSetupEntryMode =
  | "onboarding"
  | "quickDiagnosis"
  | "detailedDiagnosis";
