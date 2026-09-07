import { describe, expect, it } from "vitest";
import type { CompletedQuickDiagnosisAnswers } from "../../types/diagnosis";
import {
  calculateQuickRiskResult,
  getRiskProfileKind,
  QUICK_CHOICE_SCORES,
} from "./risk-diagnosis";

describe("risk diagnosis rules", () => {
  it.each([
    [0, "stable"],
    [2, "stable"],
    [3, "balanced"],
    [4, "balanced"],
    [5, "active"],
    [6, "active"],
    [7, "challenger"],
    [9, "challenger"],
  ] as const)("%i점의 성향 구간을 %s로 판정한다", (score, expected) => {
    expect(getRiskProfileKind(score)).toBe(expected);
  });

  it("A~D를 0~3점으로 합산하고 답변 근거를 함께 반환한다", () => {
    const answers: CompletedQuickDiagnosisAnswers = {
      Q1: "B",
      Q2: "C",
      Q3: "D",
    };

    expect(QUICK_CHOICE_SCORES).toEqual({ A: 0, B: 1, C: 2, D: 3 });
    expect(calculateQuickRiskResult(answers)).toMatchObject({
      kind: "active",
      label: "적극항로형",
      score: 6,
      answers,
      evidence: expect.arrayContaining([
        expect.stringContaining("일부를 줄인 뒤"),
        expect.stringContaining("큰 변동"),
        expect.stringContaining("준비 시점과 금액"),
      ]),
    });
  });

  it.each([
    [{ Q1: "A", Q2: "A", Q3: "A" }, "안정항로형", 0],
    [{ Q1: "D", Q2: "D", Q3: "D" }, "도전항로형", 9],
  ] as const)("최소·최대 응답을 계산한다", (answers, label, score) => {
    expect(calculateQuickRiskResult(answers)).toMatchObject({ label, score });
  });

  it.each(["finance", "dev", "marketing", "plain"] as const)(
    "설명 분야 %s는 동일한 위험성향 답변의 점수를 바꾸지 않는다",
    (explanationDomain) => {
      const answers: CompletedQuickDiagnosisAnswers = {
        Q1: "B",
        Q2: "C",
        Q3: "B",
      };
      const draft = { explanationDomain, quickAnswers: answers };

      expect(calculateQuickRiskResult(draft.quickAnswers).score).toBe(4);
    },
  );
});
