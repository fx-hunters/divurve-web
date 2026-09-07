import type {
  DetailedChoiceCode,
  DetailedQuestionCode,
  QuickChoiceCode,
  QuickQuestionCode,
} from "../../types/diagnosis";

export interface QuickDiagnosisOption {
  readonly code: QuickChoiceCode;
  readonly label: string;
  readonly evidence: string;
}

export interface QuickDiagnosisQuestion {
  readonly code: QuickQuestionCode;
  readonly title: string;
  readonly options: readonly QuickDiagnosisOption[];
}

export interface DetailedDiagnosisOption {
  readonly code: DetailedChoiceCode;
  readonly label: string;
}

export interface DetailedDiagnosisQuestion {
  readonly code: DetailedQuestionCode;
  readonly title: string;
  readonly options: readonly DetailedDiagnosisOption[];
}

export const QUICK_DIAGNOSIS_QUESTIONS: readonly QuickDiagnosisQuestion[] = [
  {
    code: "Q1",
    title:
      "보유 자산의 원화 가치가 한 달 사이 15% 줄었다면, 가장 가까운 행동은 무엇인가요?",
    options: [
      {
        code: "A",
        label: "손실이 더 커지기 전에 대부분 줄인다.",
        evidence: "손실이 발생하면 자산을 빠르게 줄이는 쪽에 가깝습니다.",
      },
      {
        code: "B",
        label: "일부를 줄이고 상황을 지켜본다.",
        evidence: "손실 상황에서는 일부를 줄인 뒤 변화를 확인하는 편입니다.",
      },
      {
        code: "C",
        label: "처음 세운 계획을 유지하며 원인을 확인한다.",
        evidence: "변동이 생겨도 계획을 유지하며 원인을 확인하는 편입니다.",
      },
      {
        code: "D",
        label: "감당할 수 있는 범위에서 추가 기회도 검토한다.",
        evidence: "감당 가능한 범위라면 변동 속 기회도 함께 살펴봅니다.",
      },
    ],
  },
  {
    code: "Q2",
    title: "더 높은 수익 가능성을 위해 어느 정도의 가격 변동을 감수할 수 있나요?",
    options: [
      {
        code: "A",
        label: "기대수익이 낮더라도 변동이 작은 편이 좋다.",
        evidence: "기대 가능성보다 작은 가격 변동을 우선합니다.",
      },
      {
        code: "B",
        label: "작은 변동까지는 감수할 수 있다.",
        evidence: "작은 가격 변동까지는 받아들일 수 있습니다.",
      },
      {
        code: "C",
        label: "충분한 기대수익이 있다면 큰 변동도 감수할 수 있다.",
        evidence: "충분한 가능성이 있다면 큰 변동도 감수하는 편입니다.",
      },
      {
        code: "D",
        label: "높은 가능성을 위해 매우 큰 변동도 감수할 수 있다.",
        evidence: "높은 가능성을 위해 매우 큰 변동도 받아들일 수 있습니다.",
      },
    ],
  },
  {
    code: "Q3",
    title: "계획한 환전일까지 환율이 계속 오르내린다면 어떤 방식이 가장 편한가요?",
    options: [
      {
        code: "A",
        label: "가능한 한 빨리 필요한 금액을 확정한다.",
        evidence: "환율이 움직일 때 필요한 외화를 일찍 확정하는 방식을 편하게 느낍니다.",
      },
      {
        code: "B",
        label: "여러 번 나누어 일부씩 준비한다.",
        evidence: "환전 시점을 나누어 준비하는 방식을 편하게 느낍니다.",
      },
      {
        code: "C",
        label: "정한 계획과 기준을 유지하며 지켜본다.",
        evidence: "환율이 움직여도 정한 계획과 기준을 유지하는 편입니다.",
      },
      {
        code: "D",
        label: "변동 상황에 따라 준비 시점과 금액을 적극적으로 조정한다.",
        evidence: "환율 변동에 맞춰 준비 시점과 금액을 조정하는 편입니다.",
      },
    ],
  },
] as const;

export const DETAILED_DIAGNOSIS_QUESTIONS: readonly DetailedDiagnosisQuestion[] = [
  {
    code: "Q4",
    title: "현재 외화 자산은 생활비나 비상금과 얼마나 분리되어 있나요?",
    options: [
      { code: "A", label: "생활비·비상금과 거의 구분되어 있지 않다." },
      { code: "B", label: "일부는 분리되어 있지만 필요하면 함께 사용할 수 있다." },
      { code: "C", label: "별도의 목적자금으로 명확하게 분리되어 있다." },
    ],
  },
  {
    code: "Q5",
    title: "결과를 어느 정도 깊이로 설명받고 싶나요?",
    options: [
      { code: "A", label: "핵심만 쉽게" },
      { code: "B", label: "이유와 근거까지" },
      { code: "C", label: "지표와 한계까지" },
    ],
  },
  {
    code: "Q6",
    title: "외화나 해외자산을 보유해 본 경험은 어느 정도인가요?",
    options: [
      { code: "A", label: "이번이 처음이거나 거의 처음이다." },
      { code: "B", label: "몇 차례 경험이 있다." },
      { code: "C", label: "꾸준히 보유하거나 관리해 본 경험이 있다." },
    ],
  },
] as const;
