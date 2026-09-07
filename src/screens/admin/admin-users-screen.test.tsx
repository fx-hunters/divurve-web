import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAdminUsers,
  type AdminUser,
  type AdminUserPage,
} from "../../api/admin";
import { ApiError } from "../../api/client";
import {
  AdminUsersScreen,
  hasAdminUsersNextPage,
  toIsDemoParam,
} from "./admin-users-screen";

vi.mock("../../api/admin", () => ({ fetchAdminUsers: vi.fn() }));

const META = { asOf: "2026-09-07T00:00:00Z" };

const USER: AdminUser = {
  id: "7c0f",
  email: "ops@divurve.io",
  name: "운영자",
  role: "ADMIN",
  isDemo: false,
  sampleDataSeeded: true,
  createdAt: "2026-01-01T00:00:00Z",
  onboardedAt: "2026-01-02T00:00:00Z",
  lastLoginAt: null,
  lastLoginIp: null,
};

const DEMO_USER: AdminUser = {
  ...USER,
  id: "8a1b",
  email: "demo@divurve.io",
  name: null,
  role: "USER",
  isDemo: true,
  sampleDataSeeded: false,
};

function page(overrides: Partial<AdminUserPage> = {}): AdminUserPage {
  return {
    items: [USER, DEMO_USER],
    page: 0,
    size: 50,
    totalElements: 2,
    totalPages: 1,
    ...overrides,
  };
}

function resolveWith(data: AdminUserPage) {
  vi.mocked(fetchAdminUsers).mockResolvedValue({ data, meta: META });
}

beforeEach(() => {
  vi.mocked(fetchAdminUsers).mockReset();
});

describe("toIsDemoParam", () => {
  it("전체는 파라미터를 보내지 않는다", () => {
    expect(toIsDemoParam("all")).toBeUndefined();
    expect(toIsDemoParam("demoOnly")).toBe(true);
    expect(toIsDemoParam("memberOnly")).toBe(false);
  });
});

describe("hasAdminUsersNextPage", () => {
  it("totalPages가 있으면 그 값만 믿는다", () => {
    expect(hasAdminUsersNextPage(page({ totalPages: 3 }), 1, 50)).toBe(true);
    expect(hasAdminUsersNextPage(page({ totalPages: 2 }), 1, 50)).toBe(false);
  });

  it("totalPages가 없으면 이번 페이지가 가득 찼는지로 판단한다", () => {
    expect(hasAdminUsersNextPage(page({ totalPages: null }), 0, 2)).toBe(true);
    expect(hasAdminUsersNextPage(page({ totalPages: null }), 0, 3)).toBe(false);
  });
});

describe("AdminUsersScreen", () => {
  it("목록을 불러와 서버가 준 컬럼과 페이지 정보를 보여준다", async () => {
    resolveWith(page());
    render(<AdminUsersScreen onAuthFailure={vi.fn()} onSelectUser={vi.fn()} />);

    expect(
      screen.getByText("사용자 목록을 불러오는 중입니다."),
    ).toBeInTheDocument();

    expect(await screen.findByText("ops@divurve.io")).toBeInTheDocument();
    expect(screen.getByText("demo")).toBeInTheDocument();
    expect(screen.getByText("sample")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "role" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "onboardedAt" }),
    ).toBeInTheDocument();
    expect(screen.getByText("totalElements")).toBeInTheDocument();
    // 접속한 적 없는 칸은 - 로 남는다.
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    expect(fetchAdminUsers).toHaveBeenCalledWith({
      page: 0,
      size: 50,
      q: "",
      isDemo: undefined,
    });
  });

  it("마지막 접속이 이력이 아님을 설명에 밝힌다", async () => {
    resolveWith(page());
    render(<AdminUsersScreen onAuthFailure={vi.fn()} onSelectUser={vi.fn()} />);

    expect(
      await screen.findByText(/마지막 접속 1건이며 접속 이력이 아닙니다/),
    ).toBeInTheDocument();
  });

  it("검색어와 데모 필터를 요청에 반영하고 페이지를 처음으로 되돌린다", async () => {
    resolveWith(page({ totalPages: 3 }));
    render(<AdminUsersScreen onAuthFailure={vi.fn()} onSelectUser={vi.fn()} />);
    await screen.findByText("ops@divurve.io");

    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(fetchAdminUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
      ),
    );

    fireEvent.change(screen.getByLabelText("이메일·이름 검색 (q)"), {
      target: { value: "  ops  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await waitFor(() =>
      expect(fetchAdminUsers).toHaveBeenLastCalledWith({
        page: 0,
        size: 50,
        q: "ops",
        isDemo: undefined,
      }),
    );

    fireEvent.change(screen.getByLabelText("데모 계정 (is_demo)"), {
      target: { value: "memberOnly" },
    });
    await waitFor(() =>
      expect(fetchAdminUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ isDemo: false }),
      ),
    );

    fireEvent.change(screen.getByLabelText("데모 계정 (is_demo)"), {
      target: { value: "demoOnly" },
    });
    await waitFor(() =>
      expect(fetchAdminUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ isDemo: true }),
      ),
    );
  });

  it("이전 버튼은 첫 페이지에서 잠기고, 다시 불러오기는 같은 조건으로 재호출한다", async () => {
    resolveWith(page());
    render(<AdminUsersScreen onAuthFailure={vi.fn()} onSelectUser={vi.fn()} />);
    await screen.findByText("ops@divurve.io");

    expect(screen.getByRole("button", { name: "이전" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    await waitFor(() => expect(fetchAdminUsers).toHaveBeenCalledTimes(2));
  });

  it("페이지를 오갈 수 있다", async () => {
    resolveWith(page({ totalPages: 3 }));
    render(<AdminUsersScreen onAuthFailure={vi.fn()} onSelectUser={vi.fn()} />);
    await screen.findByText("ops@divurve.io");

    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByText("요청한 page: 1");
    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    await screen.findByText("요청한 page: 0");
  });

  it("행을 누르면 사용자 id를 알린다", async () => {
    const onSelectUser = vi.fn();
    resolveWith(page({ items: [USER, { ...DEMO_USER, id: null }] }));
    render(
      <AdminUsersScreen onAuthFailure={vi.fn()} onSelectUser={onSelectUser} />,
    );
    await screen.findByText("ops@divurve.io");

    const rows = screen.getAllByRole("row").slice(1);
    fireEvent.click(rows[0]!);
    fireEvent.click(rows[1]!);

    expect(onSelectUser).toHaveBeenCalledTimes(1);
    expect(onSelectUser).toHaveBeenCalledWith("7c0f");
  });

  it("빈 목록이면 안내 문구를 남긴다", async () => {
    resolveWith(page({ items: [] }));
    render(<AdminUsersScreen onAuthFailure={vi.fn()} onSelectUser={vi.fn()} />);

    expect(
      await screen.findByText("조회된 사용자가 없습니다."),
    ).toBeInTheDocument();
  });

  it("서버 에러 메시지를 그대로 보여준다", async () => {
    vi.mocked(fetchAdminUsers).mockRejectedValue(
      new ApiError("잠시 후 다시 시도하세요.", 500, "INTERNAL_ERROR"),
    );
    render(<AdminUsersScreen onAuthFailure={vi.fn()} onSelectUser={vi.fn()} />);

    expect(
      await screen.findByText("잠시 후 다시 시도하세요."),
    ).toBeInTheDocument();
  });

  it("403이면 권한 실패를 위로 알린다", async () => {
    const onAuthFailure = vi.fn();
    vi.mocked(fetchAdminUsers).mockRejectedValue(
      new ApiError("관리자 권한이 필요합니다.", 403, "FORBIDDEN"),
    );
    render(
      <AdminUsersScreen onAuthFailure={onAuthFailure} onSelectUser={vi.fn()} />,
    );

    await waitFor(() =>
      expect(onAuthFailure).toHaveBeenCalledWith("forbidden"),
    );
  });
});
