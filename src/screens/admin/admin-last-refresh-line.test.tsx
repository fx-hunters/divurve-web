import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AdminRefreshStatus } from "../../api/admin";
import { AdminLastRefreshLine } from "./admin-last-refresh-line";
import type { AdminRequestState } from "./use-admin-request";

const STATUS: AdminRefreshStatus = {
  fx: {
    lastFetchedAt: "2026-09-08T00:31:07Z",
    lastQuoteDate: "2026-09-05",
    pairs: [],
  },
  macro: { lastRefreshedAt: null },
};

function renderLine(
  state: AdminRequestState<AdminRefreshStatus>,
  selectValue: (status: AdminRefreshStatus) => string | null = (status) =>
    status.fx.lastFetchedAt,
) {
  return render(
    <AdminLastRefreshLine
      state={state}
      selectValue={selectValue}
      unavailableLabel="남는 기록이 없습니다."
    />,
  );
}

describe("AdminLastRefreshLine", () => {
  it("아직 부르지 않았으면 아무것도 세우지 않는다", () => {
    const { container } = renderLine({ status: "idle" });
    expect(container).toBeEmptyDOMElement();
  });

  it("부르는 동안임을 밝힌다", () => {
    renderLine({ status: "loading" });
    expect(screen.getByText("마지막 갱신 — 확인 중")).toBeInTheDocument();
  });

  it("서버 시각을 YY.MM.DD HH:mm으로 적는다", () => {
    renderLine({
      status: "success",
      result: { data: STATUS, meta: { asOf: "2026-09-08T00:00:00Z" } },
    });
    expect(
      screen.getByText(/마지막 갱신 — 26.09.08 09:31/),
    ).toBeInTheDocument();
  });

  it("서버에 값이 없으면 그 사유를 대신 적는다", () => {
    renderLine(
      {
        status: "success",
        result: { data: STATUS, meta: { asOf: "2026-09-08T00:00:00Z" } },
      },
      (status) => status.macro.lastRefreshedAt,
    );
    expect(screen.getByText(/남는 기록이 없습니다/)).toBeInTheDocument();
  });

  it("아직 열리지 않은 엔드포인트는 조용히 넘긴다", () => {
    renderLine({
      status: "error",
      error: {
        message: "찾을 수 없습니다.",
        code: "NOT_FOUND",
        field: null,
        status: 404,
      },
    });
    expect(
      screen.getByText(/서버가 아직 제공하지 않습니다/),
    ).toBeInTheDocument();
    // 서버 메시지를 대신 세우지 않는다.
    expect(screen.queryByText(/찾을 수 없습니다/)).not.toBeInTheDocument();
  });

  it("그 밖의 실패는 서버 메시지를 그대로 남긴다", () => {
    renderLine({
      status: "error",
      error: {
        message: "DB에 연결하지 못했습니다.",
        code: "INTERNAL_ERROR",
        field: null,
        status: 500,
      },
    });
    expect(
      screen.getByText(/DB에 연결하지 못했습니다/),
    ).toBeInTheDocument();
  });
});
