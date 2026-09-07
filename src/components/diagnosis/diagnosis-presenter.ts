import type {
  CompletedDetailedDiagnosisAnswers,
  DetailedChoiceCode,
  ExplanationDomain,
  ExplanationLevel,
  QuickRiskResult,
  RiskProfileKind,
} from "../../types/diagnosis";

interface RiskProfileCopy {
  readonly displayName: string;
  readonly summary: string;
  readonly sentencePrefix: string;
}

interface DetailPhrase {
  readonly label: string;
  readonly emphasis: string;
}

export interface DetailedDiagnosisPresentation {
  readonly profileName: string;
  readonly profileSummary: string;
  readonly profileSentence: {
    readonly prefix: string;
    readonly emphasis: string;
    readonly suffix: string;
  };
  readonly fundSentence: {
    readonly prefix: string;
    readonly emphasis: string;
    readonly suffix: string;
  };
  readonly guidanceSentence: {
    readonly experienceEmphasis: string;
    readonly connector: string;
    readonly levelEmphasis: string;
    readonly suffix: string;
  };
  readonly details: {
    readonly fundSeparation: string;
    readonly explanationLevel: string;
    readonly experience: string;
  };
  readonly plainText: string;
}

const RISK_PROFILE_COPY: Readonly<Record<RiskProfileKind, RiskProfileCopy>> = {
  stable: {
    displayName: "안정항로형",
    summary:
      "변동을 크게 감수하기보다 필요한 범위를 차분히 준비하는 편에 가깝습니다.",
    sentencePrefix: "필요한 범위를 차분히 준비하는",
  },
  balanced: {
    displayName: "균형항로형",
    summary:
      "변동을 어느 정도 받아들이면서도 기준을 세워 계획을 이어가는 편에 가깝습니다.",
    sentencePrefix: "변동을 받아들이되 기준을 세워 움직이는",
  },
  active: {
    displayName: "적극항로형",
    summary:
      "변동의 원인을 확인하며 감당할 수 있는 범위에서 계획을 이어가는 편에 가깝습니다.",
    sentencePrefix: "변동에도 계획을 이어가는",
  },
  challenger: {
    displayName: "도전항로형",
    summary:
      "큰 변동도 받아들이며 상황에 맞춰 준비 시점과 범위를 적극적으로 조정하는 편에 가깝습니다.",
    sentencePrefix: "큰 변동에도 적극적으로 대응하는",
  },
};

const FUND_PHRASES: Readonly<Record<DetailedChoiceCode, DetailPhrase>> = {
  A: {
    label: "생활자금 민감형",
    emphasis: "생활비·비상금과 함께 관리",
  },
  B: {
    label: "목적자금 혼합형",
    emphasis: "생활비와 일부 함께 관리",
  },
  C: {
    label: "목적자금 분리형",
    emphasis: "생활비와 분리한 목적자금으로 관리",
  },
};

const EXPLANATION_LEVELS: Readonly<
  Record<DetailedChoiceCode, DetailPhrase & { readonly value: ExplanationLevel }>
> = {
  A: {
    value: "simple",
    label: "핵심만 쉽게",
    emphasis: "핵심부터 쉽게",
  },
  B: {
    value: "reasoned",
    label: "이유와 근거까지",
    emphasis: "이유와 근거를 함께",
  },
  C: {
    value: "analytical",
    label: "지표와 한계까지",
    emphasis: "지표와 한계까지 함께",
  },
};

const EXPERIENCE_PHRASES: Readonly<Record<DetailedChoiceCode, DetailPhrase>> = {
  A: {
    label: "처음 시작하는 단계",
    emphasis: "관련 경험이 아직 많지 않아",
  },
  B: {
    label: "몇 차례 경험한 단계",
    emphasis: "관련 경험이 몇 차례 있어",
  },
  C: {
    label: "꾸준히 관리한 단계",
    emphasis: "관련 경험을 꾸준히 쌓아와",
  },
};

const EXPLANATION_DOMAIN_LABELS: Readonly<
  Record<ExplanationDomain, string>
> = {
  finance: "금융·경제",
  dev: "개발·기술",
  marketing: "마케팅·브랜드",
  plain: "일상적인 설명",
};

const EXPLANATION_LEVEL_LABELS: Readonly<Record<ExplanationLevel, string>> = {
  simple: "핵심만 쉽게",
  reasoned: "이유와 근거까지",
  analytical: "지표와 한계까지",
};

export function getRiskProfileCopy(kind: RiskProfileKind): RiskProfileCopy {
  return RISK_PROFILE_COPY[kind];
}

export function getRiskProfileDisplayName(kind: RiskProfileKind): string {
  return getRiskProfileCopy(kind).displayName;
}

export function getExplanationDomainLabel(domain: ExplanationDomain): string {
  return EXPLANATION_DOMAIN_LABELS[domain];
}

export function getExplanationLevelLabel(level: ExplanationLevel): string {
  return EXPLANATION_LEVEL_LABELS[level];
}

export function toExplanationLevel(
  choice: DetailedChoiceCode,
): ExplanationLevel {
  return EXPLANATION_LEVELS[choice].value;
}

export function createDetailedDiagnosisPresentation(
  quickResult: QuickRiskResult,
  detailedAnswers: CompletedDetailedDiagnosisAnswers,
): DetailedDiagnosisPresentation {
  const risk = getRiskProfileCopy(quickResult.kind);
  const fund = FUND_PHRASES[detailedAnswers.Q4];
  const level = EXPLANATION_LEVELS[detailedAnswers.Q5];
  const experience = EXPERIENCE_PHRASES[detailedAnswers.Q6];
  const profileSentence = `${risk.sentencePrefix} ${risk.displayName}이에요.`;
  const fundSentence = `외화자산은 ${fund.emphasis}하고 있으며,`;
  const guidanceSentence = `${experience.emphasis} 앞으로는 ${level.emphasis} 안내드릴게요.`;

  return {
    profileName: risk.displayName,
    profileSummary: risk.summary,
    profileSentence: {
      prefix: `${risk.sentencePrefix} `,
      emphasis: risk.displayName,
      suffix: "이에요.",
    },
    fundSentence: {
      prefix: "외화자산은 ",
      emphasis: fund.emphasis,
      suffix: "하고 있으며,",
    },
    guidanceSentence: {
      experienceEmphasis: experience.emphasis,
      connector: " 앞으로는 ",
      levelEmphasis: level.emphasis,
      suffix: " 안내드릴게요.",
    },
    details: {
      fundSeparation: fund.label,
      explanationLevel: level.label,
      experience: experience.label,
    },
    plainText: `${profileSentence} ${fundSentence} ${guidanceSentence}`,
  };
}

export function describeDetailedAnswers(
  detailedAnswers: CompletedDetailedDiagnosisAnswers,
): DetailedDiagnosisPresentation["details"] {
  return {
    fundSeparation: FUND_PHRASES[detailedAnswers.Q4].label,
    explanationLevel: EXPLANATION_LEVELS[detailedAnswers.Q5].label,
    experience: EXPERIENCE_PHRASES[detailedAnswers.Q6].label,
  };
}
