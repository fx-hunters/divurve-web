import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { calculateQuickRiskResult } from "../initial-setup/risk-diagnosis";
import { DiagnosisResultScreen } from "./diagnosis-result-screen";

const quickResult = calculateQuickRiskResult({ Q1: "C", Q2: "C", Q3: "C" });

describe("DiagnosisResultScreen", () => {
  it("상세 완료 결과를 초기 설정 Shell 없이 읽기 전용으로 표시한다", () => {
    const onBack = vi.fn();
    const onChangeSettings = vi.fn();
    const onRestart = vi.fn();
    render(
      <DiagnosisResultScreen
        progress={{
          status: "detailComplete",
          quickResult,
          detailedAnswers: { Q4: "B", Q5: "A", Q6: "B" },
        }}
        onBack={onBack}
        onChangeSettings={onChangeSettings}
        onRestart={onRestart}
      />,
    );

    expect(screen.getByRole("heading", { name: "적극항로형" })).toBeInTheDocument();
    expect(screen.getByLabelText("상세 진단 설명")).toHaveTextContent(
      "관련 경험이 몇 차례 있어 앞으로는 핵심부터 쉽게 안내드릴게요",
    );
    expect(screen.queryByText("초기 설정")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "초기 설정 마치기" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("답변 반영 기준 보기"));
    expect(screen.getByText("적극항로형 · 6/9점")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "마이페이지로 돌아가기" }));
    fireEvent.click(screen.getByRole("button", { name: "설정 변경" }));
    fireEvent.click(screen.getByRole("button", { name: "다시 진단하기" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onChangeSettings).toHaveBeenCalledTimes(1);
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it.each([
    { status: "unmeasured" } as const,
    { status: "quickComplete", quickResult } as const,
    {
      status: "detailInProgress",
      quickResult,
      detailedAnswers: { Q4: "A" as const },
    } as const,
  ])("상세 완료 전 $status 상태는 복구 경로를 제공한다", (progress) => {
    const onBack = vi.fn();
    render(
      <DiagnosisResultScreen
        progress={progress}
        onBack={onBack}
        onChangeSettings={vi.fn()}
        onRestart={vi.fn()}
      />,
    );
    expect(screen.getByText("상세 결과를 아직 확인할 수 없어요")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "마이페이지로 돌아가기" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
