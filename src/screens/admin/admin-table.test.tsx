import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminTable } from "./admin-table";

interface Row {
  readonly id: number;
  readonly name: string | null;
  readonly isSupported: boolean;
}

const ROWS: readonly Row[] = [
  { id: 1, name: "USD", isSupported: true },
  { id: 2, name: null, isSupported: false },
];

const COLUMNS = [{ key: "id" }, { key: "name" }, { key: "isSupported" }];

describe("AdminTable", () => {
  it("컬럼 키를 그대로 헤더로 세우고 값을 표시한다", () => {
    render(
      <AdminTable
        columns={COLUMNS}
        rows={ROWS}
        getRowKey={(row) => String(row.id)}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "isSupported" })).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
    // 값이 없는 칸은 - 로 둔다.
    expect(screen.getAllByText("-")).toHaveLength(1);
  });

  it("header가 있으면 그 문구를 헤더로 세운다", () => {
    render(
      <AdminTable
        columns={[{ key: "id", header: "id (내부 식별자)" }]}
        rows={ROWS}
        getRowKey={(row) => String(row.id)}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: "id (내부 식별자)" }),
    ).toBeInTheDocument();
  });

  it("행이 없으면 안내 문구를 보여준다", () => {
    render(
      <AdminTable columns={COLUMNS} rows={[]} getRowKey={() => "none"} />,
    );
    expect(screen.getByText("없음")).toBeInTheDocument();

    render(
      <AdminTable
        columns={COLUMNS}
        rows={[]}
        getRowKey={() => "none"}
        emptyLabel="조회된 사용자가 없습니다."
      />,
    );
    expect(screen.getByText("조회된 사용자가 없습니다.")).toBeInTheDocument();
  });

  it("행 클릭과 Enter로 선택을 알린다", () => {
    const onSelectRow = vi.fn();
    render(
      <AdminTable
        columns={COLUMNS}
        rows={ROWS}
        getRowKey={(row) => String(row.id)}
        onSelectRow={onSelectRow}
      />,
    );

    const rows = screen.getAllByRole("row").slice(1);
    fireEvent.click(rows[0]!);
    fireEvent.keyDown(rows[1]!, { key: "Enter" });
    fireEvent.keyDown(rows[1]!, { key: "Escape" });

    expect(onSelectRow).toHaveBeenCalledTimes(2);
    expect(onSelectRow).toHaveBeenNthCalledWith(1, ROWS[0]);
    expect(onSelectRow).toHaveBeenNthCalledWith(2, ROWS[1]);
  });

  it("톤과 직접 렌더를 적용한다", () => {
    render(
      <AdminTable
        columns={[
          { key: "id" },
          { key: "name", render: (row: Row) => <em>{row.name ?? "빈 값"}</em> },
        ]}
        rows={ROWS}
        getRowKey={(row) => String(row.id)}
        getRowTone={(row) => (row.isSupported ? "default" : "muted")}
      />,
    );

    expect(screen.getByText("빈 값")).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]!.className).toBe("");
    expect(rows[1]!.className).toContain("admin-table__row--muted");
  });
});
