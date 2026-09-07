import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import {
  EMPTY_HOME_SUMMARY_FIXTURE,
  HOME_SUMMARY_FIXTURE,
} from "../../test/api-fixtures";
import { HomeScreen } from "./home-screen";

describe("HomeScreen", () => {
  it("요약을 불러와 대시보드를 렌더링하고 이동 핸들러를 연결한다", async () => {
    const onNavigate = vi.fn();
    render(
      <HomeScreen
        onNavigate={onNavigate}
        loadSummary={vi.fn().mockResolvedValue(HOME_SUMMARY_FIXTURE)}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "오늘의 핵심" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "자산 등록 / 편집" }));
    expect(onNavigate).toHaveBeenCalledWith("assets");

    fireEvent.click(screen.getByRole("button", { name: "플래너 열기" }));
    expect(onNavigate).toHaveBeenCalledWith("planner");

    fireEvent.click(screen.getByRole("button", { name: "환율 범위 확인하기 →" }));
    expect(onNavigate).toHaveBeenCalledWith("range");
  });

  it("위험성향 미측정 안내에서 마이페이지로 이동한다", async () => {
    const onNavigate = vi.fn();
    render(
      <HomeScreen
        onNavigate={onNavigate}
        loadSummary={vi.fn().mockResolvedValue({
          ...HOME_SUMMARY_FIXTURE,
          data: {
            ...HOME_SUMMARY_FIXTURE.data,
            blocks: HOME_SUMMARY_FIXTURE.data.blocks.map((block) =>
              block.key === "profile_fit"
                ? { ...block, state: "not_measured" as const }
                : block,
            ),
          },
        })}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "진단하러 가기" }));
    expect(onNavigate).toHaveBeenCalledWith("mypage");
  });

  it("모든 블록이 비면 빈 화면을 렌더링하고 플래너로 이동할 수 있다", async () => {
    const onNavigate = vi.fn();
    render(
      <HomeScreen
        onNavigate={onNavigate}
        loadSummary={vi.fn().mockResolvedValue(EMPTY_HOME_SUMMARY_FIXTURE)}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "외화 목표가 없습니다" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "환전 플래너로 이동" }));
    expect(onNavigate).toHaveBeenCalledWith("planner");
  });

  it("불러오는 중에는 로딩 안내를 보여준다", () => {
    render(
      <HomeScreen
        onNavigate={vi.fn()}
        loadSummary={vi.fn().mockReturnValue(new Promise(() => {}))}
      />,
    );
    expect(screen.getByText("홈 정보를 불러오는 중입니다")).toBeInTheDocument();
  });

  it("실패하면 메시지와 재시도 버튼을 보여준다", async () => {
    const loadSummary = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("점검 중입니다.", 503, "UNAVAILABLE"))
      .mockResolvedValue(HOME_SUMMARY_FIXTURE);
    render(<HomeScreen onNavigate={vi.fn()} loadSummary={loadSummary} />);

    expect(await screen.findByText("점검 중입니다.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /다시/ }));
    expect(
      await screen.findByRole("heading", { name: "오늘의 핵심" }),
    ).toBeInTheDocument();
  });
});
