import { useState, useEffect } from "react";
import { Icon } from "./components/common/icon";
import { ApiError } from "./api/client";
import type { LoginRequest, SignupRequest } from "./api/auth";
import type { SessionPersistence } from "./api/session";
import type { AuthSuccessResult } from "./types/auth";

export interface AuthPageProps {
  readonly initialMode?: "login" | "signup";
  readonly onSuccess: (result: AuthSuccessResult | void) => void;
  readonly onBack: () => void;
  readonly authenticateLogin?: (
    input: LoginRequest,
    persistence: SessionPersistence,
  ) => Promise<AuthSuccessResult | void>;
  readonly authenticateSignup?: (
    input: SignupRequest,
  ) => Promise<AuthSuccessResult | void>;
}

export type AuthMode = "login" | "signup";

// 5단계 비밀번호 강도 채점 함수
export function pwStrength(pw: string) {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const map = [
    { label: "매우 약함", color: "var(--danger)" },
    { label: "약함", color: "var(--warn)" },
    { label: "보통", color: "var(--warn)" },
    { label: "강함", color: "var(--normal)" },
    { label: "매우 강함", color: "var(--primary)" },
  ];
  const idx = Math.max(0, Math.min(score - 1, 4));
  return { score, label: map[idx]!.label, color: map[idx]!.color };
}

// 인라인 버튼 스타일
export const inputBtnStyle = (active?: boolean): React.CSSProperties => ({
  fontSize: "0.72rem",
  fontWeight: 700,
  padding: "0.4rem 0.75rem",
  borderRadius: "0.4rem",
  border: "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
  background: active ? "var(--primary)" : "var(--primary-subtle)",
  color: active ? "var(--primary-content)" : "var(--primary)",
  transition: "all 0.15s",
});

// 재사용 Field 컴포넌트
interface FieldProps {
  readonly id?: string;
  readonly label: string;
  readonly type?: string;
  readonly value: string;
  readonly onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly placeholder?: string;
  readonly error?: string;
  readonly hint?: string;
  readonly successHint?: string;
  readonly suffix?: React.ReactNode;
  readonly disabled?: boolean;
  readonly autoComplete?: string;
  readonly successBorder?: boolean;
  readonly 'aria-label'?: string;
}

export function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  hint,
  successHint,
  suffix,
  disabled,
  autoComplete,
  successBorder,
  'aria-label': ariaLabel,
}: FieldProps) {
  const [focused, setFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return "var(--danger)";
    if (successBorder) return "var(--primary)";
    if (focused) return "var(--primary-border)";
    return "var(--border)";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      <label
        htmlFor={id}
        style={{
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: "var(--text-muted)",
        }}
      >
        {label}
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: disabled ? "var(--surface-subtle)" : "var(--surface)",
          border: `1px solid ${getBorderColor()}`,
          borderRadius: "var(--radius-md)",
          padding: "0 0.875rem",
          boxShadow: focused && !error ? "var(--shadow-sm)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
          opacity: disabled ? 0.75 : 1,
        }}
      >
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-label={ariaLabel || label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            width: "100%",
            padding: "0.6875rem 0",
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text)",
            fontSize: "0.875rem",
            fontFamily: "var(--font-sans)",
          }}
        />
        {suffix && <div style={{ marginLeft: "0.5rem", display: "flex", alignItems: "center" }}>{suffix}</div>}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            color: "var(--danger)",
            fontSize: "0.75rem",
            marginTop: "0.125rem",
          }}
        >
          <Icon name="alertCircle" size={14} />
          <span>{error}</span>
        </div>
      )}

      {!error && successHint && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            color: "var(--normal)",
            fontSize: "0.75rem",
            marginTop: "0.125rem",
          }}
        >
          <Icon name="check" size={14} />
          <span>{successHint}</span>
        </div>
      )}

      {!error && !successHint && hint && (
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.75rem",
            marginTop: "0.125rem",
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

// 커스텀 체크박스 컴포넌트
interface CheckboxProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly label: React.ReactNode;
  readonly id?: string;
  readonly ariaLabel?: string;
}

export function Checkbox({ checked, onChange, label, id, ariaLabel }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        cursor: "pointer",
        userSelect: "none",
        fontSize: "0.8125rem",
      }}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 0,
          height: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "4px",
          border: checked ? "1px solid var(--primary)" : "1px solid var(--border)",
          backgroundColor: checked ? "var(--primary)" : "transparent",
          color: "var(--primary-content)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease",
          flexShrink: 0,
        }}
      >
        {checked && <Icon name="check" size={12} />}
      </div>
      <span style={{ color: "var(--text)" }}>{label}</span>
    </label>
  );
}

const resolveImmediately = async () => undefined;

export function AuthPage({
  initialMode = "login",
  onSuccess,
  onBack,
  authenticateLogin = resolveImmediately,
  authenticateSignup = resolveImmediately,
}: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [animating, setAnimating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 로그인 상태 ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [rememberId, setRememberId] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);

  // --- 회원가입 상태 ---
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [emailChecked, setEmailChecked] = useState<null | true>(null);
  const [suPw, setSuPw] = useState("");
  const [showSuPw, setShowSuPw] = useState(false);
  const [suPwConfirm, setSuPwConfirm] = useState("");
  const [showSuPwConfirm, setShowSuPwConfirm] = useState(false);

  // 약관 동의
  const [allTerms, setAllTerms] = useState(false);
  const [termService, setTermService] = useState(false);
  const [termPrivacy, setTermPrivacy] = useState(false);
  const [termMarketing, setTermMarketing] = useState(false);

  // allTerms 동기화 (useEffect)
  useEffect(() => {
    setAllTerms(termService && termPrivacy && termMarketing);
  }, [termService, termPrivacy, termMarketing]);

  const switchMode = (next: AuthMode) => {
    if (mode === next) return;
    setAnimating(true);
    setTimeout(() => {
      setMode(next);
      setErrors({});
      setAnimating(false);
    }, 180);
  };

  const handleCheckEmailDuplicate = () => {
    if (!suEmail || !suEmail.includes("@")) {
      setErrors((prev) => ({ ...prev, suEmail: "올바른 이메일을 입력하세요." }));
      return;
    }
    setErrors((prev) => {
      const rest = { ...prev };
      delete rest.suEmail;
      return rest;
    });

    setEmailChecked(true);
  };

  const toggleAllTerms = (v: boolean) => {
    setAllTerms(v);
    setTermService(v);
    setTermPrivacy(v);
    setTermMarketing(v);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!loginEmail) errs.email = "이메일을 입력하세요.";
    if (!loginPw) errs.password = "비밀번호를 입력하세요.";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await authenticateLogin(
        { email: loginEmail, password: loginPw },
        autoLogin ? "local" : "session",
      );
      onSuccess(result);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "로그인 요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!suName) errs.name = "이름을 입력하세요.";
    if (!suEmail || !suEmail.includes("@")) errs.suEmail = "올바른 이메일을 입력하세요.";
    if (!suPw || suPw.length < 8) errs.suPw = "비밀번호는 8자 이상이어야 합니다.";
    if (suPw !== suPwConfirm) errs.suPwConfirm = "비밀번호가 일치하지 않습니다.";
    if (!termService || !termPrivacy) errs.terms = "필수 약관에 동의하세요.";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await authenticateSignup({
        email: suEmail,
        password: suPw,
        name: suName,
      });
      onSuccess(result);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "회원가입 요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const pwStrengthInfo = pwStrength(suPw);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        fontFamily: "var(--font-sans)",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* --- 좌측 패널 (lg 이상 전용, 브랜드 로고만 + 그리드 장식) --- */}
      <div
        className="hidden-below-lg"
        style={{
          width: "440px",
          minWidth: "440px",
          backgroundColor: "var(--surface)",
          borderRight: "1px solid var(--border)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "2.5rem 2rem",
          overflow: "hidden",
        }}
      >
        {/* 그리드 장식 배경 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(to right, var(--border) 1px, transparent 1px),
              linear-gradient(to bottom, var(--border) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            opacity: 0.35,
            pointerEvents: "none",
          }}
        />
        {/* 라디얼 글로우 */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "300px",
            height: "300px",
            background: "radial-gradient(circle, var(--primary-subtle) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* 상단 홈으로 돌아가기 버튼 */}
        <button
          type="button"
          onClick={onBack}
          style={{
            position: "relative",
            zIndex: 2,
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--text-muted)",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            transition: "color 0.15s ease",
          }}
        >
          <span style={{ fontSize: "1rem" }}>←</span>
          <span>홈으로 돌아가기</span>
        </button>

        {/* 중앙 브랜드 로고만 (카피 문구 없음) */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            margin: "auto 0",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary-content)",
              fontWeight: 900,
              fontSize: "1.75rem",
              boxShadow: "var(--shadow-lg)",
              marginBottom: "1rem",
            }}
          >
            D
          </div>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.75rem",
              letterSpacing: "-0.03em",
              color: "var(--text)",
            }}
          >
            DIVURVE
          </span>
        </div>

        {/* 하단 여백용 빈 div */}
        <div style={{ height: "24px" }} />
      </div>

      {/* --- 우측 패널 (폼 컨테이너) --- */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2.5rem 1.5rem",
          overflowY: "auto",
        }}
      >
        <div style={{ maxWidth: "420px", width: "100%" }}>
          {/* 모바일 상단 로고 & 뒤로가기 */}
          <div
            className="hidden-lg"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--primary-content)",
                  fontWeight: 900,
                  fontSize: "1.125rem",
                }}
              >
                D
              </div>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "1.25rem",
                  color: "var(--text)",
                }}
              >
                DIVURVE
              </span>
            </div>

            <button
              type="button"
              onClick={onBack}
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-muted)",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              홈으로
            </button>
          </div>

          {/* 탭 스위처 */}
          <div
            role="tablist"
            aria-label="인증 방식 선택"
            style={{
              display: "flex",
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "4px",
              marginBottom: "2rem",
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              aria-controls="auth-panel"
              onClick={() => switchMode("login")}
              style={{
                flex: 1,
                padding: "0.625rem 0",
                borderRadius: "calc(var(--radius-md) - 2px)",
                border: "none",
                backgroundColor: mode === "login" ? "var(--primary)" : "transparent",
                color: mode === "login" ? "var(--primary-content)" : "var(--text-muted)",
                fontWeight: mode === "login" ? 700 : 500,
                fontSize: "0.875rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              로그인
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              aria-controls="auth-panel"
              onClick={() => switchMode("signup")}
              style={{
                flex: 1,
                padding: "0.625rem 0",
                borderRadius: "calc(var(--radius-md) - 2px)",
                border: "none",
                backgroundColor: mode === "signup" ? "var(--primary)" : "transparent",
                color: mode === "signup" ? "var(--primary-content)" : "var(--text-muted)",
                fontWeight: mode === "signup" ? 700 : 500,
                fontSize: "0.875rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              회원가입
            </button>
          </div>

          {/* 폼 애니메이션 래퍼 */}
          <div
            id="auth-panel"
            role="tabpanel"
            style={{
              opacity: animating ? 0 : 1,
              transform: animating ? "translateY(8px)" : "none",
              transition: "opacity 0.18s ease, transform 0.18s ease",
            }}
          >
            {submitError && (
              <p
                role="alert"
                style={{
                  color: "var(--danger)",
                  backgroundColor: "var(--danger-bg)",
                  border: "1px solid var(--danger-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  fontSize: "0.8125rem",
                }}
              >
                {submitError}
              </p>
            )}
            {mode === "login" ? (
              /* --- 로그인 폼 --- */
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <Field
                  id="login-email"
                  label="이메일"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    if (errors.email) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.email;
                        return next;
                      });
                    }
                  }}
                  placeholder="name@example.com"
                  autoComplete="email"
                  error={errors.email}
                />

                <Field
                  id="login-pw"
                  label="비밀번호"
                  type={showLoginPw ? "text" : "password"}
                  value={loginPw}
                  onChange={(e) => {
                    setLoginPw(e.target.value);
                    if (errors.password) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.password;
                        return next;
                      });
                    }
                  }}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                  error={errors.password}
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowLoginPw(!showLoginPw)}
                      aria-label={showLoginPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        padding: "4px",
                      }}
                    >
                      <Icon name={showLoginPw ? "eyeOff" : "eye"} size={16} />
                    </button>
                  }
                />

                {/* 옵션 행 (아이디 저장/자동 로그인 vs 아이디/비번 찾기) */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.75rem",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <Checkbox
                      id="remember-id"
                      checked={rememberId}
                      onChange={setRememberId}
                      label={<span style={{ fontSize: "0.75rem" }}>아이디 저장</span>}
                    />
                    <Checkbox
                      id="auto-login"
                      checked={autoLogin}
                      onChange={setAutoLogin}
                      label={<span style={{ fontSize: "0.75rem" }}>자동 로그인</span>}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", color: "var(--text-muted)" }}>
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      아이디 찾기
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      비밀번호 찾기
                    </button>
                  </div>
                </div>

                {/* 로그인 버튼 */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "0.8125rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-content)",
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "var(--shadow-md)",
                    marginTop: "0.5rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isSubmitting ? "로그인 중…" : "로그인"}
                </button>

                {/* 회원가입 전환 링크 */}
                <div style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.8125rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>계정이 없으신가요? </span>
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--primary)",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    회원가입
                  </button>
                </div>
              </form>
            ) : (
              /* --- 회원가입 폼 --- */
              <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
                {/* 이름 */}
                <Field
                  id="su-name"
                  label="이름"
                  value={suName}
                  onChange={(e) => {
                    setSuName(e.target.value);
                    if (errors.name) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.name;
                        return next;
                      });
                    }
                  }}
                  placeholder="홍길동"
                  autoComplete="name"
                  error={errors.name}
                />

                {/* 이메일 + 중복확인 */}
                <Field
                  id="su-email"
                  label="이메일"
                  type="email"
                  value={suEmail}
                  onChange={(e) => {
                    setSuEmail(e.target.value);
                    setEmailChecked(null);
                    if (errors.suEmail) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.suEmail;
                        return next;
                      });
                    }
                  }}
                  placeholder="name@example.com"
                  autoComplete="email"
                  error={errors.suEmail}
                  successHint={emailChecked === true ? "가입 시 서버에서 중복 여부를 확인합니다." : undefined}
                  successBorder={emailChecked === true}
                  suffix={
                    <button
                      type="button"
                      onClick={handleCheckEmailDuplicate}
                      style={inputBtnStyle(emailChecked === true)}
                    >
                      {emailChecked === true ? "형식 확인됨" : "형식 확인"}
                    </button>
                  }
                />

                {/* 비밀번호 + 강도 게이지 */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  <Field
                    id="su-pw"
                    label="비밀번호"
                    type={showSuPw ? "text" : "password"}
                    value={suPw}
                    onChange={(e) => {
                      setSuPw(e.target.value);
                      if (errors.suPw) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.suPw;
                          return next;
                        });
                      }
                    }}
                    placeholder="8자 이상, 영문·숫자·특수문자 포함"
                    autoComplete="new-password"
                    error={errors.suPw}
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowSuPw(!showSuPw)}
                        aria-label={showSuPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          padding: "4px",
                        }}
                      >
                        <Icon name={showSuPw ? "eyeOff" : "eye"} size={16} />
                      </button>
                    }
                  />

                  {/* 강도 바 */}
                  {suPw.length > 0 && (
                    <div style={{ marginTop: "0.25rem" }}>
                      <div
                        style={{
                          height: "3px",
                          backgroundColor: "var(--border)",
                          borderRadius: "1.5px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${(pwStrengthInfo.score / 5) * 100}%`,
                            backgroundColor: pwStrengthInfo.color,
                            transition: "width 0.3s ease, background-color 0.3s ease",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginTop: "0.25rem",
                          fontSize: "0.6875rem",
                          color: pwStrengthInfo.color,
                          fontWeight: 600,
                        }}
                      >
                        {pwStrengthInfo.label}
                      </div>
                    </div>
                  )}
                </div>

                {/* 비밀번호 확인 */}
                <Field
                  id="su-pw-confirm"
                  label="비밀번호 확인"
                  type={showSuPwConfirm ? "text" : "password"}
                  value={suPwConfirm}
                  onChange={(e) => {
                    setSuPwConfirm(e.target.value);
                    if (errors.suPwConfirm) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.suPwConfirm;
                        return next;
                      });
                    }
                  }}
                  placeholder="비밀번호를 다시 입력하세요"
                  autoComplete="new-password"
                  error={errors.suPwConfirm}
                  successHint={
                    suPw && suPwConfirm && suPw === suPwConfirm
                      ? "비밀번호가 일치합니다."
                      : undefined
                  }
                  successBorder={Boolean(suPw && suPwConfirm && suPw === suPwConfirm)}
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowSuPwConfirm(!showSuPwConfirm)}
                      aria-label={showSuPwConfirm ? "비밀번호 확인 숨기기" : "비밀번호 확인 보기"}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        padding: "4px",
                      }}
                    >
                      <Icon name={showSuPwConfirm ? "eyeOff" : "eye"} size={16} />
                    </button>
                  }
                />

                {/* 약관 동의 박스 */}
                <div
                  style={{
                    backgroundColor: "var(--surface)",
                    border: `1px solid ${errors.terms ? "var(--danger)" : "var(--border)"}`,
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <Checkbox
                    id="term-all"
                    checked={allTerms}
                    onChange={toggleAllTerms}
                    label={
                      <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                        전체 동의 (선택 항목 포함)
                      </span>
                    }
                  />

                  <div style={{ height: "1px", backgroundColor: "var(--border-subtle)" }} />

                  <Checkbox
                    id="term-service"
                    checked={termService}
                    onChange={(v) => {
                      setTermService(v);
                      if (errors.terms) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.terms;
                          return next;
                        });
                      }
                    }}
                    label={
                      <div style={{ fontSize: "0.8125rem" }}>
                        <span style={{ color: "var(--primary)", fontWeight: 700, marginRight: "4px" }}>
                          [필수]
                        </span>
                        <span>서비스 이용약관 동의</span>
                      </div>
                    }
                  />

                  <Checkbox
                    id="term-privacy"
                    checked={termPrivacy}
                    onChange={(v) => {
                      setTermPrivacy(v);
                      if (errors.terms) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.terms;
                          return next;
                        });
                      }
                    }}
                    label={
                      <div style={{ fontSize: "0.8125rem" }}>
                        <span style={{ color: "var(--primary)", fontWeight: 700, marginRight: "4px" }}>
                          [필수]
                        </span>
                        <span>개인정보 수집 및 이용 동의</span>
                      </div>
                    }
                  />

                  <Checkbox
                    id="term-marketing"
                    checked={termMarketing}
                    onChange={setTermMarketing}
                    label={
                      <div style={{ fontSize: "0.8125rem" }}>
                        <span style={{ color: "var(--text-muted)", fontWeight: 600, marginRight: "4px" }}>
                          [선택]
                        </span>
                        <span>마케팅 정보 수신 동의</span>
                      </div>
                    }
                  />
                </div>
                {errors.terms && (
                  <div
                    role="alert"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      color: "var(--danger)",
                      fontSize: "0.75rem",
                    }}
                  >
                    <Icon name="alertCircle" size={14} />
                    <span>{errors.terms}</span>
                  </div>
                )}

                {/* 가입하기 버튼 */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "0.8125rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-content)",
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "var(--shadow-md)",
                    marginTop: "0.5rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isSubmitting ? "가입 중…" : "가입하기"}
                </button>

                {/* 로그인 전환 링크 */}
                <div style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.8125rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>이미 계정이 있으신가요? </span>
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--primary)",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    로그인
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
