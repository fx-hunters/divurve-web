import type { SettingsResponse } from "../../api/generated/divurve-api";
import {
  getExplanationDomainLabel,
  getExplanationLevelLabel,
  getRiskProfileDisplayName,
  toExplanationLevel,
} from "../../components/diagnosis/diagnosis-presenter";
import type {
  DiagnosisProgress,
  ExplanationDomain,
  ExplanationLevel,
  ProfileExplanationPreferences,
  RiskProfileKind,
} from "../../types/diagnosis";
import type { ServerDiagnosisSummary } from "../../components/diagnosis/diagnosis-status-card";

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
  settings: SettingsResponse,
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

const SERVER_RISK_KIND: Readonly<Record<string, RiskProfileKind>> = {
  stable: "stable",
  balanced: "balanced",
  active: "active",
  challenge: "challenger",
  challenger: "challenger",
  안정형: "stable",
  균형형: "balanced",
  적극형: "active",
  도전형: "challenger",
  안정항로형: "stable",
  균형항로형: "balanced",
  적극항로형: "active",
  도전항로형: "challenger",
};

export function createServerDiagnosisSummary(
  riskType: string,
): ServerDiagnosisSummary {
  const kind = SERVER_RISK_KIND[riskType.trim().toLowerCase()];
  return {
    displayName: kind
      ? getRiskProfileDisplayName(kind)
      : "기존 진단 결과",
    description:
      "계정에 저장된 진단 결과입니다. 현재 접속에서 진행한 상세 답변과는 구분해 표시합니다.",
  };
}
