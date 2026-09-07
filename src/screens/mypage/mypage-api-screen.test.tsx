import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import { writeDiagnosisProgress } from "../../api/diagnosis-progress-store";
import {
  readProfilePreferences,
  writeProfilePreferences,
} from "../../api/profile-preferences-store";
import {
  MY_PAGE_API_FIXTURE,
  MY_PAGE_SETTINGS_FIXTURE,
} from "../../test/api-fixtures";
import { calculateQuickRiskResult } from "../initial-setup/risk-diagnosis";
import { MyPageApiScreen } from "./mypage-api-screen";
import { MyPageScreen } from "./mypage-screen";
import type { MyPageApiDependencies } from "./use-mypage-api";

function makeDependencies(
  overrides: Partial<MyPageApiDependencies> = {},
): MyPageApiDependencies {
  return {
    load: vi.fn().mockResolvedValue(MY_PAGE_API_FIXTURE),
    saveSettings: vi.fn().mockResolvedValue(MY_PAGE_SETTINGS_FIXTURE),
    ...overrides,
  };
}

const quickResult = calculateQuickRiskResult({ Q1: "B", Q2: "B", Q3: "B" });

describe("MyPageApiScreen", () => {
  beforeEach(() => sessionStorage.clear());

  it("서버 결과와 설정을 사용자용 표시값으로 바꾸고 보조 행동을 연결한다", async () => {
    const deps = makeDependencies();
    const onNavigate = vi.fn();
    const onStartTour = vi.fn();
    const onLogout = vi.fn();
    const onStartQuickDiagnosis = vi.fn();
    render(
      <MyPageApiScreen
        dependencies={deps}
        onNavigate={onNavigate}
        onStartTour={onStartTour}
        onLogout={onLogout}
        onStartQuickDiagnosis={onStartQuickDiagnosis}
      />,
    );

    expect(screen.getByText("사용자 설정을 불러오는 중입니다")).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "마이페이지" })).toBeInTheDocument();
    expect(screen.getByText("회원 계정")).toBeInTheDocument();
    expect(screen.getByText("플래너 사용자")).toBeInTheDocument();
    expect(screen.getByText("균형항로형")).toBeInTheDocument();
    expect(screen.getByText("서버 결과")).toBeInTheDocument();
    expect(screen.queryByText("balanced")).not.toBeInTheDocument();
    expect(screen.getByLabelText("익숙한 설명 분야")).toHaveDisplayValue(
      "일상적인 설명",
    );
    expect(screen.getByLabelText("설명 수준")).toHaveDisplayValue("핵심만 쉽게");
    expect(screen.queryByText("plain")).not.toBeInTheDocument();
    expect(screen.queryByText("simple")).not.toBeInTheDocument();
    expect(screen.queryByText(/환전 우대율 API 값/)).not.toBeInTheDocument();
    expect(screen.queryByText(/실효 스프레드/)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "간편 진단 다시 하기" }),
    );
    expect(onStartQuickDiagnosis).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("익숙한 설명 분야"), {
      target: { value: "finance" },
    });
    fireEvent.change(screen.getByLabelText("설명 수준"), {
      target: { value: "reasoned" },
    });
    fireEvent.click(screen.getByRole("button", { name: "설명 설정 반영" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "이번 접속의 설명 설정에 반영했어요",
    );
    expect(readProfilePreferences()).toEqual({
      explanationDomain: "finance",
      explanationLevel: "reasoned",
    });
    expect(deps.saveSettings).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("설명 수준"), {
      target: { value: "analytical" },
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "자산 내역 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "외화 목표 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "가이드 투어 다시보기" }));
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(onNavigate).toHaveBeenNthCalledWith(1, "assets");
    expect(onNavigate).toHaveBeenNthCalledWith(2, "planner");
    expect(onStartTour).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("초기 설명 분야와 Q5 설명 수준을 현재 세션에서 우선 표시한다", async () => {
    writeProfilePreferences({
      explanationDomain: "marketing",
      explanationLevel: "analytical",
    });
    writeDiagnosisProgress({
      status: "detailComplete",
      quickResult,
      detailedAnswers: { Q4: "B", Q5: "C", Q6: "B" },
    });
    const onViewDetailedDiagnosis = vi.fn();
    const onRestartDiagnosis = vi.fn();
    render(
      <MyPageApiScreen
        dependencies={makeDependencies()}
        onViewDetailedDiagnosis={onViewDetailedDiagnosis}
        onRestartDiagnosis={onRestartDiagnosis}
      />,
    );

    expect(await screen.findByText("상세 진단 완료")).toBeInTheDocument();
    expect(screen.getAllByText("균형항로형")).toHaveLength(2);
    expect(screen.getByLabelText("상세 진단 설명")).toHaveTextContent(
      "생활비와 일부 함께 관리",
    );
    expect(screen.getByLabelText("익숙한 설명 분야")).toHaveDisplayValue(
      "마케팅·브랜드",
    );
    expect(screen.getByLabelText("설명 수준")).toHaveDisplayValue(
      "지표와 한계까지",
    );
    fireEvent.click(screen.getByRole("button", { name: "상세 결과 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "다시 진단" }));
    expect(onViewDetailedDiagnosis).toHaveBeenCalledTimes(1);
    expect(onRestartDiagnosis).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["quickComplete", "상세 진단 시작"],
    ["detailInProgress", "상세 진단 이어서"],
  ] as const)("%s 상태에서 상세 진단 행동을 제공한다", async (status, label) => {
    writeDiagnosisProgress(
      status === "quickComplete"
        ? { status, quickResult }
        : { status, quickResult, detailedAnswers: { Q4: "A" } },
    );
    const onStartDetailedDiagnosis = vi.fn();
    render(
      <MyPageApiScreen
        dependencies={makeDependencies()}
        onStartDetailedDiagnosis={onStartDetailedDiagnosis}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: label }));
    expect(onStartDetailedDiagnosis).toHaveBeenCalledTimes(1);
  });

  it("미진단·빈 알림·데모 계정을 표시하며 콜백은 생략할 수 있다", async () => {
    render(
      <MyPageApiScreen
        dependencies={makeDependencies({
          load: vi.fn().mockResolvedValue({
            ...MY_PAGE_API_FIXTURE,
            profile: { ...MY_PAGE_API_FIXTURE.profile, isDemo: true },
            riskProfile: null,
            notifications: { notifications: [] },
          }),
        })}
      />,
    );
    expect(await screen.findByText("데모 계정")).toBeInTheDocument();
    expect(screen.getByText("아직 참고 진단을 시작하지 않았어요")).toBeInTheDocument();
    expect(screen.getByText("새 알림이 없습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument();
  });

  it("조회 오류를 다시 시도한다", async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("프로필 API 오류", 500, "SERVER"))
      .mockResolvedValueOnce(MY_PAGE_API_FIXTURE);
    render(<MyPageApiScreen dependencies={makeDependencies({ load })} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("프로필 API 오류");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("region", { name: "마이페이지" })).toBeInTheDocument();
  });

  it("상위 화면의 회원 모드 분기를 사용한다", async () => {
    render(<MyPageScreen isDemo={false} apiDependencies={makeDependencies()} />);
    expect(await screen.findByRole("region", { name: "마이페이지" })).toBeInTheDocument();
    expect(screen.getByText("회원 계정")).toBeInTheDocument();
  });
});
