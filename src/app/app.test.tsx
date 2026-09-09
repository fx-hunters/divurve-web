import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  App,
  shouldShowTour,
  TOUR_STORAGE_KEY,
} from "./app";
import {
  DETAIL_INVITE_DELAY_MS,
  getDetailedDiagnosisInviteDelay,
  getDetailedDiagnosisInviteDelayForEnvironment,
} from "./diagnosis-invite-timing";
import { login, startDemoSession } from "../api/auth";
import { fetchHomeSummary } from "../api/home";
import { ApiError } from "../api/client";
import { readApiSession } from "../api/session";
import { fetchMyPageBundle, updateSettings } from "../api/mypage";
import {
  HOME_SUMMARY_FIXTURE,
  MY_PAGE_API_FIXTURE,
  MY_PAGE_SETTINGS_FIXTURE,
} from "../test/api-fixtures";
import { writeDiagnosisProgress } from "../api/diagnosis-progress-store";
import { calculateQuickRiskResult } from "../screens/initial-setup/risk-diagnosis";

const STANDARD_AUTH_SESSION = {
  accessToken: "access",
  refreshToken: "refresh",
  expiresIn: 1800,
  isDemo: false,
  onboarded: true,
};

vi.mock("../api/auth", () => ({
  login: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn(),
  signup: vi.fn().mockResolvedValue(undefined),
  startDemoSession: vi.fn().mockResolvedValue({
    accessToken: "demo",
    refreshToken: "refresh",
    expiresIn: 1800,
    isDemo: true,
    onboarded: true,
  }),
}));

vi.mock("../api/session", () => ({ readApiSession: vi.fn().mockReturnValue(null) }));

vi.mock("../api/mypage", () => ({
  fetchMyPageBundle: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock("../api/home", () => ({ fetchHomeSummary: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.mocked(login).mockResolvedValue(STANDARD_AUTH_SESSION);
  vi.mocked(readApiSession).mockReturnValue(null);
  vi.mocked(startDemoSession).mockResolvedValue({
    accessToken: "demo",
    refreshToken: "refresh",
    expiresIn: 1800,
    isDemo: true,
    onboarded: true,
  });
  vi.mocked(fetchMyPageBundle).mockResolvedValue(MY_PAGE_API_FIXTURE);
  vi.mocked(updateSettings).mockResolvedValue(MY_PAGE_SETTINGS_FIXTURE);
  vi.mocked(fetchHomeSummary).mockResolvedValue(HOME_SUMMARY_FIXTURE);
});
function submitLogin() {
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  fireEvent.change(screen.getByLabelText("이메일"), {
    target: { value: "user@example.com" },
  });
  fireEvent.change(screen.getByLabelText("비밀번호"), {
    target: { value: "Password123!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
}

function completeQuickInitialSetup() {
  fireEvent.click(screen.getByRole("radio", { name: /금융·경제/ }));
  fireEvent.click(screen.getByRole("button", { name: "다음" }));
  fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
  for (const [label, nextLabel] of [
    [/일부를 줄이고/, "다음 질문"],
    [/작은 변동까지/, "다음 질문"],
    [/여러 번 나누어/, "결과 보기"],
  ] as const) {
    fireEvent.click(screen.getByRole("radio", { name: label }));
    fireEvent.click(screen.getByRole("button", { name: nextLabel }));
  }
  fireEvent.click(screen.getByRole("button", { name: "홈 시작하기" }));
}

describe("shouldShowTour helper", () => {
  it("최초 접속(null)이거나 레거시/비정상 값이면 true를 반환한다", async () => {
    expect(shouldShowTour(null)).toBe(true);
    expect(shouldShowTour("1")).toBe(true);
    expect(shouldShowTour("abc")).toBe(true);
    expect(shouldShowTour("0")).toBe(true);
  });

  it("최근 7일 이내에 투어를 완료한 경우 false를 반환한다", async () => {
    const now = Date.now();
    const recent = (now - 2 * 24 * 60 * 60 * 1000).toString(); // 2일 전
    expect(shouldShowTour(recent, now)).toBe(false);
  });

  it("7일 이상 미접속한(오랜만에 접속한) 유저인 경우 true를 반환한다", async () => {
    const now = Date.now();
    const dormant = (now - 8 * 24 * 60 * 60 * 1000).toString(); // 8일 전
    expect(shouldShowTour(dormant, now)).toBe(true);
  });
});

describe("detailed diagnosis invitation timing", () => {
  it("일반 환경은 홈을 먼저 보여주고 reduced-motion은 대기하지 않는다", () => {
    expect(getDetailedDiagnosisInviteDelay(false)).toBe(DETAIL_INVITE_DELAY_MS);
    expect(getDetailedDiagnosisInviteDelay(true)).toBe(0);
    expect(getDetailedDiagnosisInviteDelayForEnvironment({})).toBe(
      DETAIL_INVITE_DELAY_MS,
    );
    expect(
      getDetailedDiagnosisInviteDelayForEnvironment({
        matchMedia: () => ({ matches: true }),
      }),
    ).toBe(0);
  });
});

describe("App", () => {
  it("데모 계획 상세 URL과 플래너 복귀·재진입을 History에 동기화한다", async () => {
    const demoSession = {
      ...STANDARD_AUTH_SESSION,
      isDemo: true,
    };
    vi.mocked(readApiSession).mockReturnValue(demoSession);
    window.history.replaceState(
      null,
      "",
      "/route/demo/goals/usd-etf-recurring-demo/plans/usd-etf-recurring-demo",
    );
    render(<App ensureSession={async () => demoSession} />);

    expect(
      await screen.findByRole("heading", { name: "미국 ETF 정기 투자" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "← 내 계획" }));
    expect(window.location.pathname).toBe("/route");

    fireEvent.click(await screen.findByRole("button", { name: /미국 ETF 정기 투자/ }));
    fireEvent.click(screen.getByRole("button", { name: "선택한 목표 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "전체 계획 상세 보기" }));
    expect(window.location.pathname).toBe(
      "/route/demo/goals/usd-etf-recurring-demo/plans/usd-etf-recurring-demo",
    );
  });

  it("초기에 랜딩 페이지를 렌더링하고, 대시보드 시작하기 클릭 시 온보딩 투어가 표시된다", async () => {
    render(<App />);
    expect(screen.getByText("가장 지능적인 환전 가이드")).toBeInTheDocument();

    // 랜딩 페이지에서 테마 토글 버튼 클릭 (다크 -> 라이트 -> 다크)
    const landingThemeBtn = screen.getByRole("button", { name: "테마 전환" });
    fireEvent.click(landingThemeBtn);
    fireEvent.click(landingThemeBtn);

    const startBtn = screen.getAllByRole("button", { name: /무료로 시작하기/ })[0];
    fireEvent.click(startBtn);
    await screen.findByRole("heading", { name: "DIVURVE" });

    // 온보딩 웰컴 모달 표시 확인
    expect(screen.getByRole("dialog", { name: "온보딩 웰컴" })).toBeInTheDocument();

    // 투어 시작하기 클릭 -> onNavigate("home") 호출 및 STEP 1 렌더링
    const startTourBtn = screen.getByRole("button", { name: /투어 시작하기/ });
    fireEvent.click(startTourBtn);

    // STEP 1 툴팁이 렌더링될 때까지 대기 후 건너뛰기(투어 종료) 클릭
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "투어 종료" })).toBeInTheDocument();
    });
    const skipBtn = screen.getByRole("button", { name: "투어 종료" });
    fireEvent.click(skipBtn);

    expect(Number(localStorage.getItem(TOUR_STORAGE_KEY))).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "DIVURVE" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "오늘의 핵심" }),
    ).toBeInTheDocument();
  });

  it("localStorage에 최근 투어 완료 기록이 있으면 투어를 띄우지 않고 즉시 대시보드로 진입한다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    render(<App />);

    const startBtn = screen.getAllByRole("button", { name: /무료로 시작하기/ })[0];
    fireEvent.click(startBtn);
    await screen.findByRole("heading", { name: "DIVURVE" });

    expect(screen.queryByRole("dialog", { name: "온보딩 웰컴" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "DIVURVE" })).toBeInTheDocument();
  });

  it("오랜만에 접속한 유저(7일 초과)는 대시보드 진입 시 투어가 다시 표시된다", async () => {
    const eightDaysAgo = (Date.now() - 8 * 24 * 60 * 60 * 1000).toString();
    localStorage.setItem(TOUR_STORAGE_KEY, eightDaysAgo);
    render(<App />);

    const startBtn = screen.getAllByRole("button", { name: /무료로 시작하기/ })[0];
    fireEvent.click(startBtn);
    await screen.findByRole("heading", { name: "DIVURVE" });

    expect(screen.getByRole("dialog", { name: "온보딩 웰컴" })).toBeInTheDocument();
  });

  it("localStorage 접근 에러가 발생해도 안전하게 투어를 표시하고 종료할 수 있다", async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    render(<App />);
    const startBtn = screen.getAllByRole("button", { name: /무료로 시작하기/ })[0];
    fireEvent.click(startBtn);
    await screen.findByRole("heading", { name: "DIVURVE" });

    expect(screen.getByRole("dialog", { name: "온보딩 웰컴" })).toBeInTheDocument();

    const skipBtn = screen.getByRole("button", { name: "건너뛰기" });
    fireEvent.click(skipBtn);

    expect(screen.getByRole("heading", { name: "DIVURVE" })).toBeInTheDocument();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it("사이드바 탭 클릭 시 해당 화면으로 전환된다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    render(<App />);

    // 랜딩 페이지 -> 대시보드 진입
    const startBtn = screen.getAllByRole("button", { name: /무료로 시작하기/ })[0];
    fireEvent.click(startBtn);
    await screen.findByRole("heading", { name: "DIVURVE" });

    // 환전 플래너 탭으로 이동
    const plannerBtns = screen.getAllByRole("button", { name: /환전 플래너/ });
    fireEvent.click(plannerBtns[0]);
    expect(
      await screen.findByRole("heading", {
        name: "어떤 외화 목표를 이어갈까요?",
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/route");

    // 내 자산 탭으로 이동
    const assetsBtns = screen.getAllByRole("button", { name: /내 자산/ });
    fireEvent.click(assetsBtns[0]);
    expect(screen.getByRole("heading", { name: "내 자산", level: 2 })).toBeInTheDocument();

    // 환율 전망 탭으로 이동
    const rangeBtns = screen.getAllByRole("button", { name: /환율 전망/ });
    fireEvent.click(rangeBtns[0]);
    expect(screen.getByRole("heading", { name: "환율 전망", level: 2 })).toBeInTheDocument();

    // 마이페이지 탭으로 이동
    const mypageBtns = screen.getAllByRole("button", { name: /마이페이지/ });
    fireEvent.click(mypageBtns[0]);
    expect(screen.getByRole("heading", { name: "마이페이지", level: 2 })).toBeInTheDocument();
  });

  it("헤더의 마이페이지 아바타 버튼 클릭 시 마이페이지로 이동한다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    render(<App />);
    const startBtn = screen.getAllByRole("button", { name: /무료로 시작하기/ })[0];
    fireEvent.click(startBtn);
    await screen.findByRole("heading", { name: "DIVURVE" });

    const avatarBtn = screen.getByRole("button", { name: "마이페이지 이동" });
    fireEvent.click(avatarBtn);
    expect(screen.getByRole("heading", { name: "마이페이지", level: 2 })).toBeInTheDocument();
    expect(
      await screen.findByRole("region", { name: "마이페이지" }),
    ).toBeInTheDocument();
  });

  it("세션이 없으면 데모 계정을 발급받아 데모 배지와 테마 토글을 표시한다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: /무료로 시작하기/ })[0]);
    await screen.findByRole("heading", { name: "DIVURVE" });

    expect(await screen.findByText("데모 계정")).toBeInTheDocument();
    expect(startDemoSession).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "로그인하고 내 자산 보기" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /라이트 모드로 변경/ }));
    expect(screen.getByRole("button", { name: /다크 모드로 변경/ })).toBeInTheDocument();
  });

  it("회원 계정 세션에서는 내 계정 배지를 표시하고 데모 발급을 하지 않는다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    vi.mocked(readApiSession).mockReturnValue(STANDARD_AUTH_SESSION);
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: /무료로 시작하기/ })[0]);
    await screen.findByRole("heading", { name: "DIVURVE" });

    expect(await screen.findByText("내 계정")).toBeInTheDocument();
    expect(startDemoSession).not.toHaveBeenCalled();
  });

  it("모바일 하단 내비게이션 탭 클릭 시 화면이 전환된다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    render(<App />);
    const startBtn = screen.getAllByRole("button", { name: /무료로 시작하기/ })[0];
    fireEvent.click(startBtn);
    await screen.findByRole("heading", { name: "DIVURVE" });

    const mobileNav = screen.getByRole("navigation", { name: "모바일 하단 내비게이션" });
    const mobilePlannerBtn = mobileNav.querySelector("button:nth-child(2)");
    if (mobilePlannerBtn) {
      fireEvent.click(mobilePlannerBtn);
      expect(
        await screen.findByRole("heading", {
          name: "어떤 외화 목표를 이어갈까요?",
          level: 2,
        }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe("/route");
    }
  });

  it("홈 탭은 계정 종류와 무관하게 서버 요약을 표시한다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    vi.mocked(readApiSession).mockReturnValue(STANDARD_AUTH_SESSION);
    render(<App />);
    fireEvent.click(
      screen.getAllByRole("button", { name: /무료로 시작하기/ })[0],
    );
    await screen.findByRole("heading", { name: "DIVURVE" });

    expect(
      await screen.findByRole("heading", { name: "오늘의 핵심" }),
    ).toBeInTheDocument();
  });

  it("회원 계정의 플래너 탭은 Swagger 화면을 렌더링한다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    vi.mocked(readApiSession).mockReturnValue(STANDARD_AUTH_SESSION);
    render(<App />);
    fireEvent.click(
      screen.getAllByRole("button", { name: /무료로 시작하기/ })[0],
    );
    await screen.findByRole("heading", { name: "DIVURVE" });
    await screen.findByRole("heading", { name: "오늘의 핵심" });

    fireEvent.click(screen.getAllByRole("button", { name: "환전 플래너" })[0]);

    expect(await screen.findByText(/플래너를 불러오/)).toBeInTheDocument();
  });

  it.each([
    [new ApiError("데모 인증 API 오류", 500, "SERVER"), "데모 인증 API 오류"],
    [
      new Error("network"),
      "체험 데이터를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    ],
  ])("세션 발급 오류를 화면에 표시한다", async (error, message) => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    vi.mocked(startDemoSession).mockRejectedValue(error);
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: /무료로 시작하기/ })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("세션 발급 실패 후 다시 시도하면 대시보드로 진입한다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    vi.mocked(startDemoSession)
      .mockRejectedValueOnce(new ApiError("데모 인증 API 오류", 500, "SERVER"))
      .mockResolvedValueOnce({
        accessToken: "demo",
        refreshToken: "refresh",
        expiresIn: 1800,
        isDemo: true,
        onboarded: true,
      });
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: /무료로 시작하기/ })[0]);
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("데모 계정")).toBeInTheDocument();
  });

  it("/route 직접 진입 시 랜딩을 거치지 않고 플래너 첫 화면을 렌더링한다", async () => {
    window.history.replaceState(null, "", "/route");

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "어떤 외화 목표를 이어갈까요?",
      }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/route");
  });

  it("온보딩 투어 진행 중 다음 단계 이동 시 해당 탭으로 화면이 자동 전환된다", async () => {
    render(<App />);
    const startBtn = screen.getAllByRole("button", { name: /무료로 시작하기/ })[0];
    fireEvent.click(startBtn);
    await screen.findByRole("heading", { name: "DIVURVE" });

    // 투어 시작하기 (Step 0 -> Step 1: home)
    const startTourBtn = screen.getByRole("button", { name: /투어 시작하기/ });
    fireEvent.click(startTourBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "다음" })).toBeInTheDocument();
    });

    // Step 1 -> Step 2: range
    const nextBtn = screen.getByRole("button", { name: "다음" });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "환율 전망", level: 2 })).toBeInTheDocument();
    });
  });

  it("랜딩 페이지에서 로그인 버튼 클릭 시 AuthPage 로그인 탭으로 이동하고 홈으로 돌아갈 수 있다", async () => {
    render(<App />);

    const loginBtn = screen.getByRole("button", { name: "로그인" });
    fireEvent.click(loginBtn);

    // AuthPage 로그인 폼 노출 확인
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();

    // 홈으로 돌아가기 클릭
    const backBtn = screen.getAllByRole("button", { name: /홈/ })[0];
    fireEvent.click(backBtn);

    expect(screen.getByText("가장 지능적인 환전 가이드")).toBeInTheDocument();
  });

  it("로그인 폼을 실제 인증 어댑터와 연결한다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    fireEvent.change(screen.getByLabelText("이메일"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith(
        { email: "user@example.com", password: "Password123!" },
        "session",
      ),
    );
    expect(await screen.findByRole("heading", { name: "DIVURVE" })).toBeInTheDocument();
  });

  it("로그인 결과가 onboarded=false이면 초기 설정 경로로 이동한다", async () => {
    const initialSetupSession = {
      ...STANDARD_AUTH_SESSION,
      onboarded: false,
    };
    vi.mocked(login).mockResolvedValue(initialSetupSession);
    render(<App />);

    submitLogin();

    expect(
      await screen.findByRole("heading", {
        name: "어떤 분야의 설명이 가장 익숙한가요?",
      }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/initial-setup");
    expect(screen.queryByRole("heading", { name: "DIVURVE" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    fireEvent.click(
      screen.getByRole("button", { name: "진단 건너뛰고 홈으로" }),
    );

    expect(
      await screen.findByRole("heading", { name: "DIVURVE" }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/dashboard");
    expect(screen.queryByRole("dialog", { name: "온보딩 웰컴" })).not.toBeInTheDocument();
  });

  it("회원 마이페이지에서 저장된 간편 결과로 상세 진단을 시작하고 History와 동기화한다", async () => {
    const quickResult = calculateQuickRiskResult({ Q1: "B", Q2: "B", Q3: "B" });
    writeDiagnosisProgress({ status: "quickComplete", quickResult });
    window.history.replaceState(null, "", "/mypage");

    render(<App ensureSession={async () => STANDARD_AUTH_SESSION} />);

    expect(await screen.findByRole("region", { name: "마이페이지" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "상세 진단 시작" }));
    expect(window.location.pathname).toBe("/diagnosis/detail");
    expect(screen.getByRole("heading", { name: /생활비나 비상금/ })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "상세 진단 진행률" })).toHaveTextContent("1 / 3");

    window.history.replaceState(null, "", "/mypage");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(await screen.findByRole("region", { name: "마이페이지" })).toBeInTheDocument();

    vi.mocked(readApiSession).mockReturnValue(STANDARD_AUTH_SESSION);
    window.history.replaceState(null, "", "/initial-setup");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(
      await screen.findByRole("heading", {
        name: "어떤 분야의 설명이 가장 익숙한가요?",
      }),
    ).toBeInTheDocument();
  });

  it("간편 진단 완료 뒤 홈을 먼저 보여주고 상세 진단 안내를 한 번만 표시한다", async () => {
    vi.mocked(readApiSession).mockReturnValue(STANDARD_AUTH_SESSION);
    window.history.replaceState(null, "", "/initial-setup");
    render(<App />);

    completeQuickInitialSetup();
    expect(window.location.pathname).toBe("/dashboard");
    expect(
      await screen.findByRole("heading", { name: "오늘의 핵심" }),
    ).toBeInTheDocument();

    const invite = await screen.findByRole("dialog", {
      name: "3문항만 더 답하면",
    });
    expect(invite).toBeInTheDocument();
    expect(screen.getAllByRole("dialog", { name: "3문항만 더 답하면" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "나중에 할게요" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "마이페이지 → 의사결정 프로필에서 언제든 이어갈 수 있어요",
    );
    fireEvent.click(screen.getByRole("button", { name: "확인했어요" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "마이페이지" })[0]!);
    expect(await screen.findByRole("region", { name: "마이페이지" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "상세 진단 시작" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "대시보드" })[0]!);
    expect(
      await screen.findByRole("heading", { name: "오늘의 핵심" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("홈 안내에서 상세 진단을 시작하고 미루면 마이페이지 진행 상태로 돌아간다", async () => {
    vi.mocked(readApiSession).mockReturnValue(STANDARD_AUTH_SESSION);
    window.history.replaceState(null, "", "/initial-setup");
    render(<App />);
    completeQuickInitialSetup();

    await screen.findByRole("heading", { name: "오늘의 핵심" });
    fireEvent.click(
      await screen.findByRole("button", { name: "지금 맞춤 설정하기" }),
    );
    expect(window.location.pathname).toBe("/diagnosis/detail");
    expect(screen.getByRole("heading", { name: /생활비나 비상금/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /일부는 분리/ }));
    fireEvent.click(screen.getByRole("button", { name: "다음 질문" }));
    fireEvent.click(screen.getByRole("button", { name: "나중에 이어서" }));

    expect(window.location.pathname).toBe("/mypage");
    expect(await screen.findByText("상세 진단 진행 중")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "상세 진단 이어서" }));
    expect(screen.getByRole("heading", { name: /어느 정도 깊이/ })).toBeInTheDocument();
  });

  it("상세 진단 완료 후 앱 레이아웃 안의 읽기 전용 결과로 이동한다", async () => {
    const quickResult = calculateQuickRiskResult({ Q1: "C", Q2: "C", Q3: "C" });
    writeDiagnosisProgress({ status: "quickComplete", quickResult });
    vi.mocked(readApiSession).mockReturnValue(STANDARD_AUTH_SESSION);
    window.history.replaceState(null, "", "/mypage");
    render(<App />);

    await screen.findByRole("region", { name: "마이페이지" });
    fireEvent.click(screen.getByRole("button", { name: "상세 진단 시작" }));
    for (const [label, nextLabel] of [
      [/일부는 분리/, "다음 질문"],
      [/핵심만 쉽게/, "다음 질문"],
      [/몇 차례 경험/, "상세 결과 보기"],
    ] as const) {
      fireEvent.click(screen.getByRole("radio", { name: label }));
      fireEvent.click(screen.getByRole("button", { name: nextLabel }));
    }
    fireEvent.click(screen.getByRole("button", { name: "상세 결과 확인하기" }));

    expect(window.location.pathname).toBe("/mypage/diagnosis");
    expect(await screen.findByRole("heading", { name: "적극항로형" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "마이페이지", level: 2 })).toBeInTheDocument();
    expect(screen.queryByText("초기 설정")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "초기 설정 마치기" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "설정 변경" }));
    expect(window.location.pathname).toBe("/mypage");
    expect(await screen.findByRole("region", { name: "마이페이지" })).toBeInTheDocument();
  });

  it("마이페이지에서 간편 진단을 다시 시작하고 결과 뒤 마이페이지로 돌아간다", async () => {
    vi.mocked(readApiSession).mockReturnValue(STANDARD_AUTH_SESSION);
    window.history.replaceState(null, "", "/mypage");
    render(<App />);
    await screen.findByRole("region", { name: "마이페이지" });

    fireEvent.click(
      screen.getByRole("button", { name: "간편 진단 다시 하기" }),
    );
    expect(window.location.pathname).toBe("/diagnosis/quick");
    for (const [label, nextLabel] of [
      [/대부분 줄인다/, "다음 질문"],
      [/변동이 작은 편/, "다음 질문"],
      [/빨리 필요한 금액/, "결과 보기"],
    ] as const) {
      fireEvent.click(screen.getByRole("radio", { name: label }));
      fireEvent.click(screen.getByRole("button", { name: nextLabel }));
    }
    expect(screen.getByRole("heading", { name: /안정항로형/ })).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "마이페이지로 돌아가기" }),
    );
    expect(window.location.pathname).toBe("/mypage");
    expect(await screen.findByText("간편 진단 완료")).toBeInTheDocument();
  });

  it("상세 결과 URL 직접 진입과 브라우저 History 복귀를 지원한다", async () => {
    const quickResult = calculateQuickRiskResult({ Q1: "B", Q2: "B", Q3: "B" });
    writeDiagnosisProgress({
      status: "detailComplete",
      quickResult,
      detailedAnswers: { Q4: "A", Q5: "B", Q6: "C" },
    });
    vi.mocked(readApiSession).mockReturnValue(STANDARD_AUTH_SESSION);
    window.history.replaceState(null, "", "/mypage/diagnosis");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "균형항로형" })).toBeInTheDocument();
    window.history.replaceState(null, "", "/mypage");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(await screen.findByRole("region", { name: "마이페이지" })).toBeInTheDocument();
  });

  it("마이페이지의 상세 결과 보기로 전용 결과 경로를 연다", async () => {
    const quickResult = calculateQuickRiskResult({ Q1: "B", Q2: "B", Q3: "B" });
    writeDiagnosisProgress({
      status: "detailComplete",
      quickResult,
      detailedAnswers: { Q4: "B", Q5: "B", Q6: "B" },
    });
    vi.mocked(readApiSession).mockReturnValue(STANDARD_AUTH_SESSION);
    window.history.replaceState(null, "", "/mypage");
    render(<App />);

    await screen.findByRole("region", { name: "마이페이지" });
    fireEvent.click(screen.getByRole("button", { name: "상세 결과 보기" }));
    expect(window.location.pathname).toBe("/mypage/diagnosis");
    expect(await screen.findByRole("heading", { name: "균형항로형" })).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "마이페이지로 돌아가기" }),
    );
    expect(await screen.findByRole("region", { name: "마이페이지" })).toBeInTheDocument();
  });

  it("데모 사용자는 진단 전용 URL에서도 상세 진단으로 강제되지 않는다", async () => {
    vi.mocked(readApiSession).mockReturnValue({
      ...STANDARD_AUTH_SESSION,
      isDemo: true,
    });
    window.history.replaceState(null, "", "/diagnosis/detail");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "DIVURVE" })).toBeInTheDocument();
    expect(screen.queryByText("상세 진단 1 / 3")).not.toBeInTheDocument();
  });

  it("인증된 사용자가 초기 설정 URL을 다시 열면 입력 화면을 복원한다", async () => {
    vi.mocked(readApiSession).mockReturnValue(STANDARD_AUTH_SESSION);
    window.history.replaceState(null, "", "/initial-setup");

    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "어떤 분야의 설명이 가장 익숙한가요?",
      }),
    ).toBeInTheDocument();
  });

  it("로그인 결과가 onboarded=true이면 홈으로 이동한다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    const onboardedSession = {
      ...STANDARD_AUTH_SESSION,
      onboarded: true,
    };
    vi.mocked(login).mockResolvedValue(onboardedSession);
    render(<App />);

    submitLogin();

    expect(
      await screen.findByRole("heading", { name: "DIVURVE" }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/dashboard");
    expect(screen.queryByText("초기 설정")).not.toBeInTheDocument();
  });

  it("데모 사용자는 onboarded=false여도 초기 설정을 건너뛰고 홈으로 이동한다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    const demoSession = {
      ...STANDARD_AUTH_SESSION,
      isDemo: true,
      onboarded: false,
    };
    vi.mocked(login).mockResolvedValue(demoSession);
    render(<App />);

    submitLogin();

    expect(
      await screen.findByRole("heading", { name: "DIVURVE" }),
    ).toBeInTheDocument();
    expect(screen.getByText("데모 계정")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/dashboard");
  });

  it("랜딩 페이지에서 회원가입 클릭 시 API 회원가입 후 대시보드로 이동한다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    render(<App />);

    const signupBtn = screen.getByRole("button", { name: /회원가입/ });
    fireEvent.click(signupBtn);

    // AuthPage 회원가입 폼 노출 확인
    expect(screen.getByLabelText("이름")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "가입하기" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "홍길동" } });
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "Password123!" } });
    fireEvent.change(screen.getByLabelText("비밀번호 확인"), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByLabelText(/전체 동의/));
    fireEvent.click(screen.getByRole("button", { name: "가입하기" }));

    expect(await screen.findByRole("heading", { name: "DIVURVE" })).toBeInTheDocument();
  });

  it("마이페이지에서 로그아웃 버튼 클릭 시 랜딩 페이지로 복귀한다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    vi.mocked(readApiSession).mockReturnValue(STANDARD_AUTH_SESSION);
    render(<App />);

    // 대시보드 진입
    const startBtn = screen.getAllByRole("button", { name: /무료로 시작하기/ })[0];
    fireEvent.click(startBtn);
    await screen.findByRole("heading", { name: "DIVURVE" });

    // 마이페이지로 이동
    const mypageBtn = screen.getAllByRole("button", { name: /마이페이지/ })[0];
    fireEvent.click(mypageBtn);
    expect(screen.getByRole("heading", { name: "마이페이지", level: 2 })).toBeInTheDocument();

    // 로그아웃 버튼 클릭
    const logoutBtn = await screen.findByRole("button", { name: "로그아웃" });
    fireEvent.click(logoutBtn);

    // 랜딩 페이지로 복귀 확인
    expect(screen.getByText("가장 지능적인 환전 가이드")).toBeInTheDocument();
  });

  it("마이페이지에서 가이드 투어 다시보기 클릭 시 온보딩 투어가 다시 시작된다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    render(<App />);

    // 대시보드 진입
    const startBtn = screen.getAllByRole("button", { name: /무료로 시작하기/ })[0];
    fireEvent.click(startBtn);
    await screen.findByRole("heading", { name: "DIVURVE" });

    // 마이페이지 이동
    const mypageBtn = screen.getAllByRole("button", { name: /마이페이지/ })[0];
    fireEvent.click(mypageBtn);

    // 가이드 투어 다시보기 클릭
    const tourBtn = await screen.findByRole("button", { name: /가이드 투어 다시보기/ });
    fireEvent.click(tourBtn);

    // 온보딩 웰컴 모달 표시 확인
    expect(screen.getByRole("dialog", { name: "온보딩 웰컴" })).toBeInTheDocument();
  });
  it("대시보드 경로로 새로고침해도 랜딩으로 돌아가지 않는다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    window.history.replaceState(null, "", "/dashboard");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "DIVURVE" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("가장 지능적인 환전 가이드"),
    ).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/dashboard");
  });

  it("모르는 경로로 들어오면 대시보드를 보여주고 주소도 대시보드로 맞춘다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    window.history.replaceState(null, "", "/unknown");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "DIVURVE" }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/dashboard");
  });

  it("랜딩의 회원가입 진입과 화면 안 모드 전환을 주소창과 맞춘다", async () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole("button", { name: "회원가입" })[0]);
    expect(window.location.pathname).toBe("/signup");
    expect(screen.getByLabelText("이름")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });
  });

  it("대시보드에서 뒤로가기로 랜딩에 돌아오면 랜딩을 다시 보여준다", async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    render(<App />);

    fireEvent.click(
      screen.getAllByRole("button", { name: /무료로 시작하기/ })[0],
    );
    await screen.findByRole("heading", { name: "DIVURVE" });
    expect(window.location.pathname).toBe("/dashboard");

    window.history.replaceState(null, "", "/");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));

    expect(screen.getByText("가장 지능적인 환전 가이드")).toBeInTheDocument();
  });
});
