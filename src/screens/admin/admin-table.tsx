/**
 * 관리자 콘솔 공용 표.
 *
 * 표현만 담당하고 데이터를 가져오지 않는다(AGENTS.md 7.2).
 * 값 표시는 `formatAdminValue`에 맡겨 반올림·가공이 끼어들지 않게 한다.
 */
import type { ReactNode } from "react";
import { formatAdminValue } from "./admin-value";

export type AdminRowTone = "default" | "muted" | "danger";

export interface AdminColumn<Row> {
  /** 행 객체에서 값을 꺼낼 키. 헤더 문구로도 그대로 쓴다. */
  readonly key: string;
  /** 기본 표시로 부족한 칸만 직접 그린다. */
  readonly render?: (row: Row) => ReactNode;
}

interface AdminTableProps<Row> {
  readonly columns: readonly AdminColumn<Row>[];
  readonly rows: readonly Row[];
  readonly getRowKey: (row: Row, index: number) => string;
  readonly onSelectRow?: (row: Row) => void;
  readonly getRowTone?: (row: Row) => AdminRowTone;
  readonly emptyLabel?: string;
}

const TONE_STYLE: Record<AdminRowTone, string> = {
  default: "",
  muted: "admin-table__row--muted",
  danger: "admin-table__row--danger",
};

export function AdminTable<Row>({
  columns,
  rows,
  getRowKey,
  onSelectRow,
  getRowTone,
  emptyLabel = "없음",
}: AdminTableProps<Row>) {
  if (rows.length === 0) {
    return <p className="admin-empty">{emptyLabel}</p>;
  }

  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const tone = getRowTone ? getRowTone(row) : "default";
            return (
              <tr
                key={getRowKey(row, index)}
                className={`${TONE_STYLE[tone]} ${
                  onSelectRow ? "admin-table__row--clickable" : ""
                }`.trim()}
                // 행 클릭으로 상세로 이동한다. 마우스만 되면 곤란하므로
                // 포커스와 Enter도 같은 동작에 연결한다.
                tabIndex={onSelectRow ? 0 : undefined}
                onClick={onSelectRow ? () => onSelectRow(row) : undefined}
                onKeyDown={
                  onSelectRow
                    ? (event) => {
                        if (event.key === "Enter") onSelectRow(row);
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render
                      ? column.render(row)
                      : formatAdminValue(
                          (row as Readonly<Record<string, unknown>>)[column.key],
                        )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
