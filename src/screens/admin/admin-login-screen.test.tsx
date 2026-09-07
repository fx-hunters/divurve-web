import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import { AdminLoginScreen } from "./admin-login-screen";

const SESSION = {
  accessToken: "access",
  refreshToken: "refresh",
  expiresIn: 1800,
  isDemo: false,
  onboarded: true,
};

function typeCredentials() {
  fireEvent.change(screen.getByLabelText("email"), {
    target: { value: "ops@divurve.io" },
  });
  fireEvent.change(screen.getByLabelText("password"), {
    target: { value: "pw" },
  });
}

describe("AdminLoginScreen", () => {
  it("이메일·비밀번호로 로그인하고 성공을 알린다", async () => {
    const authenticate = vi.fn().mockResolvedValue(SESSION);
    const onSignedIn = vi.fn();

    render(
      <AdminLoginScreen
        notice={null}
        onSignedIn={onSignedIn}
        authenticate={authenticate}
      />,
    );
    typeCredentials();
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => expect(onSignedIn).toHaveBeenCalled());
    expect(authenticate).toHaveBeenCalledWith(
      { email: "ops@divurve.io", password: "pw" },
      "session",
    );
  });

  it("돌아온 사유를 그대로 보여준다", () => {
    render(
      <AdminLoginScreen
        notice="관리자 권한이 없는 계정입니다"
        onSignedIn={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "관리자 권한이 없는 계정입니다",
    );
  });

  it("로그인 실패 메시지를 그대로 보여준다", async () => {
    const authenticate = vi
      .fn()
      .mockRejectedValue(
        new ApiError("이메일 또는 비밀번호가 올바르지 않습니다.", 401, "UNAUTHORIZED"),
      );

    render(
      <AdminLoginScreen
        notice={null}
        onSignedIn={vi.fn()}
        authenticate={authenticate}
      />,
    );
    typeCredentials();
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(
      await screen.findByText("이메일 또는 비밀번호가 올바르지 않습니다."),
    ).toBeInTheDocument();
  });

  it("보내는 동안 버튼을 잠근다", async () => {
    let resolveLogin: (value: typeof SESSION) => void = () => undefined;
    const authenticate = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve as (value: typeof SESSION) => void;
      }),
    );

    render(
      <AdminLoginScreen
        notice={null}
        onSignedIn={vi.fn()}
        authenticate={authenticate}
      />,
    );
    typeCredentials();
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByRole("button", { name: "로그인 중" })).toBeDisabled();
    resolveLogin(SESSION);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "로그인" })).toBeEnabled(),
    );
  });
});
