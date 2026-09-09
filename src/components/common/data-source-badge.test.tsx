import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DataSourceBadge,
  getDataSourceCopy,
  toApiDataSourceKind,
} from "./data-source-badge";

describe("DataSourceBadge", () => {
  it.each([
    ["demo", "데모 데이터"],
    ["sample", "샘플 데이터"],
    ["account", "내 계정 데이터"],
    ["unknown", "서버 조회 데이터"],
  ] as const)("%s 출처를 사용자 문구로 표시한다", (kind, label) => {
    render(<DataSourceBadge kind={kind} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(getDataSourceCopy(kind).description).not.toBe("");
  });

  it("서버의 샘플 여부를 데모 여부와 섞지 않고 정규화한다", () => {
    expect(toApiDataSourceKind(true)).toBe("sample");
    expect(toApiDataSourceKind(false)).toBe("account");
    expect(toApiDataSourceKind(undefined)).toBe("unknown");
  });
});
