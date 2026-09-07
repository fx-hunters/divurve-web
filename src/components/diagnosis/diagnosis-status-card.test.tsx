import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DiagnosisProgress } from "../../types/diagnosis";
import { calculateQuickRiskResult } from "../../screens/initial-setup/risk-diagnosis";
import { DiagnosisStatusCard } from "./diagnosis-status-card";
import { getDiagnosisStatusCopy } from "./diagnosis-status-copy";

const quickResult = calculateQuickRiskResult({ Q1: "B", Q2: "B", Q3: "B" });

describe("DiagnosisStatusCard", () => {
  it("미측정 상태에서 간편 진단을 시작한다", () => {
    const onStartQuick = vi.fn();
    render(
      <DiagnosisStatusCard
        progress={{ status: "unmeasured" }}
        onStartQuick={onStartQuick}
      />,
    );
    expect(screen.getByText("미측정")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "간편 진단 시작" }));
    expect(onStartQuick).toHaveBeenCalledTimes(1);
  });

  it("간편 완료와 상세 진행 중을 구분해 상세 진단으로 연결한다", () => {
    const onStartDetailed = vi.fn();
    const { rerender } = render(
      <DiagnosisStatusCard
        progress={{ status: "quickComplete", quickResult }}
        onStartDetailed={onStartDetailed}
      />,
    );
    expect(screen.getByText("간편 진단 완료")).toBeInTheDocument();
    expect(screen.getByText("균형항로형")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "상세 진단 시작" }));

    rerender(
      <DiagnosisStatusCard
        progress={{
          status: "detailInProgress",
          quickResult,
          detailedAnswers: { Q4: "A" },
        }}
        onStartDetailed={onStartDetailed}
      />,
    );
    expect(screen.getByText("상세 진단 진행 중")).toBeInTheDocument();
    expect(screen.getByText("진행 중")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "상세 진단 이어서" }));
    expect(onStartDetailed).toHaveBeenCalledTimes(2);
  });

  it("상세 완료 상태에서 자연어 요약과 결과·재진단 행동을 표시한다", () => {
    const onViewDetailed = vi.fn();
    const onRestart = vi.fn();
    render(
      <DiagnosisStatusCard
        progress={{
          status: "detailComplete",
          quickResult,
          detailedAnswers: { Q4: "B", Q5: "A", Q6: "B" },
        }}
        onViewDetailed={onViewDetailed}
        onRestart={onRestart}
      />,
    );
    expect(screen.getByText("상세 진단 완료")).toBeInTheDocument();
    expect(screen.getByLabelText("상세 진단 설명")).toHaveTextContent(
      "생활비와 일부 함께 관리",
    );
    fireEvent.click(screen.getByRole("button", { name: "상세 결과 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "다시 진단" }));
    expect(onViewDetailed).toHaveBeenCalledTimes(1);
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it("서버 결과만 있으면 출처와 사용자용 명칭을 구분한다", () => {
    const onStartQuick = vi.fn();
    render(
      <DiagnosisStatusCard
        progress={{ status: "unmeasured" }}
        onStartQuick={onStartQuick}
        serverResult={{
          displayName: "균형항로형",
          description: "계정에 저장된 진단 결과입니다.",
        }}
      />,
    );
    expect(screen.getByText("서버 결과")).toBeInTheDocument();
    expect(screen.getByText("균형항로형")).toBeInTheDocument();
    expect(screen.queryByText("balanced")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "간편 진단 다시 하기" }),
    );
    expect(onStartQuick).toHaveBeenCalledTimes(1);
  });

  it("콜백이 없으면 상태만 읽기 전용으로 표시한다", () => {
    const { rerender } = render(
      <DiagnosisStatusCard progress={{ status: "unmeasured" }} />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(
      <DiagnosisStatusCard
        progress={{
          status: "detailComplete",
          quickResult,
          detailedAnswers: { Q4: "A", Q5: "B", Q6: "C" },
        }}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("상태별 사용자 안내 문구를 반환한다", () => {
    const cases: readonly DiagnosisProgress[] = [
      { status: "unmeasured" },
      { status: "quickComplete", quickResult },
      { status: "detailInProgress", quickResult, detailedAnswers: {} },
      {
        status: "detailComplete",
        quickResult,
        detailedAnswers: { Q4: "A", Q5: "A", Q6: "A" },
      },
    ];
    expect(cases.map(getDiagnosisStatusCopy).map((copy) => copy.statusLabel)).toEqual([
      "미측정",
      "간편 진단 완료",
      "상세 진단 진행 중",
      "상세 진단 완료",
    ]);
  });
});
