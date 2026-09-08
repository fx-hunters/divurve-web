import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { login, logout } from "../../api/auth";
import { readApiSession } from "../../api/session";
import { installSessionRefresh } from "../../api/session-bootstrap";
import { AdminApp } from "./admin-app";

vi.mock("../../api/auth", () => ({ login: vi.fn(), logout: vi.fn() }));
vi.mock("../../api/session", () => ({ readApiSession: vi.fn() }));
vi.mock("../../api/session-bootstrap", () => ({
  installSessionRefresh: vi.fn(),
}));

vi.mock("./admin-users-screen", () => ({
  AdminUsersScreen: ({
    onAuthFailure,
    onSelectUser,
  }: {
    onAuthFailure: (failure: "forbidden" | "unauthorized") => void;
    onSelectUser: (userId: string) => void;
  }) => (
    <div>
      <span>사용자 화면</span>
      <button type="button" onClick={() => onSelectUser("7")}>
        상세로
      </button>
      <button type="button" onClick={() => onAuthFailure("forbidden")}>
        403 발생
      </button>
      <button type="button" onClick={() => onAuthFailure("unauthorized")}>
        401 발생
      </button>
    </div>
  ),
}));
vi.mock("./admin-user-detail-screen", () => ({
  AdminUserDetailScreen: ({
    userId,
    onBack,
  }: {
    userId: string;
    onBack: () => void;
  }) => (
    <div>
      <span>상세 화면 {userId}</span>
      <button type="button" onClick={onBack}>
        뒤로
      </button>
    </div>
  ),
}));
vi.mock("./admin-currencies-screen", () => ({
  AdminCurrenciesScreen: () => <span>통화 화면</span>,
}));
vi.mock("./admin-fx-rates-screen", () => ({
  AdminFxRatesScreen: () => <span>환율 화면</span>,
}));
vi.mock("./admin-ai-explain-screen", () => ({
  AdminAiExplainScreen: () => <span>설명 화면</span>,
}));
vi.mock("./admin-ai-extract-screen", () => ({
  AdminAiExtractScreen: () => <span>추출 화면</span>,
}));
vi.mock("./admin-ai-calls-screen", () => ({
  AdminAiCallsScreen: ({
    onSelectUser,
  }: {
    onSelectUser: (userId: string) => void;
  }) => (
    <div>
      <span>AI 로그 화면</span>
      <button type="button" onClick={() => onSelectUser("9")}>
        로그에서 상세로
      </button>
    </div>
  ),
}));

const SESSION = {
  accessToken: "access",
  refreshToken: "refresh",
  expiresIn: 1800,
  isDemo: false,
  onboarded: true,
};

function setPathname(pathname: string) {
  window.history.replaceState(null, "", pathname);
}

beforeEach(() => {
  vi.mocked(readApiSession).mockReturnValue(SESSION);
  vi.mocked(login).mockResolvedValue(SESSION);
  vi.mocked(logout).mockReset();
  setPathname("/admin");
});

afterEach(() => {
  setPathname("/");
});

describe("AdminApp", () => {
  it("세션이 없으면 로그인 화면을 띄우고, 로그인하면 콘솔로 들어간다", async () => {
    vi.mocked(readApiSession).mockReturnValue(null);

    render(<AdminApp />);

    expect(screen.getByText("Divurve 관리자 콘솔")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "ops@divurve.io" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByText("사용자 화면")).toBeInTheDocument();
    expect(installSessionRefresh).toHaveBeenCalled();
  });

  it("메뉴로 화면을 옮기고 경로를 바꾼다", () => {
    render(<AdminApp />);

    fireEvent.click(screen.getByRole("button", { name: "통화 마스터" }));
    expect(screen.getByText("통화 화면")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/admin/currencies");

    fireEvent.click(screen.getByRole("button", { name: "환율·갱신" }));
    expect(screen.getByText("환율 화면")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "AI 설명" }));
    expect(screen.getByText("설명 화면")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "AI 추출" }));
    expect(screen.getByText("추출 화면")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "AI 추출" }),
    ).toHaveAttribute("aria-current", "page");

    // 같은 경로를 다시 눌러도 히스토리를 늘리지 않는다.
    fireEvent.click(screen.getByRole("button", { name: "AI 추출" }));
    expect(window.location.pathname).toBe("/admin/ai/extract");

    fireEvent.click(screen.getByRole("button", { name: "AI 로그" }));
    expect(screen.getByText("AI 로그 화면")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/admin/ai/calls");
  });

  it("AI 로그의 행에서도 사용자 상세로 이동한다", () => {
    render(<AdminApp />);

    fireEvent.click(screen.getByRole("button", { name: "AI 로그" }));
    fireEvent.click(screen.getByRole("button", { name: "로그에서 상세로" }));

    expect(screen.getByText("상세 화면 9")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/admin/users/9");
  });

  it("사용자 상세로 이동했다가 목록으로 돌아온다", () => {
    render(<AdminApp />);

    fireEvent.click(screen.getByRole("button", { name: "상세로" }));
    expect(screen.getByText("상세 화면 7")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/admin/users/7");

    fireEvent.click(screen.getByRole("button", { name: "뒤로" }));
    expect(screen.getByText("사용자 화면")).toBeInTheDocument();
  });

  it("뒤로 가기(popstate)에 반응한다", async () => {
    render(<AdminApp />);

    fireEvent.click(screen.getByRole("button", { name: "통화 마스터" }));
    expect(screen.getByText("통화 화면")).toBeInTheDocument();

    act(() => {
      setPathname("/admin/users");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() =>
      expect(screen.getByText("사용자 화면")).toBeInTheDocument(),
    );
  });

  it("403이면 세션을 버리고 권한 안내와 함께 로그인 화면으로 돌린다", async () => {
    render(<AdminApp />);

    fireEvent.click(screen.getByRole("button", { name: "403 발생" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "관리자 권한이 없는 계정입니다",
    );
    expect(logout).toHaveBeenCalled();
  });

  it("401이면 세션 만료 안내로 돌린다", async () => {
    render(<AdminApp />);

    fireEvent.click(screen.getByRole("button", { name: "401 발생" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "세션이 만료되었습니다. 다시 로그인해 주세요.",
    );
  });

  it("로그아웃하면 안내 없이 로그인 화면으로 돌아간다", async () => {
    render(<AdminApp />);

    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(await screen.findByLabelText("email")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(logout).toHaveBeenCalled();
  });

  it("경로에 맞는 화면으로 시작한다", () => {
    setPathname("/admin/ai/explain");
    render(<AdminApp />);
    expect(screen.getByText("설명 화면")).toBeInTheDocument();
  });
});
