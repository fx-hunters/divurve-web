import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestExplanation } from "../../api/ai-explain";
import { ApiError } from "../../api/client";
import {
  AdminAiExplainScreen,
  parseFactsInput,
} from "./admin-ai-explain-screen";

vi.mock("../../api/ai-explain", () => ({ requestExplanation: vi.fn() }));

const META = { asOf: "2026-09-07T00:00:00Z" };

beforeEach(() => {
  vi.mocked(requestExplanation).mockReset();
});

describe("parseFactsInput", () => {
  it("JSON을 읽고, 실패하면 사유를 돌려준다", () => {
    expect(parseFactsInput('{"a":1}')).toEqual({
      status: "ok",
      facts: { a: 1 },
    });
    const failure = parseFactsInput("{");
    expect(failure.status).toBe("error");
    expect(failure).toMatchObject({
      message: expect.stringContaining("facts를 JSON으로 읽지 못했습니다"),
    });
  });
});

describe("AdminAiExplainScreen", () => {
  it("facts를 파싱해 surface와 함께 보낸다", async () => {
    vi.mocked(requestExplanation).mockResolvedValue({
      data: {
        explanation: {
          sentences: ["첫 문장", "둘째 문장"],
          sentenceCount: 2,
          explainLevel: "standard",
          explainDomain: "dev",
          fallback: false,
        },
        verification: {
          numericMatch: true,
          regimeDisclosed: true,
          blockedPhrases: [],
          fallbackReason: null,
        },
      },
      meta: META,
    });

    render(<AdminAiExplainScreen onAuthFailure={vi.fn()} />);

    expect(
      screen.getByText("facts를 채우고 호출을 누르세요."),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("facts (JSON)"), {
      target: { value: '{"pair_code":"USDKRW"}' },
    });
    fireEvent.click(screen.getByRole("button", { name: "호출" }));

    await waitFor(() =>
      expect(requestExplanation).toHaveBeenCalledWith({
        surface: "forecast_summary",
        facts: { pair_code: "USDKRW" },
      }),
    );
    expect(await screen.findByText("첫 문장")).toBeInTheDocument();
    expect(screen.getByText("standard")).toBeInTheDocument();
    // explain_level·explain_domain 입력란은 두지 않는다.
    expect(screen.queryByLabelText("explain_level")).not.toBeInTheDocument();
  });

  it("fallback=true면 경고와 verification을 함께 보여준다", async () => {
    vi.mocked(requestExplanation).mockResolvedValue({
      data: {
        explanation: {
          sentences: [],
          sentenceCount: 0,
          explainLevel: null,
          explainDomain: null,
          fallback: true,
        },
        // 금지 표현 경로. 서버는 검출 즉시 폴백하므로 수치 대조까지 가지 못해
        // numericMatch 는 null 이고 사유는 blocked_phrases 다.
        verification: {
          numericMatch: null,
          regimeDisclosed: null,
          blockedPhrases: ["반드시", "수익을 보장"],
          fallbackReason: "blocked_phrases",
        },
      },
      meta: META,
    });

    render(<AdminAiExplainScreen onAuthFailure={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "호출" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("fallback=true");
    // 사유를 문구로 함께 보여준다 — 예전에는 fallback=true 만 뜨고 왜인지는
    // 서버 로그를 뒤져야 알 수 있었다.
    expect(alert).toHaveTextContent("금지 표현이 검출됨");
    expect(
      screen.getByText("blocked_phrases — 금지 표현이 검출됨"),
    ).toBeInTheDocument();
    expect(screen.getByText("반드시, 수익을 보장")).toBeInTheDocument();
    // 측정 자체가 없었던 것을 "통과" 로 읽지 않도록 덧붙인다.
    expect(
      screen.getByText(/검증 단계에 닿지 못했다/),
    ).toBeInTheDocument();
    expect(screen.getByText("문장이 없습니다.")).toBeInTheDocument();
  });

  // 서버 계약상 fallback=true 면 사유가 반드시 온다. 그래도 프론트가 모르는
  // 사유 문자열은 null로 떨어지므로, 그때도 안내가 끊기지 않아야 한다.
  it("모르는 사유로 폴백하면 사유 없이 verification을 보라고 안내한다", async () => {
    vi.mocked(requestExplanation).mockResolvedValue({
      data: {
        explanation: {
          sentences: [],
          sentenceCount: 0,
          explainLevel: null,
          explainDomain: null,
          fallback: true,
        },
        verification: {
          numericMatch: null,
          regimeDisclosed: null,
          blockedPhrases: [],
          fallbackReason: null,
        },
      },
      meta: META,
    });

    render(<AdminAiExplainScreen onAuthFailure={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "호출" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("아래 verification을 확인하세요.");
  });

  it("blockedPhrases가 비면 -로 둔다", async () => {
    vi.mocked(requestExplanation).mockResolvedValue({
      data: {
        explanation: {
          sentences: ["문장"],
          sentenceCount: 1,
          explainLevel: null,
          explainDomain: null,
          fallback: null,
        },
        // 성공 경로. fallbackReason 은 성공이면 항상 null 이다.
        verification: {
          numericMatch: true,
          regimeDisclosed: true,
          blockedPhrases: [],
          fallbackReason: null,
        },
      },
      meta: META,
    });

    render(<AdminAiExplainScreen onAuthFailure={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "호출" }));

    await screen.findByText("문장");
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("facts가 JSON이 아니면 호출하지 않고 사유를 보여준다", async () => {
    render(<AdminAiExplainScreen onAuthFailure={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("facts (JSON)"), {
      target: { value: "{" },
    });
    fireEvent.click(screen.getByRole("button", { name: "호출" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "facts를 JSON으로 읽지 못했습니다",
    );
    expect(requestExplanation).not.toHaveBeenCalled();
  });

  it("surface를 바꿔 보낼 수 있고, 실패 메시지는 그대로 보여준다", async () => {
    vi.mocked(requestExplanation).mockRejectedValue(
      new ApiError("surface가 필요합니다.", 400, "VALIDATION_FAILED", "surface"),
    );

    render(<AdminAiExplainScreen onAuthFailure={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("surface"), {
      target: { value: "route_summary" },
    });
    fireEvent.click(screen.getByRole("button", { name: "호출" }));

    await waitFor(() =>
      expect(requestExplanation).toHaveBeenCalledWith(
        expect.objectContaining({ surface: "route_summary" }),
      ),
    );
    expect(
      await screen.findByText("surface가 필요합니다."),
    ).toBeInTheDocument();
  });
});

describe("AdminAiExplainScreen — 배치", () => {
  it("입력 카드와 결과 카드를 좌우로 나눠 세운다", () => {
    const { container } = render(
      <AdminAiExplainScreen onAuthFailure={vi.fn()} />,
    );

    expect(
      screen.getByRole("heading", { name: "입력", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "결과", level: 2 }),
    ).toBeInTheDocument();
    // 두 카드가 같은 분할 컨테이너 안에 나란히 있다.
    const split = container.querySelector(".admin-split");
    expect(split?.querySelectorAll(".admin-section")).toHaveLength(2);
  });
});
