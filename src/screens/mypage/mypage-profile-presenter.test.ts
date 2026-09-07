import { describe, expect, it } from "vitest";
import type { SettingsView } from "../../types/mypage";
import { calculateQuickRiskResult } from "../initial-setup/risk-diagnosis";
import {
  createProfilePreferencesViewModel,
  createServerDiagnosisSummary,
} from "./mypage-profile-presenter";

const SETTINGS: Pick<SettingsView, "explainDomain" | "explainLevel"> = {
  explainLevel: "detailed",
  explainDomain: "plain",
};

const quickResult = calculateQuickRiskResult({ Q1: "B", Q2: "B", Q3: "B" });

describe("mypage profile presenter", () => {
  it("현재 세션 설정을 서버 설정보다 우선한다", () => {
    expect(
      createProfilePreferencesViewModel(
        SETTINGS,
        { explanationDomain: "dev", explanationLevel: "analytical" },
        { status: "unmeasured" },
      ),
    ).toEqual({
      explanationDomain: "dev",
      explanationDomainLabel: "개발·기술",
      explanationLevel: "analytical",
      explanationLevelLabel: "지표와 한계까지",
      sourceLabel: "이번 설정에서 선택한 값을 보여드려요.",
    });
  });

  it.each([
    ["finance", "금융·경제"],
    ["dev", "개발·기술"],
    ["marketing", "마케팅·브랜드"],
    ["plain", "일상적인 설명"],
    ["unknown", "일상적인 설명"],
  ])("서버 설명 분야 %s를 사용자 표시값으로 바꾼다", (domain, label) => {
    const model = createProfilePreferencesViewModel(
      { ...SETTINGS, explainDomain: domain },
      {},
      { status: "unmeasured" },
    );
    expect(model.explanationDomainLabel).toBe(label);
    expect(model.sourceLabel).toBe("계정에 저장된 설명 설정을 보여드려요.");
  });

  it.each([
    ["simple", "핵심만 쉽게"],
    ["analytical", "지표와 한계까지"],
    ["detailed", "이유와 근거까지"],
  ])("서버 설명 수준 %s를 사용자 표시값으로 바꾼다", (level, label) => {
    expect(
      createProfilePreferencesViewModel(
        { ...SETTINGS, explainLevel: level },
        {},
        { status: "quickComplete", quickResult },
      ).explanationLevelLabel,
    ).toBe(label);
  });

  it("Q5 답변을 서버 설명 수준보다 우선하고 미응답 상태는 서버 값을 쓴다", () => {
    expect(
      createProfilePreferencesViewModel(SETTINGS, {}, {
        status: "detailInProgress",
        quickResult,
        detailedAnswers: { Q4: "A" },
      }).explanationLevelLabel,
    ).toBe("이유와 근거까지");

    expect(
      createProfilePreferencesViewModel(SETTINGS, {}, {
        status: "detailComplete",
        quickResult,
        detailedAnswers: { Q4: "A", Q5: "A", Q6: "B" },
      }).explanationLevelLabel,
    ).toBe("핵심만 쉽게");
  });

  it.each([
    ["stable", "안정항로형"],
    ["balanced", "균형항로형"],
    ["active", "적극항로형"],
    ["challenge", "도전항로형"],
    ["challenger", "도전항로형"],
    ["안정형", "안정항로형"],
    ["균형형", "균형항로형"],
    ["적극형", "적극항로형"],
    ["도전형", "도전항로형"],
    [" 안정항로형 ", "안정항로형"],
    ["균형항로형", "균형항로형"],
    ["적극항로형", "적극항로형"],
    ["도전항로형", "도전항로형"],
    ["unknown", "기존 진단 결과"],
  ])("서버 위험성향 %s를 %s로 안전하게 표시한다", (value, expected) => {
    const result = createServerDiagnosisSummary(value);
    expect(result.displayName).toBe(expected);
    expect(result.description).toContain("계정에 저장된 진단 결과");
  });
});
