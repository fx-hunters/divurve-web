import { describe, expect, it } from "vitest";
import { calculateQuickRiskResult } from "../../screens/initial-setup/risk-diagnosis";
import {
  createDetailedDiagnosisPresentation,
  describeDetailedAnswers,
  getExplanationDomainLabel,
  getExplanationLevelLabel,
  getRiskProfileCopy,
  getRiskProfileDisplayName,
  toExplanationLevel,
} from "./diagnosis-presenter";

describe("diagnosis presenter", () => {
  it.each([
    ["stable", "안정항로형"],
    ["balanced", "균형항로형"],
    ["active", "적극항로형"],
    ["challenger", "도전항로형"],
  ] as const)("%s의 사용자 표시명을 %s로 제공한다", (kind, label) => {
    expect(getRiskProfileDisplayName(kind)).toBe(label);
    expect(getRiskProfileCopy(kind).summary).toContain("편에 가깝습니다");
  });

  it.each([
    ["finance", "금융·경제"],
    ["dev", "개발·기술"],
    ["marketing", "마케팅·브랜드"],
    ["plain", "일상적인 설명"],
  ] as const)("설명 분야 %s를 한국어로 표시한다", (domain, label) => {
    expect(getExplanationDomainLabel(domain)).toBe(label);
  });

  it.each([
    ["A", "simple", "핵심만 쉽게"],
    ["B", "reasoned", "이유와 근거까지"],
    ["C", "analytical", "지표와 한계까지"],
  ] as const)("Q5 %s를 설명 수준으로 변환한다", (choice, value, label) => {
    expect(toExplanationLevel(choice)).toBe(value);
    expect(getExplanationLevelLabel(value)).toBe(label);
  });

  it("Q1~Q3 결과를 중심으로 Q4~Q6 맥락을 자연어 문장으로 연결한다", () => {
    const quickResult = calculateQuickRiskResult({ Q1: "C", Q2: "C", Q3: "C" });
    const presentation = createDetailedDiagnosisPresentation(quickResult, {
      Q4: "B",
      Q5: "A",
      Q6: "B",
    });

    expect(quickResult.score).toBe(6);
    expect(presentation.profileName).toBe("적극항로형");
    expect(presentation.plainText).toBe(
      "변동에도 계획을 이어가는 적극항로형이에요. 외화자산은 생활비와 일부 함께 관리하고 있으며, 관련 경험이 몇 차례 있어 앞으로는 핵심부터 쉽게 안내드릴게요.",
    );
    expect(presentation.plainText).not.toContain("목적자금 혼합형 ·");
    expect(presentation.details).toEqual({
      fundSeparation: "목적자금 혼합형",
      explanationLevel: "핵심만 쉽게",
      experience: "몇 차례 경험한 단계",
    });
  });

  it.each([
    ["A", "생활자금 민감형", "처음 시작하는 단계"],
    ["B", "목적자금 혼합형", "몇 차례 경험한 단계"],
    ["C", "목적자금 분리형", "꾸준히 관리한 단계"],
  ] as const)("Q4와 Q6의 %s 설명 라벨을 보존한다", (choice, fund, experience) => {
    expect(
      describeDetailedAnswers({ Q4: choice, Q5: choice, Q6: choice }),
    ).toMatchObject({ fundSeparation: fund, experience });
  });
});
