import {
  getExplanationDomainLabel,
  getExplanationLevelLabel,
  getRiskProfileDisplayName,
  toExplanationLevel,
  toRiskProfileKind,
} from "../../components/diagnosis/diagnosis-presenter";
import type { RiskGrade } from "../../api/generated/divurve-api";
import type {
  DiagnosisProgress,
  ExplanationDomain,
  ExplanationLevel,
  ProfileExplanationPreferences,
} from "../../types/diagnosis";
import type { ServerDiagnosisSummary } from "../../components/diagnosis/diagnosis-status-card";
import type { SettingsView } from "../../types/mypage";

export interface ProfilePreferencesViewModel {
  readonly explanationDomain: ExplanationDomain;
  readonly explanationDomainLabel: string;
  readonly explanationLevel: ExplanationLevel;
  readonly explanationLevelLabel: string;
  readonly sourceLabel: string;
}

function parseDomain(value: string): ExplanationDomain {
  if (
    value === "finance" ||
    value === "dev" ||
    value === "marketing" ||
    value === "plain"
  ) {
    return value;
  }
  return "plain";
}

function parseLevel(value: string): ExplanationLevel {
  if (value === "simple") return "simple";
  if (value === "analytical") return "analytical";
  return "reasoned";
}

function getDetailedLevel(
  progress: DiagnosisProgress,
): ExplanationLevel | undefined {
  if (
    progress.status !== "detailInProgress" &&
    progress.status !== "detailComplete"
  ) {
    return undefined;
  }
  const answer = progress.detailedAnswers.Q5;
  return answer === undefined ? undefined : toExplanationLevel(answer);
}

export function createProfilePreferencesViewModel(
  settings: Pick<SettingsView, "explainDomain" | "explainLevel">,
  localPreferences: ProfileExplanationPreferences,
  progress: DiagnosisProgress,
): ProfilePreferencesViewModel {
  const explanationDomain =
    localPreferences.explanationDomain ?? parseDomain(settings.explainDomain);
  const explanationLevel =
    localPreferences.explanationLevel ??
    getDetailedLevel(progress) ??
    parseLevel(settings.explainLevel);
  const hasLocalValue =
    localPreferences.explanationDomain !== undefined ||
    localPreferences.explanationLevel !== undefined ||
    getDetailedLevel(progress) !== undefined;

  return {
    explanationDomain,
    explanationDomainLabel: getExplanationDomainLabel(explanationDomain),
    explanationLevel,
    explanationLevelLabel: getExplanationLevelLabel(explanationLevel),
    sourceLabel: hasLocalValue
      ? "이번 설정에서 선택한 값을 보여드려요."
      : "계정에 저장된 설명 설정을 보여드려요.",
  };
}

/**
 * 계정에 저장된 진단 결과를 화면 문구로 옮긴다.
 *
 * 서버가 주는 기계 코드 `grade` 로만 판정한다. 한글 라벨(`gradeLabel`)을
 * 되짚어 코드를 알아내던 예전 방식은 서버가 라벨 문구를 손대는 순간 매칭에
 * 실패했다 — 라벨은 표시용이지 식별자가 아니다.
 */
export function createServerDiagnosisSummary(
  grade: RiskGrade | null,
  details: Pick<
    ServerDiagnosisSummary,
    "scoreLabel" | "diagnosedOnLabel" | "limitationNote"
  > = {
    scoreLabel: null,
    diagnosedOnLabel: null,
    limitationNote: null,
  },
): ServerDiagnosisSummary {
  return {
    displayName:
      grade === null
        ? "기존 진단 결과"
        : getRiskProfileDisplayName(toRiskProfileKind(grade)),
    description:
      "계정에 저장된 진단 결과입니다. 현재 접속에서 진행한 상세 답변과는 구분해 표시합니다.",
    ...details,
  };
}
