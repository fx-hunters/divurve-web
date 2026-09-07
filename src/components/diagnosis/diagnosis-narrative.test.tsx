import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { calculateQuickRiskResult } from "../../screens/initial-setup/risk-diagnosis";
import { DiagnosisNarrative } from "./diagnosis-narrative";
import { createDetailedDiagnosisPresentation } from "./diagnosis-presenter";

describe("DiagnosisNarrative", () => {
  it("대표 성향과 상세 맥락을 별도 semantic span으로 렌더링한다", () => {
    const presentation = createDetailedDiagnosisPresentation(
      calculateQuickRiskResult({ Q1: "C", Q2: "C", Q3: "C" }),
      { Q4: "B", Q5: "A", Q6: "B" },
    );
    const { container } = render(
      <DiagnosisNarrative presentation={presentation} />,
    );

    expect(screen.getByLabelText("상세 진단 설명")).toHaveTextContent(
      "변동에도 계획을 이어가는 적극항로형이에요",
    );
    expect(
      container.querySelector('[data-segment="risk-profile"]'),
    ).toHaveTextContent("적극항로형");
    expect(
      container.querySelectorAll('[data-segment="detail-context"]'),
    ).toHaveLength(3);
  });
});
