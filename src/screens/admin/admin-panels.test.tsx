import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AdminErrorPanel,
  AdminIdlePanel,
  AdminLoadingPanel,
  AdminMetaLine,
  AdminRawPanel,
  AdminSection,
} from "./admin-panels";

describe("AdminSection", () => {
  it("제목만으로도 렌더하고, 설명·액션이 있으면 함께 보여준다", () => {
    const { rerender } = render(
      <AdminSection title="사용자">
        <p>본문</p>
      </AdminSection>,
    );
    expect(screen.getByRole("heading", { name: "사용자" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(
      <AdminSection
        title="사용자"
        description="설명"
        action={<button type="button">다시</button>}
      >
        <p>본문</p>
      </AdminSection>,
    );
    expect(screen.getByText("설명")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시" })).toBeInTheDocument();
  });
});

describe("AdminErrorPanel", () => {
  it("메시지와 함께 code·status·field를 드러낸다", () => {
    render(
      <AdminErrorPanel
        error={{
          message: "기간이 올바르지 않습니다.",
          code: "VALIDATION_FAILED",
          field: "from",
          status: 400,
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "기간이 올바르지 않습니다.",
    );
    expect(screen.getByText("VALIDATION_FAILED")).toBeInTheDocument();
    expect(screen.getByText("400")).toBeInTheDocument();
    expect(screen.getByText("from")).toBeInTheDocument();
  });
});

describe("AdminLoadingPanel / AdminIdlePanel", () => {
  it("각각의 안내 문구를 보여준다", () => {
    render(<AdminLoadingPanel label="불러오는 중" />);
    expect(screen.getByRole("status")).toHaveTextContent("불러오는 중");

    render(<AdminIdlePanel label="아직 부르지 않았습니다" />);
    expect(screen.getByText("아직 부르지 않았습니다")).toBeInTheDocument();
  });
});

describe("AdminMetaLine", () => {
  it("meta 항목을 그대로 나열한다", () => {
    render(<AdminMetaLine meta={{ asOf: "2026-09-07T00:00:00Z" }} />);
    expect(screen.getByText("asOf")).toBeInTheDocument();
    expect(screen.getByText("2026-09-07T00:00:00Z")).toBeInTheDocument();
  });

  it("meta가 비면 아무것도 그리지 않는다", () => {
    const { container } = render(
      <AdminMetaLine meta={{} as { asOf: string }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("AdminRawPanel", () => {
  it("응답 원문을 그대로 남긴다", () => {
    render(<AdminRawPanel title="응답 원문" value={{ updatedCount: 3 }} />);
    expect(screen.getByText("응답 원문")).toBeInTheDocument();
    expect(screen.getByText(/"updatedCount": 3/)).toBeInTheDocument();
  });
});
