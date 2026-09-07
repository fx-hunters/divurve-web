import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import type { PlannerApiDependencies } from "./use-planner-api";
import { PlannerApiScreen } from "./planner-api-screen";

const completeResult = { seq: 2, status: "completed", executedAmount: 145, executedRate: 1400, remainingAmount: 1595 };
const skipResult = { redistributed: { perStepBefore: 145, perStepAfter: 160, increasePct: 10 }, achieveProb: { before: .8, after: .7 }, consecutiveSkips: 1, safeModeTriggered: false, newPlanVersion: 3 };
function dependencies(overrides: Partial<PlannerApiDependencies> = {}): PlannerApiDependencies { return { load: vi.fn().mockResolvedValue(PLANNER_API_FIXTURE), complete: vi.fn().mockResolvedValue(completeResult), skip: vi.fn().mockResolvedValue(skipResult), ...overrides }; }
async function openAction(deps = dependencies()) { render(<PlannerApiScreen dependencies={deps} />); await screen.findByRole("region", { name: "API 플래너" }); fireEvent.click(screen.getByRole("button", { name: "현재 상태 보기" })); fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" })); fireEvent.click(screen.getByRole("button", { name: "다음 행동 보기" })); return deps; }

describe("PlannerApiScreen", () => {
  it("로딩, 오류 재시도, 빈 상태를 표시한다", async () => {
    const load = vi.fn().mockRejectedValueOnce(new ApiError("조회 오류", 500, "SERVER")).mockResolvedValueOnce(PLANNER_API_FIXTURE);
    render(<PlannerApiScreen dependencies={dependencies({ load })} />);
    expect(screen.getByText("플래너를 불러오는 중입니다")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("조회 오류");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("region", { name: "API 플래너" })).toBeInTheDocument();
    render(<PlannerApiScreen dependencies={dependencies({ load: vi.fn().mockResolvedValue({ items: [] }) })} />);
    expect(await screen.findByText("등록된 외화 목표가 없습니다")).toBeInTheDocument();
  });

  it("목표 선택과 staged navigation을 제공하고 계획 없는 목표를 안내한다", async () => {
    render(<PlannerApiScreen dependencies={dependencies()} />); await screen.findByRole("region", { name: "API 플래너" });
    fireEvent.click(screen.getByRole("button", { name: /일본 여행 준비/ }));
    expect(screen.getByText("일본 여행 준비의 현재 위치입니다")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" }));
    expect(screen.getByText("이 목표에는 활성 계획이 없습니다")).toBeInTheDocument();
    expect(screen.queryByText("일본 여행 준비의 현재 위치입니다")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "현재 상태" }));
    expect(screen.getByText("일본 여행 준비의 현재 위치입니다")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "다른 목표 보기" }));
    fireEvent.click(screen.getByRole("button", { name: /미국 ETF 준비/ }));
    expect(screen.getByText("미국 ETF 준비의 현재 위치입니다")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" }));
    expect(screen.getByRole("region", { name: "계획 Curve" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "현재 상태" }));
    fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" }));
    fireEvent.keyDown(screen.getByRole("button", { name: /2회차 다음/ }), { key: "Enter" });
    expect(screen.getByRole("status")).toHaveTextContent("2회차");
  });

  it("Curve node를 키보드로 선택하고 완료 입력을 검증한다", async () => {
    await openAction();
    expect(screen.getByText("2회차를 기록할까요?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "전체 계획 상세 보기" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument(); fireEvent.keyDown(window, { key: "Escape" }); expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); expect(screen.getByRole("button", { name: "전체 계획 상세 보기" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "이번 회차 기록" }));
    expect(screen.getByRole("alert")).toHaveTextContent("실행 외화 금액");
    fireEvent.click(screen.getByRole("button", { name: "Curve로 돌아가기" }));
    expect(screen.getByRole("region", { name: "계획 Curve" })).toBeInTheDocument();
  });

  it("서버 처리 중 중복 완료·건너뛰기를 막고 성공 상태를 보여 준다", async () => {
    let resolve!: (value: typeof completeResult) => void; const promise = new Promise<typeof completeResult>((done) => { resolve = done; });
    const deps = await openAction(dependencies({ complete: vi.fn().mockReturnValue(promise) }));
    fireEvent.change(screen.getByLabelText("실행 외화 금액"), { target: { value: "150" } }); fireEvent.change(screen.getByLabelText("실행 환율"), { target: { value: "1395" } }); fireEvent.click(screen.getByRole("button", { name: "이번 회차 기록" }));
    expect(screen.getByRole("button", { name: "서버에 반영 중…" })).toBeDisabled(); expect(screen.getByRole("button", { name: "이번 회차 건너뛰기" })).toBeDisabled(); resolve(completeResult);
    await waitFor(() => expect(deps.complete).toHaveBeenCalledWith("plan-usd", 2, { executedAmount: 150, executedRate: 1395 })); expect(await screen.findByRole("status")).toHaveTextContent("기록을 서버에 저장했습니다");
  });

  it("건너뛰기 실패를 알리고 모바일 Curve 구조를 유지한다", async () => {
    const deps = await openAction(dependencies({ skip: vi.fn().mockRejectedValue(new ApiError("건너뛰기 오류", 500, "SERVER")) }));
    fireEvent.click(screen.getByRole("button", { name: "이번 회차 건너뛰기" })); expect(await screen.findByRole("alert")).toHaveTextContent("건너뛰기 오류"); expect(deps.skip).toHaveBeenCalled();
  });

  it("한 개 목표의 다음 회차를 기본 강조하고 Space로 Curve 노드를 선택한다", async () => {
    render(<PlannerApiScreen dependencies={dependencies({ load: vi.fn().mockResolvedValue({ items: [PLANNER_API_FIXTURE.items[0]! ] }) })} />); await screen.findByRole("region", { name: "API 플래너" });
    fireEvent.click(screen.getByRole("button", { name: "현재 상태 보기" })); fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" }));
    const next = screen.getByRole("button", { name: /2회차 다음/ }); expect(next).toHaveAttribute("data-selected", "true");
    fireEvent.keyDown(screen.getByRole("button", { name: /1회차 완료/ }), { key: " " }); expect(screen.getByRole("status")).toHaveTextContent("1회차");
  });

  it("현재 상태에서 목표 선택 장면으로 돌아간다", async () => {
    render(<PlannerApiScreen dependencies={dependencies()} />); await screen.findByRole("region", { name: "API 플래너" });
    fireEvent.click(screen.getByRole("button", { name: "현재 상태 보기" })); fireEvent.click(screen.getByRole("button", { name: "목표 다시 고르기" }));
    expect(screen.getByRole("heading", { name: "어떤 외화 목표를 이어갈까요?" })).toBeInTheDocument();
  });

  it("완료된 활성 계획의 action-null 상세와 모든 navigation handler를 제공한다", async () => {
    const completed = { items: [{ ...PLANNER_API_FIXTURE.items[0]!, activePlan: { ...PLANNER_API_FIXTURE.items[0]!.activePlan!, steps: PLANNER_API_FIXTURE.items[0]!.activePlan!.steps.map((step) => ({ ...step, status: "completed" })) } }] };
    render(<PlannerApiScreen dependencies={dependencies({ load: vi.fn().mockResolvedValue(completed) })} />); await screen.findByRole("region", { name: "API 플래너" });
    fireEvent.click(screen.getByRole("button", { name: "현재 상태 보기" })); fireEvent.click(screen.getByRole("button", { name: "계획 Curve 보기" })); fireEvent.click(screen.getByRole("button", { name: "다음 행동 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "전체 계획 상세 보기" })); expect(screen.getByRole("dialog")).toBeInTheDocument(); const closeButtons = screen.getAllByRole("button", { name: "상세 닫기" }); fireEvent.click(closeButtons[closeButtons.length - 1]!); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("완료 실패 후 현재 상태를 다시 확인하고 건너뛰기 성공을 표시한다", async () => {
    const load = vi.fn().mockResolvedValue(PLANNER_API_FIXTURE); await openAction(dependencies({ load, complete: vi.fn().mockRejectedValue(new ApiError("기록 오류", 500, "SERVER")) }));
    fireEvent.change(screen.getByLabelText("실행 외화 금액"), { target: { value: "1" } }); fireEvent.change(screen.getByLabelText("실행 환율"), { target: { value: "1" } }); fireEvent.click(screen.getByRole("button", { name: "이번 회차 기록" })); expect(await screen.findByRole("alert")).toHaveTextContent("기록 오류"); fireEvent.click(screen.getByRole("button", { name: "현재 상태 다시 확인" })); await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    const success = await openAction(dependencies()); const skipButtons = screen.getAllByRole("button", { name: "이번 회차 건너뛰기" }); fireEvent.click(skipButtons[skipButtons.length - 1]!); await waitFor(() => expect(success.skip).toHaveBeenCalled());
  });
});
