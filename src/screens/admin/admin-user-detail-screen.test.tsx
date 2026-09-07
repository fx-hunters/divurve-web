import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAdminUser,
  fetchAdminUserData,
  type AdminUser,
} from "../../api/admin";
import { ApiError } from "../../api/client";
import { AdminUserDetailScreen } from "./admin-user-detail-screen";

vi.mock("../../api/admin", () => ({
  fetchAdminUser: vi.fn(),
  fetchAdminUserData: vi.fn(),
}));

const META = { asOf: "2026-09-07T00:00:00Z" };

const SUMMARY: AdminUser = {
  id: "7c0f",
  email: "ops@divurve.io",
  name: "운영자",
  role: "ADMIN",
  isDemo: false,
  sampleDataSeeded: true,
  createdAt: "2026-01-01T00:00:00Z",
  onboardedAt: null,
  lastLoginAt: null,
  lastLoginIp: null,
};

beforeEach(() => {
  vi.mocked(fetchAdminUser).mockReset();
  vi.mocked(fetchAdminUser).mockResolvedValue({ data: SUMMARY, meta: META });
  vi.mocked(fetchAdminUserData).mockReset();
});

describe("AdminUserDetailScreen", () => {
  it("계정 요약과 도메인별 섹션을 함께 보여준다", async () => {
    vi.mocked(fetchAdminUserData).mockResolvedValue({
      data: {
        holdings: [
          { id: "h1", ownerId: "7c0f", currencyCode: "USD", quantity: 1234.5678 },
          { id: "h2", ownerId: "7c0f", currencyCode: "JPY", avgPrice: 9.5 },
        ],
        riskProfile: [{ id: "r1", riskType: "balanced" }],
      },
      meta: META,
    });

    render(
      <AdminUserDetailScreen
        userId="7c0f"
        onAuthFailure={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(await screen.findByText("ops@divurve.io")).toBeInTheDocument();
    expect(screen.getByText("ADMIN")).toBeInTheDocument();

    expect(screen.getByText("holdings")).toBeInTheDocument();
    expect(screen.getByText("2건")).toBeInTheDocument();
    // 행마다 다른 키까지 컬럼으로 세운다.
    expect(
      screen.getByRole("columnheader", { name: "avgPrice" }),
    ).toBeInTheDocument();
    // 반올림하지 않는다.
    expect(screen.getByText("1,234.5678")).toBeInTheDocument();
    // 단일 객체로 오는 도메인도 한 행으로 선다.
    expect(screen.getByText("riskProfile")).toBeInTheDocument();
  });

  it("비어 있는 도메인도 섹션과 건수를 남긴다", async () => {
    vi.mocked(fetchAdminUserData).mockResolvedValue({
      data: { goals: [] },
      meta: META,
    });

    render(
      <AdminUserDetailScreen
        userId="7c0f"
        onAuthFailure={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(await screen.findByText("goals")).toBeInTheDocument();
    expect(screen.getByText("0건")).toBeInTheDocument();
    expect(screen.getByText("없음")).toBeInTheDocument();
  });

  it("섹션을 접었다 펼 수 있다", async () => {
    vi.mocked(fetchAdminUserData).mockResolvedValue({
      data: { holdings: [{ id: "h1" }] },
      meta: META,
    });

    render(
      <AdminUserDetailScreen
        userId="7c0f"
        onAuthFailure={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const head = await screen.findByRole("button", { name: /holdings/ });
    expect(head).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(head);
    expect(head).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("목록으로·다시 불러오기 버튼이 동작한다", async () => {
    const onBack = vi.fn();
    vi.mocked(fetchAdminUserData).mockResolvedValue({
      data: { holdings: [] },
      meta: META,
    });

    render(
      <AdminUserDetailScreen
        userId="7c0f"
        onAuthFailure={vi.fn()}
        onBack={onBack}
      />,
    );
    await screen.findByText("holdings");

    fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
    expect(onBack).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    await waitFor(() => expect(fetchAdminUserData).toHaveBeenCalledTimes(2));
    expect(fetchAdminUserData).toHaveBeenCalledWith("7c0f");
    expect(fetchAdminUser).toHaveBeenCalledWith("7c0f");
  });

  it("요약과 데이터의 실패를 각각 보여준다", async () => {
    vi.mocked(fetchAdminUser).mockRejectedValue(
      new ApiError("요약을 읽지 못했습니다.", 500, "INTERNAL_ERROR"),
    );
    vi.mocked(fetchAdminUserData).mockRejectedValue(
      new ApiError("사용자를 찾을 수 없습니다.", 404, "NOT_FOUND"),
    );

    render(
      <AdminUserDetailScreen
        userId="99"
        onAuthFailure={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("요약을 읽지 못했습니다."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("사용자를 찾을 수 없습니다."),
    ).toBeInTheDocument();
  });
});
