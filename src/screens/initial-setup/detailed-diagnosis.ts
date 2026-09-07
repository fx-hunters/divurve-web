import { describeDetailedAnswers } from "../../components/diagnosis/diagnosis-presenter";
import type { CompletedDetailedDiagnosisAnswers } from "../../types/diagnosis";

export interface DetailedDiagnosisDescription {
  readonly fundSeparationLabel: string;
  readonly explanationLevelLabel: string;
  readonly experienceLabel: string;
}

export function describeDetailedDiagnosis(
  answers: CompletedDetailedDiagnosisAnswers,
): DetailedDiagnosisDescription {
  const description = describeDetailedAnswers(answers);
  return {
    fundSeparationLabel: description.fundSeparation,
    explanationLevelLabel: description.explanationLevel,
    experienceLabel: description.experience,
  };
}
