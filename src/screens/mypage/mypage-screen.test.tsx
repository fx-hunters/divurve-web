import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import { writeDiagnosisProgress } from "../../api/diagnosis-progress-store";
import {
  readProfilePreferences,
  writeProfilePreferences,
} from "../../api/profile-preferences-store";
import type { MyPageBundle } from "../../api/generated/divurve-api";
import {
  MY_PAGE_API_FIXTURE,
  MY_PAGE_SETTINGS_FIXTURE,
} from "../../test/api-fixtures";
import { calculateQuickRiskResult } from "../initial-setup/risk-diagnosis";
import { MyPageScreen } from "./mypage-screen";
import type { MyPageDependencies } from "./use-mypage";

function makeDependencies(
  overrides: Partial<MyPageDependencies> = {},
): MyPageDependencies {
  return {
    load: vi.fn().mockResolvedValue(MY_PAGE_API_FIXTURE),
    saveSettings: vi.fn().mockResolvedValue(MY_PAGE_SETTINGS_FIXTURE),
    ...overrides,
  };
}

const quickResult = calculateQuickRiskResult({
  Q1: "B",
  Q2: "B",
  Q3: "B",
});

describe("MyPageScreen", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("실제 API 프로필과 서버 진단을 출처가 구분된 사용자 문구로 표시한다", async () => {
    render(<MyPageScreen dependencies={makeDependencies()} />);

    // 서버를 기다리는 동안에도 바로가기 카드는 그대로 눌린다.
    expect(
      screen.getByRole("button", { name: /자산 내역 편집/ }),
    ).toBeEnabled();
    expect(
      screen.getByText(/마이페이지를 불러오는 중입니다/),
    ).toBeInTheDocument();

    expect(await screen.findByText("플래너 사용자")).toBeInTheDocument();
    expect(screen.getByText("planner@example.com")).toBeInTheDocument();
    expect(screen.getByText("내 계정")).toBeInTheDocument();
    expect(screen.getByText("균형항로형")).toBeInTheDocument();
    expect(screen.getByText("서버 결과")).toBeInTheDocument();
    expect(screen.getByText("서버 점수 4")).toBeInTheDocument();
    expect(screen.getByText(/진단일 2026/)).toBeInTheDocument();
    expect(screen.getByText(/해커톤 MVP용 가설/)).toBeInTheDocument();
    expect(
      screen.getByText("목표 구간에 가까워지고 있어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "미국 대학원 학비 목표가 목표 금액의 약 70%에 도달했습니다.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/새 알림/)).toBeInTheDocument();

    expect(screen.getByLabelText("익숙한 설명 분야")).toHaveDisplayValue(
      "일상적인 설명",
    );
    expect(screen.getByLabelText("설명 수준")).toHaveDisplayValue(
      "핵심만 쉽게",
    );
    expect(screen.queryByText("plain")).not.toBeInTheDocument();
    expect(screen.queryByText("simple")).not.toBeInTheDocument();
    expect(screen.queryByText("주거래 은행 우대율")).not.toBeInTheDocument();
    expect(screen.queryByText(/실효 스프레드/)).not.toBeInTheDocument();
  });

  it("현재 세션의 상세 결과와 설명 설정을 서버 표시값보다 우선한다", async () => {
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
    const dependencies = makeDependencies();

    render(
      <MyPageScreen
        dependencies={dependencies}
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
    expect(dependencies.saveSettings).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("설명 수준"), {
      target: { value: "analytical" },
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it.each([
    ["quickComplete", "상세 진단 시작"],
    ["detailInProgress", "상세 진단 이어서"],
  ] as const)("%s 상태에서 상세 진단을 시작하거나 재개한다", async (status, label) => {
    writeDiagnosisProgress(
      status === "quickComplete"
        ? { status, quickResult }
        : {
            status,
            quickResult,
            detailedAnswers: { Q4: "A" },
          },
    );
    const onStartDetailedDiagnosis = vi.fn();
    render(
      <MyPageScreen
        dependencies={makeDependencies()}
        onStartDetailedDiagnosis={onStartDetailedDiagnosis}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: label }));
    expect(onStartDetailedDiagnosis).toHaveBeenCalledTimes(1);
  });

  it("미측정 데모 계정은 로그인과 빈 상태를 표시하고 진단을 강제하지 않는다", async () => {
    const demoBundle: MyPageBundle = {
      ...MY_PAGE_API_FIXTURE,
      profile: { ...MY_PAGE_API_FIXTURE.profile, isDemo: true },
      riskProfile: {
        status: "not_measured",
        simple: { answers: {} },
        detail: { completed: false, answered: {} },
      },
      notifications: { notifications: [] },
    };
    const onLogin = vi.fn();

    render(
      <MyPageScreen
        dependencies={makeDependencies({
          load: vi.fn().mockResolvedValue(demoBundle),
        })}
        onLogin={onLogin}
      />,
    );

    expect(await screen.findByText("데모 계정")).toBeInTheDocument();
    expect(
      screen.getByText("아직 참고 진단을 시작하지 않았어요"),
    ).toBeInTheDocument();
    expect(screen.getByText("새 알림이 없습니다.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "간편 진단 시작" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it("로컬·서버 진단이 모두 없으면 간편 진단 시작 동작을 제공한다", async () => {
    const onStartQuickDiagnosis = vi.fn();
    render(
      <MyPageScreen
        dependencies={makeDependencies({
          load: vi.fn().mockResolvedValue({
            ...MY_PAGE_API_FIXTURE,
            riskProfile: null,
          }),
        })}
        onStartQuickDiagnosis={onStartQuickDiagnosis}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "간편 진단 시작" }),
    );
    expect(onStartQuickDiagnosis).toHaveBeenCalledTimes(1);
  });

  it("알림 변경값을 실제 설정 API 어댑터에 저장하고 응답을 반영한다", async () => {
    const dependencies = makeDependencies();
    render(<MyPageScreen dependencies={dependencies} />);

    const targetZone = await screen.findByRole("checkbox", {
      name: "목표 구간 도달 안내",
    });
    expect(targetZone).not.toBeChecked();
    fireEvent.click(targetZone);
    fireEvent.click(screen.getByRole("button", { name: "알림 설정 저장" }));

    expect(dependencies.saveSettings).toHaveBeenCalledWith({
      notifyStepDue: true,
      notifyRegimeShift: true,
      notifyDeadlineNear: true,
      notifyTargetZone: true,
      notifyConcentration: true,
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "서버에 저장했습니다",
    );
  });

  it("설정 저장 오류를 표시한다", async () => {
    render(
      <MyPageScreen
        dependencies={makeDependencies({
          saveSettings: vi
            .fn()
            .mockRejectedValue(new ApiError("설정 저장 실패", 500, "SERVER")),
        })}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "알림 설정 저장" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "설정 저장 실패",
    );
  });

  it("조회 오류를 표시하고 다시 시도한다", async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("프로필 API 오류", 500, "SERVER"))
      .mockResolvedValueOnce(MY_PAGE_API_FIXTURE);
    render(<MyPageScreen dependencies={makeDependencies({ load })} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "프로필 API 오류",
    );
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(
      await screen.findByRole("region", { name: "마이페이지" }),
    ).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("바로가기와 로그아웃·투어 콜백을 연결한다", async () => {
    const onNavigate = vi.fn();
    const onLogout = vi.fn();
    const onStartTour = vi.fn();
    render(
      <MyPageScreen
        dependencies={makeDependencies()}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onStartTour={onStartTour}
      />,
    );

    await screen.findByText("플래너 사용자");
    fireEvent.click(screen.getByRole("button", { name: /자산 내역 편집/ }));
    fireEvent.click(screen.getByRole("button", { name: /외화 목표 편집/ }));
    fireEvent.click(
      screen.getByRole("button", { name: /가이드 투어 다시보기/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(onNavigate).toHaveBeenNthCalledWith(1, "assets");
    expect(onNavigate).toHaveBeenNthCalledWith(2, "planner");
    expect(onStartTour).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("선택 콜백이 없어도 회원·데모 보조 버튼을 안전하게 생략한다", async () => {
    const { unmount } = render(
      <MyPageScreen dependencies={makeDependencies()} />,
    );
    await screen.findByText("플래너 사용자");
    expect(
      screen.queryByRole("button", { name: "로그아웃" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /자산 내역 편집/ }));
    fireEvent.click(screen.getByRole("button", { name: /외화 목표 편집/ }));

    unmount();
    render(
      <MyPageScreen
        dependencies={makeDependencies({
          load: vi.fn().mockResolvedValue({
            ...MY_PAGE_API_FIXTURE,
            profile: { ...MY_PAGE_API_FIXTURE.profile, isDemo: true },
          }),
        })}
      />,
    );
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "로그인" }),
      ).not.toBeInTheDocument();
    });
  });

  it("읽은 알림에는 새 알림 문구를 붙이지 않는다", async () => {
    render(
      <MyPageScreen
        dependencies={makeDependencies({
          load: vi.fn().mockResolvedValue({
            ...MY_PAGE_API_FIXTURE,
            notifications: {
              notifications: [
                {
                  id: "read-notice",
                  kind: "step_due",
                  title: "지난 회차 안내",
                  body: "이미 확인한 알림입니다.",
                  createdAt: "2026-09-01T00:00:00Z",
                  isRead: true,
                },
              ],
            },
          }),
        })}
      />,
    );

    expect(await screen.findByText("지난 회차 안내")).toBeInTheDocument();
    expect(screen.queryByText(/새 알림/)).not.toBeInTheDocument();
  });
});
