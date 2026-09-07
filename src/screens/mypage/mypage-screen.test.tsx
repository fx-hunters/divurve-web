import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MyPageScreen } from "./mypage-screen";
import { useMyPage, NOTIFICATION_OPTIONS } from "./use-mypage";

describe("useMyPage hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes with default demo profile and preferences", () => {
    const { result } = renderHook(() => useMyPage());
    expect(result.current.profile.name).toBe("김데모");
    expect(result.current.profile.email).toBe("demo.kim@example.com");
    expect(result.current.profile.riskProfile).toBe("안정항로형");
    expect(result.current.bankPreferentialRate).toBe(80);
    expect(result.current.effectiveSpread).toBe("0.2");
    expect(result.current.notifications.budgetWarning).toBe(true);
    expect(result.current.notifications.opportunityBucket).toBe(false);
  });

  it("updates bank preferential rate and clamps between 0 and 100", () => {
    const { result } = renderHook(() => useMyPage());

    act(() => {
      result.current.setBankPreferentialRate(90);
    });
    expect(result.current.bankPreferentialRate).toBe(90);
    expect(result.current.effectiveSpread).toBe("0.1");

    act(() => {
      result.current.setBankPreferentialRate(120);
    });
    expect(result.current.bankPreferentialRate).toBe(100);
    expect(result.current.effectiveSpread).toBe("0.0");

    act(() => {
      result.current.setBankPreferentialRate(-10);
    });
    expect(result.current.bankPreferentialRate).toBe(0);
    expect(result.current.effectiveSpread).toBe("1.0");
  });

  it("toggles notification flags properly", () => {
    const { result } = renderHook(() => useMyPage());
    expect(result.current.notifications.opportunityBucket).toBe(false);

    act(() => {
      result.current.toggleNotification("opportunityBucket");
    });
    expect(result.current.notifications.opportunityBucket).toBe(true);

    act(() => {
      result.current.toggleNotification("budgetWarning");
    });
    expect(result.current.notifications.budgetWarning).toBe(false);
  });

  it("handles password change toast and auto-clears after 3 seconds", () => {
    const { result } = renderHook(() => useMyPage());
    expect(result.current.toastMessage).toBeNull();

    act(() => {
      result.current.handlePasswordChange();
    });
    expect(result.current.toastMessage).toBe("비밀번호 변경 안내 메일이 발송되었습니다.");

    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(result.current.toastMessage).toBeNull();
  });

  it("handles re-diagnosis and cycles through risk profiles", () => {
    const { result } = renderHook(() => useMyPage());
    expect(result.current.profile.riskProfile).toBe("안정항로형");

    act(() => {
      result.current.handleRediagnosis();
    });
    expect(result.current.profile.riskProfile).toBe("균형항로형");
    expect(result.current.toastMessage).toBe("의사결정 성향이 재진단되었습니다.");

    act(() => {
      result.current.handleRediagnosis();
    });
    expect(result.current.profile.riskProfile).toBe("적극항로형");

    act(() => {
      result.current.handleRediagnosis();
    });
    expect(result.current.profile.riskProfile).toBe("도전항로형");

    act(() => {
      result.current.handleRediagnosis();
    });
    expect(result.current.profile.riskProfile).toBe("안정항로형");
  });

  it("handles consecutive toasts without premature clearance", () => {
    const { result } = renderHook(() => useMyPage());
    act(() => {
      result.current.handlePasswordChange();
    });
    expect(result.current.toastMessage).toBe("비밀번호 변경 안내 메일이 발송되었습니다.");

    // Advance 1s and trigger rediagnosis toast
    act(() => {
      vi.advanceTimersByTime(1000);
      result.current.handleRediagnosis();
    });
    expect(result.current.toastMessage).toBe("의사결정 성향이 재진단되었습니다.");

    // Advance 2.1s (total 3.1s since first toast, 2.1s since second toast)
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    // Second toast should still be active
    expect(result.current.toastMessage).toBe("의사결정 성향이 재진단되었습니다.");

    // Advance remaining 1s
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.toastMessage).toBeNull();
  });

  it("handles logout and login toast feedback", () => {
    const { result } = renderHook(() => useMyPage());
    act(() => {
      result.current.handleLogout();
    });
    expect(result.current.toastMessage).toBe("로그아웃되었습니다.");

    act(() => {
      result.current.handleLogin();
    });
    expect(result.current.toastMessage).toBe("로그인 페이지로 이동합니다.");
  });

  it("supports manual toast clear", () => {
    const { result } = renderHook(() => useMyPage());
    act(() => {
      result.current.handlePasswordChange();
    });
    expect(result.current.toastMessage).toBeTruthy();

    act(() => {
      result.current.clearToast();
    });
    expect(result.current.toastMessage).toBeNull();
  });
});

describe("MyPageScreen Component", () => {
  it("renders user profile info correctly", () => {
    render(<MyPageScreen />);
    expect(screen.getByText("김데모")).toBeInTheDocument();
    expect(screen.getByText("demo.kim@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "비밀번호 변경" })).toBeInTheDocument();
  });

  it("renders risk decision profile and triggers re-diagnosis", () => {
    render(<MyPageScreen />);
    expect(screen.getByText("의사결정 프로필 (투자성향)")).toBeInTheDocument();
    expect(screen.getByText(/안전 버킷 하한과 집중도 기준선/)).toBeInTheDocument();
    expect(screen.getByText("안정항로형")).toBeInTheDocument();
    expect(screen.getByText(/진단일:/)).toBeInTheDocument();

    const rediagnosisBtn = screen.getByRole("button", { name: "재진단" });
    fireEvent.click(rediagnosisBtn);
    expect(screen.getByText("균형항로형")).toBeInTheDocument();
  });

  it("handles password change click feedback toast", () => {
    render(<MyPageScreen />);
    const pwdBtn = screen.getByRole("button", { name: "비밀번호 변경" });
    fireEvent.click(pwdBtn);
    expect(screen.getByText("비밀번호 변경 안내 메일이 발송되었습니다.")).toBeInTheDocument();
  });

  it("keeps calculation assumptions out of the basic profile settings", () => {
    render(<MyPageScreen />);
    expect(screen.queryByText("주거래 은행 우대율")).not.toBeInTheDocument();
    expect(screen.queryByText(/실효 스프레드/)).not.toBeInTheDocument();
  });

  it("renders notification checkboxes and allows toggling", () => {
    render(<MyPageScreen />);
    expect(screen.getByText("알림 설정 (계획 변화 기준)")).toBeInTheDocument();

    for (const opt of NOTIFICATION_OPTIONS) {
      expect(screen.getByText(opt.label)).toBeInTheDocument();
    }

    const budgetCheckbox = screen.getByLabelText("예산 부족 경고");
    expect(budgetCheckbox).toBeChecked();
    fireEvent.click(budgetCheckbox);
    expect(budgetCheckbox).not.toBeChecked();

    const opportunityCheckbox = screen.getByLabelText("기회 버킷 실행 알림");
    expect(opportunityCheckbox).not.toBeChecked();
    fireEvent.click(opportunityCheckbox);
    expect(opportunityCheckbox).toBeChecked();
  });

  it("triggers navigation when shortcut buttons are clicked", () => {
    const handleNavigate = vi.fn();
    render(<MyPageScreen onNavigate={handleNavigate} />);

    const assetShortcutBtn = screen.getByRole("button", { name: /자산 내역 편집/ });
    fireEvent.click(assetShortcutBtn);
    expect(handleNavigate).toHaveBeenCalledWith("assets");

    const plannerShortcutBtn = screen.getByRole("button", { name: /외화 목표 편집/ });
    fireEvent.click(plannerShortcutBtn);
    expect(handleNavigate).toHaveBeenCalledWith("planner");
  });

  it("handles navigation click when onNavigate is not provided without crashing", () => {
    render(<MyPageScreen />);
    const assetShortcutBtn = screen.getByRole("button", { name: /자산 내역 편집/ });
    expect(() => fireEvent.click(assetShortcutBtn)).not.toThrow();

    const plannerShortcutBtn = screen.getByRole("button", { name: /외화 목표 편집/ });
    expect(() => fireEvent.click(plannerShortcutBtn)).not.toThrow();
  });

  it("handles login click when not logged in (isLoggedIn=false) with callback or fallback toast", () => {
    const handleLogin = vi.fn();
    const { unmount } = render(<MyPageScreen isLoggedIn={false} onLogin={handleLogin} />);

    const loginBtn = screen.getByRole("button", { name: "로그인" });
    expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "비밀번호 변경" })).not.toBeInTheDocument();

    fireEvent.click(loginBtn);
    expect(handleLogin).toHaveBeenCalledTimes(1);

    unmount();
    render(<MyPageScreen isLoggedIn={false} />);
    const loginBtnFallback = screen.getByRole("button", { name: "로그인" });
    fireEvent.click(loginBtnFallback);
    expect(screen.getByText("로그인 페이지로 이동합니다.")).toBeInTheDocument();
  });

  it("handles logout click when logged in (isLoggedIn=true) with callback or fallback toast", () => {
    const handleLogout = vi.fn();
    const { unmount } = render(<MyPageScreen isLoggedIn={true} onLogout={handleLogout} />);

    const logoutBtn = screen.getByRole("button", { name: "로그아웃" });
    expect(screen.getByRole("button", { name: "비밀번호 변경" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "로그인" })).not.toBeInTheDocument();

    fireEvent.click(logoutBtn);
    expect(handleLogout).toHaveBeenCalledTimes(1);

    unmount();
    render(<MyPageScreen isLoggedIn={true} />);
    const logoutBtnFallback = screen.getByRole("button", { name: "로그아웃" });
    fireEvent.click(logoutBtnFallback);
    expect(screen.getByText("로그아웃되었습니다.")).toBeInTheDocument();
  });

  it("handles mouseEnter and mouseLeave interactions on buttons and labels", () => {
    const { unmount } = render(<MyPageScreen isLoggedIn={true} />);
    const pwdBtn = screen.getByRole("button", { name: "비밀번호 변경" });
    fireEvent.mouseEnter(pwdBtn);
    fireEvent.mouseLeave(pwdBtn);

    const logoutBtn = screen.getByRole("button", { name: "로그아웃" });
    fireEvent.mouseEnter(logoutBtn);
    fireEvent.mouseLeave(logoutBtn);

    const rediagnosisBtn = screen.getByRole("button", { name: "재진단" });
    fireEvent.mouseEnter(rediagnosisBtn);
    fireEvent.mouseLeave(rediagnosisBtn);

    const assetShortcutBtn = screen.getByRole("button", { name: /자산 내역 편집/ });
    fireEvent.mouseEnter(assetShortcutBtn);
    fireEvent.mouseLeave(assetShortcutBtn);

    const plannerShortcutBtn = screen.getByRole("button", { name: /외화 목표 편집/ });
    fireEvent.mouseEnter(plannerShortcutBtn);
    fireEvent.mouseLeave(plannerShortcutBtn);

    const budgetCheckbox = screen.getByLabelText("예산 부족 경고");
    const labelElem = budgetCheckbox.closest("label");
    if (labelElem) {
      fireEvent.mouseEnter(labelElem);
      fireEvent.mouseLeave(labelElem);
    }

    unmount();

    // Test mouseEnter/Leave on login button when logged out
    render(<MyPageScreen isLoggedIn={false} />);
    const loginBtn = screen.getByRole("button", { name: "로그인" });
    fireEvent.mouseEnter(loginBtn);
    fireEvent.mouseLeave(loginBtn);
  });

  it("handles onStartTour button click and hover in shortcuts section", () => {
    const handleStartTour = vi.fn();
    render(<MyPageScreen onStartTour={handleStartTour} />);

    const tourBtn = screen.getByRole("button", { name: /가이드 투어 다시보기/ });
    expect(tourBtn).toBeInTheDocument();

    fireEvent.mouseEnter(tourBtn);
    fireEvent.mouseLeave(tourBtn);

    fireEvent.click(tourBtn);
    expect(handleStartTour).toHaveBeenCalledTimes(1);
  });
});
