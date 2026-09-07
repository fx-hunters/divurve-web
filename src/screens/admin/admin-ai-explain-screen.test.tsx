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
        verification: { numericMatch: true, blockedPhrases: [] },
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
        verification: { numericMatch: false, blockedPhrases: ["추천", "보장"] },
      },
      meta: META,
    });

    render(<AdminAiExplainScreen onAuthFailure={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "호출" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("fallback=true");
    expect(screen.getByText("추천, 보장")).toBeInTheDocument();
    expect(screen.getByText("문장이 없습니다.")).toBeInTheDocument();
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
        verification: { numericMatch: null, blockedPhrases: [] },
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
