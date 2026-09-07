import { describe, expect, it } from "vitest";
import { calculateQuickRiskResult } from "./risk-diagnosis";
import { describeDetailedDiagnosis } from "./detailed-diagnosis";

describe("detailed diagnosis description", () => {
  it.each([
    ["A", "생활자금 민감형", "핵심만 쉽게", "처음 시작하는 단계"],
    ["B", "목적자금 혼합형", "이유와 근거까지", "몇 차례 경험한 단계"],
    ["C", "목적자금 분리형", "지표와 한계까지", "꾸준히 관리한 단계"],
  ] as const)("상세 답변 %s를 설명 설정으로 변환한다", (choice, fund, level, experience) => {
    expect(
      describeDetailedDiagnosis({ Q4: choice, Q5: choice, Q6: choice }),
    ).toEqual({
      fundSeparationLabel: fund,
      explanationLevelLabel: level,
      experienceLabel: experience,
    });
  });

  it("상세 답변은 간편 진단 점수와 유형을 바꾸지 않는다", () => {
    const before = calculateQuickRiskResult({ Q1: "B", Q2: "B", Q3: "B" });
    describeDetailedDiagnosis({ Q4: "C", Q5: "A", Q6: "C" });
    const after = calculateQuickRiskResult({ Q1: "B", Q2: "B", Q3: "B" });
    expect(after).toEqual(before);
  });
});
