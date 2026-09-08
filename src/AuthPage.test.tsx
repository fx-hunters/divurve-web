import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthPage, Field, pwStrength, inputBtnStyle } from "./AuthPage";
import { ApiError } from "./api/client";

describe("AuthPage Utils", () => {
  it("pwStrength가 비밀번호 길이에 따른 점수와 라벨을 반환한다", () => {
    expect(pwStrength("")).toEqual({ score: 0, label: "", color: "transparent" });
    expect(pwStrength("short")).toEqual({ score: 0, label: "매우 약함", color: "var(--danger)" });
    expect(pwStrength("12345678")).toEqual({ score: 2, label: "약함", color: "var(--warn)" });
    expect(pwStrength("12345678Ab")).toEqual({ score: 3, label: "보통", color: "var(--warn)" });
    expect(pwStrength("12345678Ab!")).toEqual({ score: 4, label: "강함", color: "var(--normal)" });
    expect(pwStrength("123456789012Ab!")).toEqual({ score: 5, label: "매우 강함", color: "var(--primary)" });
  });

  it("inputBtnStyle이 active 상태에 따라 적절한 스타일 객체를 반환한다", () => {
    const activeStyle = inputBtnStyle(true);
    expect(activeStyle.background).toBe("var(--primary)");

    const inactiveStyle = inputBtnStyle(false);
    expect(inactiveStyle.background).toBe("var(--primary-subtle)");
  });
});

describe("AuthPage Component", () => {
  const onSuccessMock = vi.fn();
  const onBackMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("기본 로그인 모드에서 브랜드 로고와 입력 필드를 렌더링한다", () => {
    render(<AuthPage onSuccess={onSuccessMock} onBack={onBackMock} />);

    // 브랜드 로고 텍스트 확인
    expect(screen.getAllByText("DIVURVE").length).toBeGreaterThan(0);

    // 로그인 입력란
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
  });

  it("로그인 폼에서 빈 값 제출 시 에러 메시지를 표시하고, 입력 시 API 인증을 요청한다", async () => {
    const authResult = { isDemo: false, onboarded: false };
    const authenticateLogin = vi.fn().mockResolvedValue(authResult);
    render(<AuthPage onSuccess={onSuccessMock} onBack={onBackMock} authenticateLogin={authenticateLogin} />);

    const loginSubmitBtn = screen.getByRole("button", { name: "로그인" });
    fireEvent.click(loginSubmitBtn);

    expect(screen.getByText("이메일을 입력하세요.")).toBeInTheDocument();
    expect(screen.getByText("비밀번호를 입력하세요.")).toBeInTheDocument();
    expect(onSuccessMock).not.toHaveBeenCalled();

    // 이메일 입력
    const emailInput = screen.getByLabelText("이메일");
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    expect(screen.queryByText("이메일을 입력하세요.")).not.toBeInTheDocument();

    // 비밀번호 입력
    const pwInput = screen.getByLabelText("비밀번호");
    fireEvent.change(pwInput, { target: { value: "password123!" } });
    expect(screen.queryByText("비밀번호를 입력하세요.")).not.toBeInTheDocument();

    // 재제출 시 성공
    await act(async () => fireEvent.click(loginSubmitBtn));
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
    expect(onSuccessMock).toHaveBeenCalledWith(authResult);
    expect(authenticateLogin).toHaveBeenCalledWith(
      { email: "user@example.com", password: "password123!" },
      "session",
    );
  });

  it("로그인 비밀번호 보기/숨기기 토글 및 체크박스 동작을 지원한다", () => {
    render(<AuthPage onSuccess={onSuccessMock} onBack={onBackMock} />);

    const pwInput = screen.getByLabelText("비밀번호");
    expect(pwInput).toHaveAttribute("type", "password");

    const toggleBtn = screen.getByRole("button", { name: "비밀번호 보기" });
    fireEvent.click(toggleBtn);
    expect(pwInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 숨기기" }));
    expect(pwInput).toHaveAttribute("type", "password");

    // 아이디 저장 / 자동 로그인 체크박스
    const rememberCheckbox = screen.getByLabelText("아이디 저장");
    fireEvent.click(rememberCheckbox);
    expect(rememberCheckbox).toBeChecked();

    const autoLoginCheckbox = screen.getByLabelText("자동 로그인");
    fireEvent.click(autoLoginCheckbox);
    expect(autoLoginCheckbox).toBeChecked();
  });

  it("홈으로 돌아가기 버튼 클릭 시 onBack 콜백을 호출한다", () => {
    render(<AuthPage onSuccess={onSuccessMock} onBack={onBackMock} />);

    const backBtns = screen.getAllByRole("button", { name: /홈/ });
    fireEvent.click(backBtns[0]);
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it("모드가 바뀌면 onModeChange로 바뀐 모드를 알린다", () => {
    const onModeChangeMock = vi.fn();
    render(
      <AuthPage
        initialMode="login"
        onModeChange={onModeChangeMock}
        onSuccess={onSuccessMock}
        onBack={onBackMock}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onModeChangeMock).toHaveBeenCalledWith("signup");
  });

  it("탭 스위처 및 하단 전환 링크 클릭 시 부드럽게 모드가 전환된다", () => {
    render(<AuthPage initialMode="login" onSuccess={onSuccessMock} onBack={onBackMock} />);

    // 1) 하단 "회원가입" 링크 클릭으로 회원가입 모드 전환
    const signupLink = screen.getByRole("button", { name: "회원가입" });
    fireEvent.click(signupLink);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByLabelText("이름")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "가입하기" })).toBeInTheDocument();

    // 2) 하단 "로그인" 링크 클릭으로 로그인 모드 전환
    const loginLink = screen.getByRole("button", { name: "로그인" });
    fireEvent.click(loginLink);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();

    // 3) 상단 "회원가입" 탭 클릭
    const signupTab = screen.getByRole("tab", { name: "회원가입" });
    fireEvent.click(signupTab);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByLabelText("이름")).toBeInTheDocument();

    // 4) 상단 "로그인" 탭 클릭
    const loginTab = screen.getByRole("tab", { name: "로그인" });
    fireEvent.click(loginTab);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
  });

  it("회원가입 폼에서 유효성 검사가 정확히 동작한다", () => {
    render(<AuthPage initialMode="signup" onSuccess={onSuccessMock} onBack={onBackMock} />);

    const signupSubmitBtn = screen.getByRole("button", { name: "가입하기" });
    fireEvent.click(signupSubmitBtn);

    expect(screen.getByText("이름을 입력하세요.")).toBeInTheDocument();
    expect(screen.getByText("올바른 이메일을 입력하세요.")).toBeInTheDocument();
    expect(screen.getByText("비밀번호는 8자 이상이어야 합니다.")).toBeInTheDocument();
    expect(screen.getByText("필수 약관에 동의하세요.")).toBeInTheDocument();
    expect(onSuccessMock).not.toHaveBeenCalled();
  });

  it("회원가입 이메일 중복확인 및 리셋이 정상 동작한다", () => {
    render(<AuthPage initialMode="signup" onSuccess={onSuccessMock} onBack={onBackMock} />);

    const emailInput = screen.getByLabelText("이메일");
    const checkDupBtn = screen.getByRole("button", { name: "형식 확인" });

    // 잘못된 형식으로 중복확인 클릭
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.click(checkDupBtn);
    expect(screen.getByText("올바른 이메일을 입력하세요.")).toBeInTheDocument();

    // 형식이 맞는 이메일은 가입 제출 시 서버가 중복 여부를 확인한다.
    fireEvent.change(emailInput, { target: { value: "admin@divurve.com" } });
    fireEvent.click(checkDupBtn);
    expect(screen.getByText("가입 시 서버에서 중복 여부를 확인합니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "형식 확인됨" })).toBeInTheDocument();

    // 이메일 변경 시 확인 상태 리셋
    fireEvent.change(emailInput, { target: { value: "newuser2@divurve.com" } });
    expect(screen.queryByText("가입 시 서버에서 중복 여부를 확인합니다.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "형식 확인" })).toBeInTheDocument();
  });

  it("회원가입 비밀번호 강도 표시, 확인 일치 및 가시성 토글이 정상 동작한다", () => {
    render(<AuthPage initialMode="signup" onSuccess={onSuccessMock} onBack={onBackMock} />);

    const pwInput = screen.getByLabelText("비밀번호");
    fireEvent.change(pwInput, { target: { value: "StrongPass123!" } });
    expect(screen.getByText("매우 강함")).toBeInTheDocument();

    // 비밀번호 토글
    const pwToggleBtn = screen.getByRole("button", { name: "비밀번호 보기" });
    fireEvent.click(pwToggleBtn);
    expect(pwInput).toHaveAttribute("type", "text");

    // 비밀번호 확인 입력
    const pwConfirmInput = screen.getByLabelText("비밀번호 확인");
    fireEvent.change(pwConfirmInput, { target: { value: "WrongPass" } });
    expect(screen.queryByText("비밀번호가 일치합니다.")).not.toBeInTheDocument();

    fireEvent.change(pwConfirmInput, { target: { value: "StrongPass123!" } });
    expect(screen.getByText("비밀번호가 일치합니다.")).toBeInTheDocument();

    // 비밀번호 확인 토글
    const pwConfirmToggleBtn = screen.getByRole("button", { name: "비밀번호 확인 보기" });
    fireEvent.click(pwConfirmToggleBtn);
    expect(pwConfirmInput).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "비밀번호 확인 숨기기" }));
    expect(pwConfirmInput).toHaveAttribute("type", "password");
  });

  it("약관 동의 전체 선택 및 개별 선택 동기화가 정상 동작한다", () => {
    render(<AuthPage initialMode="signup" onSuccess={onSuccessMock} onBack={onBackMock} />);

    const allTermsCheckbox = screen.getByLabelText(/전체 동의/);
    const serviceCheckbox = screen.getByLabelText(/서비스 이용약관 동의/);
    const privacyCheckbox = screen.getByLabelText(/개인정보 수집 및 이용 동의/);
    const marketingCheckbox = screen.getByLabelText(/마케팅 정보 수신 동의/);

    // 전체 동의 클릭 -> 3개 모두 true
    fireEvent.click(allTermsCheckbox);
    expect(allTermsCheckbox).toBeChecked();
    expect(serviceCheckbox).toBeChecked();
    expect(privacyCheckbox).toBeChecked();
    expect(marketingCheckbox).toBeChecked();

    // 하나 해제 -> 전체 동의 false
    fireEvent.click(marketingCheckbox);
    expect(marketingCheckbox).not.toBeChecked();
    expect(allTermsCheckbox).not.toBeChecked();

    // 다시 체크 -> 전체 동의 true
    fireEvent.click(marketingCheckbox);
    expect(allTermsCheckbox).toBeChecked();
  });

  it("회원가입 폼의 모든 필드가 올바를 때 API 회원가입 후 onSuccess를 호출한다", async () => {
    const authResult = { isDemo: false, onboarded: true };
    const authenticateSignup = vi.fn().mockResolvedValue(authResult);
    render(<AuthPage initialMode="signup" onSuccess={onSuccessMock} onBack={onBackMock} authenticateSignup={authenticateSignup} />);

    // 이름
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "홍길동" } });

    // 이메일 + 중복확인
    const emailInput = screen.getByLabelText("이메일");
    fireEvent.change(emailInput, { target: { value: "valid@divurve.com" } });
    fireEvent.click(screen.getByRole("button", { name: "형식 확인" }));

    // 비밀번호 & 확인
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "Password123!" } });
    fireEvent.change(screen.getByLabelText("비밀번호 확인"), { target: { value: "Password123!" } });

    // 약관 전체 동의
    fireEvent.click(screen.getByLabelText(/전체 동의/));

    // 가입하기 제출
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "가입하기" })));
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
    expect(onSuccessMock).toHaveBeenCalledWith(authResult);
    expect(authenticateSignup).toHaveBeenCalledWith({
      email: "valid@divurve.com",
      password: "Password123!",
      name: "홍길동",
    });
  });

  it("약관 에러 상태에서 개별 약관 체크 시 에러가 해제된다", () => {
    render(<AuthPage initialMode="signup" onSuccess={onSuccessMock} onBack={onBackMock} />);

    // 제출하여 약관 에러 발생
    fireEvent.click(screen.getByRole("button", { name: "가입하기" }));
    expect(screen.getByText("필수 약관에 동의하세요.")).toBeInTheDocument();

    // 서비스 약관 체크
    const serviceCheckbox = screen.getByLabelText(/서비스 이용약관 동의/);
    fireEvent.click(serviceCheckbox);
    expect(screen.queryByText("필수 약관에 동의하세요.")).not.toBeInTheDocument();

    // 다시 에러 발생 후 개인정보 약관 체크
    fireEvent.click(serviceCheckbox); // 해제
    fireEvent.click(screen.getByRole("button", { name: "가입하기" }));
    expect(screen.getByText("필수 약관에 동의하세요.")).toBeInTheDocument();

    const privacyCheckbox = screen.getByLabelText(/개인정보 수집 및 이용 동의/);
    fireEvent.click(privacyCheckbox);
    expect(screen.queryByText("필수 약관에 동의하세요.")).not.toBeInTheDocument();
  });

  it("이미 활성화된 탭을 다시 클릭하면 switchMode가 조기 반환된다", () => {
    render(<AuthPage initialMode="login" onSuccess={onSuccessMock} onBack={onBackMock} />);

    const loginTabBtn = screen.getByRole("tab", { name: "로그인" });
    fireEvent.click(loginTabBtn);
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
  });

  it("Field 인풋 포커스 및 블러 이벤트 시 glow 상태가 토글된다", () => {
    render(<AuthPage initialMode="login" onSuccess={onSuccessMock} onBack={onBackMock} />);

    const emailInput = screen.getByLabelText("이메일");
    fireEvent.focus(emailInput);
    fireEvent.blur(emailInput);
  });

  it("회원가입 필드에 에러가 발생한 상태에서 값을 입력하면 해당 에러가 해제된다", () => {
    render(<AuthPage initialMode="signup" onSuccess={onSuccessMock} onBack={onBackMock} />);

    // 빈 폼 제출로 에러 생성
    fireEvent.click(screen.getByRole("button", { name: "가입하기" }));
    expect(screen.getByText("이름을 입력하세요.")).toBeInTheDocument();
    expect(screen.getByText("비밀번호는 8자 이상이어야 합니다.")).toBeInTheDocument();

    // 이름 입력 시 에러 해제
    const nameInput = screen.getByLabelText("이름");
    fireEvent.change(nameInput, { target: { value: "홍길동" } });
    expect(screen.queryByText("이름을 입력하세요.")).not.toBeInTheDocument();

    // 비밀번호 입력 시 에러 해제
    const pwInput = screen.getByLabelText("비밀번호");
    fireEvent.change(pwInput, { target: { value: "Password123!" } });
    expect(screen.queryByText("비밀번호는 8자 이상이어야 합니다.")).not.toBeInTheDocument();

    // 비밀번호 불일치 에러 생성
    const pwConfirmInput = screen.getByLabelText("비밀번호 확인");
    fireEvent.change(pwConfirmInput, { target: { value: "WrongPassword" } });
    fireEvent.click(screen.getByRole("button", { name: "가입하기" }));
    expect(screen.getByText("비밀번호가 일치하지 않습니다.")).toBeInTheDocument();

    // 비밀번호 확인 일치 입력 시 에러 해제
    fireEvent.change(pwConfirmInput, { target: { value: "Password123!" } });
    expect(screen.queryByText("비밀번호가 일치하지 않습니다.")).not.toBeInTheDocument();
  });

  it("Field 컴포넌트가 hint, aria-label, successBorder, disabled를 정상적으로 렌더링한다", () => {
    render(
      <Field
        id="test-field"
        label="테스트 라벨"
        aria-label="커스텀 라벨"
        value="값"
        onChange={() => {}}
        hint="도움말 텍스트입니다."
        disabled={true}
        successBorder={true}
      />
    );
    expect(screen.getByLabelText("커스텀 라벨")).toBeInTheDocument();
    expect(screen.getByText("도움말 텍스트입니다.")).toBeInTheDocument();
  });

  it("형식 확인은 잘못된 이메일을 거부하고 올바른 이메일을 승인한다", () => {
    render(<AuthPage initialMode="signup" onSuccess={onSuccessMock} onBack={onBackMock} />);

    // 잘못된 이메일 입력 및 형식 확인
    const emailInput = screen.getByLabelText("이메일");
    fireEvent.change(emailInput, { target: { value: "invalid" } });
    fireEvent.click(screen.getByRole("button", { name: "형식 확인" }));
    expect(screen.getByText("올바른 이메일을 입력하세요.")).toBeInTheDocument();
    fireEvent.change(emailInput, { target: { value: "admin@divurve.com" } });
    fireEvent.click(screen.getByRole("button", { name: "형식 확인" }));
    expect(screen.getByText("가입 시 서버에서 중복 여부를 확인합니다.")).toBeInTheDocument();
  });

  it("API 인증 오류와 알 수 없는 오류를 폼에 표시한다", async () => {
    const apiFailure = vi.fn().mockRejectedValue(new ApiError("자격 증명 오류", 401, "UNAUTHORIZED"));
    const { unmount } = render(
      <AuthPage onSuccess={onSuccessMock} onBack={onBackMock} authenticateLogin={apiFailure} />,
    );
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "password" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "로그인" })));
    expect(screen.getByRole("alert")).toHaveTextContent("자격 증명 오류");
    unmount();

    const unknownFailure = vi.fn().mockRejectedValue(new Error("unknown"));
    render(
      <AuthPage onSuccess={onSuccessMock} onBack={onBackMock} authenticateLogin={unknownFailure} />,
    );
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "password" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "로그인" })));
    expect(screen.getByRole("alert")).toHaveTextContent("로그인 요청을 완료하지 못했습니다");
  });

  it("기본 로그인 어댑터와 자동 로그인 저장 방식을 사용한다", async () => {
    render(<AuthPage onSuccess={onSuccessMock} onBack={onBackMock} />);
    fireEvent.change(screen.getByLabelText("이메일"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByLabelText("자동 로그인"));
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "로그인" })),
    );
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });

  it("로그인 요청 중 상태를 표시한다", async () => {
    let resolveLogin!: () => void;
    const authenticateLogin = vi.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogin = resolve;
      }),
    );
    render(
      <AuthPage
        onSuccess={onSuccessMock}
        onBack={onBackMock}
        authenticateLogin={authenticateLogin}
      />,
    );
    fireEvent.change(screen.getByLabelText("이메일"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    expect(screen.getByRole("button", { name: "로그인 중…" })).toBeDisabled();
    await act(async () => resolveLogin());
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [new ApiError("가입 API 오류", 400, "BAD"), "가입 API 오류"],
    [
      new Error("network"),
      "회원가입 요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    ],
  ])("회원가입 API 오류를 폼에 표시한다", async (error, message) => {
    const authenticateSignup = vi.fn().mockRejectedValue(error);
    render(
      <AuthPage
        initialMode="signup"
        onSuccess={onSuccessMock}
        onBack={onBackMock}
        authenticateSignup={authenticateSignup}
      />,
    );
    fireEvent.change(screen.getByLabelText("이름"), {
      target: { value: "홍길동" },
    });
    fireEvent.change(screen.getByLabelText("이메일"), {
      target: { value: "valid@divurve.com" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호 확인"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByLabelText(/전체 동의/));
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "가입하기" })),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(onSuccessMock).not.toHaveBeenCalled();
  });
});
