import type {
  CompletedQuickDiagnosisAnswers,
  QuickChoiceCode,
  QuickRiskResult,
  RiskProfileKind,
} from "../../types/diagnosis";
import { getRiskProfileCopy } from "../../components/diagnosis/diagnosis-presenter";
import { QUICK_DIAGNOSIS_QUESTIONS } from "./risk-diagnosis-questions";

export const QUICK_CHOICE_SCORES: Readonly<Record<QuickChoiceCode, number>> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
};

export function getRiskProfileKind(score: number): RiskProfileKind {
  if (score <= 2) return "stable";
  if (score <= 4) return "balanced";
  if (score <= 6) return "active";
  return "challenger";
}

export function calculateQuickRiskResult(
  answers: CompletedQuickDiagnosisAnswers,
): QuickRiskResult {
  const score =
    QUICK_CHOICE_SCORES[answers.Q1] +
    QUICK_CHOICE_SCORES[answers.Q2] +
    QUICK_CHOICE_SCORES[answers.Q3];
  const kind = getRiskProfileKind(score);
  const copy = getRiskProfileCopy(kind);
  const evidence = QUICK_DIAGNOSIS_QUESTIONS.map((question) => {
    const selectedCode = answers[question.code];
    return question.options.find((option) => option.code === selectedCode)!.evidence;
  });

  return {
    kind,
    label: copy.displayName,
    score,
    summary: copy.summary,
    evidence,
    answers,
  };
}
