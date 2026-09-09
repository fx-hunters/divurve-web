import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Footer } from "./footer";

describe("Footer", () => {
  it("면책 안내 문구를 렌더링한다", () => {
    render(<Footer />);
    expect(
      screen.getByText(/이 정보는 투자 권유가 아니며 실제 거래 전 별도 확인이 필요합니다/),
    ).toBeInTheDocument();
    expect(screen.getByText(/데모 세션 · 화면별 출처 확인/)).toBeInTheDocument();
  });

  it("회원 계정의 데이터 출처를 표시한다", () => {
    render(<Footer accountKind="member" />);
    expect(screen.getByText(/계정 세션 · 화면별 출처 확인/)).toBeInTheDocument();
  });
});
