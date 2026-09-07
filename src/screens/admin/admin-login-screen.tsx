/**
 * 관리자 콘솔 로그인.
 *
 * `POST /api/v1/auth/login`으로 토큰을 받는다. 관리자 권한 여부는 로그인이
 * 아니라 `/api/v1/admin/**` 호출이 403을 주는지로 갈리므로, 여기서 권한을
 * 판정하지 않는다. 되돌아온 사유는 `notice`로 받아 그대로 보여준다.
 */
import { useState } from "react";
import { login } from "../../api/auth";
import { toAdminErrorInfo } from "./admin-errors";

interface AdminLoginScreenProps {
  readonly notice: string | null;
  readonly onSignedIn: () => void;
  /** 테스트에서 로그인 경로를 주입하기 위한 통로. */
  readonly authenticate?: typeof login;
}

export function AdminLoginScreen({
  notice,
  onSignedIn,
  authenticate = login,
}: AdminLoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await authenticate({ email, password }, "session");
      onSignedIn();
    } catch (error) {
      setErrorMessage(toAdminErrorInfo(error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-login">
      <form className="admin-login__form" onSubmit={handleSubmit}>
        <h1 className="admin-login__title">Divurve 관리자 콘솔</h1>
        <p className="admin-login__subtitle">
          운영 점검용 임시 도구입니다. 관리자 계정으로 로그인하세요.
        </p>

        {notice !== null && (
          <p className="admin-panel admin-panel--warn" role="alert">
            {notice}
          </p>
        )}

        <label className="admin-field admin-field--block">
          <span>email</span>
          <input
            type="email"
            value={email}
            autoComplete="username"
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="admin-field admin-field--block">
          <span>password</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {errorMessage !== null && (
          <p className="admin-panel admin-panel--danger" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          className="admin-button admin-button--primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "로그인 중" : "로그인"}
        </button>
      </form>
    </main>
  );
}
