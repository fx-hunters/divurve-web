import { describe, expect, it } from "vitest";
import { IMPORTED_ASSET_SUMMARY_FIXTURE } from "../../test/api-fixtures";
import { calculateQuickRiskResult } from "./risk-diagnosis";
import {
  addSkippedStep,
  createInitialSetupControllerState,
  firstUnansweredDetailedQuestion,
  omitStepDraft,
  removeSkippedStep,
  toCompletedDetailedAnswers,
  toCompletedQuickAnswers,
} from "./initial-setup-state";

const quickResult = calculateQuickRiskResult({ Q1: "A", Q2: "B", Q3: "C" });

describe("initial setup state helpers", () => {
  it("건너뜀 목록을 중복 없이 추가하고 선택하면 제거한다", () => {
    expect(addSkippedStep([], "assets")).toEqual(["assets"]);
    expect(addSkippedStep(["assets"], "assets")).toEqual(["assets"]);
    expect(removeSkippedStep(["explanationDomain", "assets"], "assets")).toEqual([
      "explanationDomain",
    ]);
  });

  it("완료된 간편·상세 답변만 완성 타입으로 변환한다", () => {
    expect(toCompletedQuickAnswers(undefined)).toBeNull();
    expect(toCompletedQuickAnswers({ Q1: "A", Q2: "B" })).toBeNull();
    expect(toCompletedQuickAnswers({ Q1: "A", Q2: "B", Q3: "C" })).toEqual({
      Q1: "A",
      Q2: "B",
      Q3: "C",
    });
    expect(toCompletedDetailedAnswers(undefined)).toBeNull();
    expect(toCompletedDetailedAnswers({ Q4: "A", Q5: "B" })).toBeNull();
    expect(toCompletedDetailedAnswers({ Q4: "A", Q5: "B", Q6: "C" })).toEqual({
      Q4: "A",
      Q5: "B",
      Q6: "C",
    });
  });

  it("각 단계의 초안만 제거한다", () => {
    const draft = {
      explanationDomain: "dev" as const,
      importedAssets: IMPORTED_ASSET_SUMMARY_FIXTURE,
      quickAnswers: quickResult.answers,
      quickDiagnosis: quickResult,
      detailedAnswers: { Q4: "A" as const },
    };
    expect(omitStepDraft(draft, "explanationDomain")).not.toHaveProperty(
      "explanationDomain",
    );
    expect(omitStepDraft(draft, "assets")).not.toHaveProperty("importedAssets");
    expect(omitStepDraft(draft, "riskProfile")).toEqual({
      explanationDomain: "dev",
      importedAssets: draft.importedAssets,
    });
  });

  it("상세 진단의 첫 미응답 위치를 찾는다", () => {
    expect(firstUnansweredDetailedQuestion(undefined)).toBe(0);
    expect(firstUnansweredDetailedQuestion({ Q4: "A" })).toBe(1);
    expect(firstUnansweredDetailedQuestion({ Q4: "A", Q5: "B", Q6: "C" })).toBe(2);
  });

  it("온보딩과 저장된 상세 진단 상태의 진입 화면을 만든다", () => {
    expect(
      createInitialSetupControllerState("onboarding", { status: "unmeasured" }),
    ).toMatchObject({ currentStepIndex: 0, draft: {}, riskFlow: { kind: "quickQuestion" } });
    expect(
      createInitialSetupControllerState("quickDiagnosis", {
        status: "detailComplete",
        quickResult,
        detailedAnswers: { Q4: "A", Q5: "B", Q6: "C" },
      }),
    ).toMatchObject({
      currentStepIndex: 2,
      draft: {},
      riskFlow: { kind: "quickQuestion", questionIndex: 0 },
    });
    expect(
      createInitialSetupControllerState("detailedDiagnosis", {
        status: "quickComplete",
        quickResult,
      }),
    ).toMatchObject({
      currentStepIndex: 2,
      riskFlow: { kind: "detailQuestion", questionIndex: 0 },
    });
    expect(
      createInitialSetupControllerState("detailedDiagnosis", {
        status: "detailInProgress",
        quickResult,
        detailedAnswers: { Q4: "B" },
      }),
    ).toMatchObject({
      riskFlow: { kind: "detailQuestion", questionIndex: 1 },
      draft: { detailedAnswers: { Q4: "B" } },
    });
    expect(
      createInitialSetupControllerState("detailedDiagnosis", {
        status: "detailComplete",
        quickResult,
        detailedAnswers: { Q4: "A", Q5: "B", Q6: "C" },
      }),
    ).toMatchObject({ riskFlow: { kind: "detailComplete" } });
  });
});
