import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { previewAdminExtraction } from "../../api/admin";
import { ApiError } from "../../api/client";
import { AdminAiExtractScreen } from "./admin-ai-extract-screen";

vi.mock("../../api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/admin")>();
  return {
    ADMIN_EXTRACT_TEXT_MAX_LENGTH: actual.ADMIN_EXTRACT_TEXT_MAX_LENGTH,
    NOOP_EXTRACTOR: actual.NOOP_EXTRACTOR,
    previewAdminExtraction: vi.fn(),
  };
});

const META = { asOf: "2026-09-07T00:00:00Z" };

/** 서버가 URL로 본문을 수집했을 때만 채워지는 값들. 기본은 모두 null이다. */
const NO_FETCH = {
  resolvedSourceUrl: null,
  fetchedCharCount: null,
  fetchedTextPreview: null,
  failureReason: null,
};

beforeEach(() => {
  vi.mocked(previewAdminExtraction).mockReset();
});

function fillAndSubmit(text = "뉴스 원문") {
  fireEvent.change(screen.getByLabelText(/^text —/), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: "추출 미리보기" }));
}

describe("AdminAiExtractScreen", () => {
  it("저장되지 않는 미리보기임을 알리고, 입력이 하나도 없으면 보내지 않는다", () => {
    render(<AdminAiExtractScreen onAuthFailure={vi.fn()} />);

    expect(
      screen.getByText(
        "이 화면의 결과는 저장되지 않습니다. 추출 결과를 확인만 합니다.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "추출 미리보기" }),
    ).toBeDisabled();
  });

  it("source_url과 text를 보내고 후보를 표로 보여준다", async () => {
    vi.mocked(previewAdminExtraction).mockResolvedValue({
      data: {
        extractor: "ClaudeEconEventExtractor",
        count: 2,
        previewedAt: "2026-09-07T00:00:00Z",
        candidates: [
          {
            eventDate: "2026-09-10",
            region: "US",
            title: "FOMC",
            impact: 3,
            valid: true,
            rejectReason: null,
          },
          {
            eventDate: null,
            region: "KR",
            title: "미상",
            impact: null,
            valid: false,
            rejectReason: "행사 일자를 찾지 못함",
          },
        ],
        ...NO_FETCH,
      },
      meta: META,
    });

    render(<AdminAiExtractScreen onAuthFailure={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^source_url/), {
      target: { value: "https://news.example/1" },
    });
    fillAndSubmit();

    await waitFor(() =>
      expect(previewAdminExtraction).toHaveBeenCalledWith({
        sourceUrl: "https://news.example/1",
        text: "뉴스 원문",
      }),
    );

    expect(await screen.findByText("FOMC")).toBeInTheDocument();
    expect(screen.getByText("count")).toBeInTheDocument();
    expect(screen.getByText("previewedAt")).toBeInTheDocument();
    // valid=false 행은 사유를 강조한다.
    const rejectReason = screen.getByText("행사 일자를 찾지 못함");
    expect(rejectReason.tagName).toBe("STRONG");
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[1]!.className).toContain("admin-table__row--danger");
  });

  it("extractor가 noop이면 꺼져 있다고 알린다", async () => {
    vi.mocked(previewAdminExtraction).mockResolvedValue({
      data: {
        extractor: "NoOpEconEventExtractor",
        count: 0,
        previewedAt: "2026-09-07T00:00:00Z",
        candidates: [],
        ...NO_FETCH,
      },
      meta: META,
    });

    render(<AdminAiExtractScreen onAuthFailure={vi.fn()} />);
    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "추출기가 꺼져 있습니다(ANTHROPIC_EXTRACT_ENABLED=false).",
    );
    expect(screen.getByText("후보가 없습니다.")).toBeInTheDocument();
  });

  it("실패 메시지를 그대로 보여준다", async () => {
    vi.mocked(previewAdminExtraction).mockRejectedValue(
      new ApiError("원문이 너무 깁니다.", 400, "VALIDATION_FAILED", "text"),
    );

    render(<AdminAiExtractScreen onAuthFailure={vi.fn()} />);
    fillAndSubmit();

    expect(await screen.findByText("원문이 너무 깁니다.")).toBeInTheDocument();
  });

  it("보내는 동안 안내를 남긴다", async () => {
    let resolvePreview: (value: never) => void = () => undefined;
    vi.mocked(previewAdminExtraction).mockReturnValue(
      new Promise((resolve) => {
        resolvePreview = resolve as (value: never) => void;
      }),
    );

    render(<AdminAiExtractScreen onAuthFailure={vi.fn()} />);
    fillAndSubmit();

    expect(
      await screen.findByText("추출 결과를 기다리는 중입니다."),
    ).toBeInTheDocument();
    resolvePreview({
      data: {
        extractor: "ClaudeEconEventExtractor",
        count: 0,
        previewedAt: "2026-09-07T00:00:00Z",
        candidates: [],
        ...NO_FETCH,
      },
      meta: META,
    } as never);
    await screen.findByText("후보가 없습니다.");
  });
});

describe("AdminAiExtractScreen — URL 입력", () => {
  it("URL만 넣어도 보낼 수 있다", async () => {
    vi.mocked(previewAdminExtraction).mockResolvedValue({
      data: {
        extractor: "ClaudeEconEventExtractor",
        count: 0,
        previewedAt: "2026-09-07T00:00:00Z",
        candidates: [],
        ...NO_FETCH,
      },
      meta: META,
    });

    render(<AdminAiExtractScreen onAuthFailure={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^source_url/), {
      target: { value: "https://news.example/1" },
    });

    const submit = screen.getByRole("button", { name: "추출 미리보기" });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() =>
      expect(previewAdminExtraction).toHaveBeenCalledWith({
        sourceUrl: "https://news.example/1",
        text: "",
      }),
    );
  });

  it("공백만 넣으면 보낼 수 없다", () => {
    render(<AdminAiExtractScreen onAuthFailure={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^source_url/), {
      target: { value: "   " },
    });

    expect(
      screen.getByRole("button", { name: "추출 미리보기" }),
    ).toBeDisabled();
  });

  it("서버가 수집한 본문과 실패 사유를 함께 보여준다", async () => {
    vi.mocked(previewAdminExtraction).mockResolvedValue({
      data: {
        extractor: "ClaudeEconEventExtractor",
        count: 0,
        previewedAt: "2026-09-08T00:31:07Z",
        candidates: [],
        resolvedSourceUrl: "https://news.example/1?utm=x",
        fetchedCharCount: 4210,
        fetchedTextPreview: "연준은 이번 회의에서",
        failureReason: "본문에서 행사 일자를 찾지 못했습니다.",
      },
      meta: META,
    });

    render(<AdminAiExtractScreen onAuthFailure={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^source_url/), {
      target: { value: "https://news.example/1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "추출 미리보기" }));

    expect(
      await screen.findByText("https://news.example/1?utm=x"),
    ).toBeInTheDocument();
    expect(screen.getByText("4,210")).toBeInTheDocument();
    expect(
      screen.getByText("서버가 수집한 본문 (앞부분)"),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "본문에서 행사 일자를 찾지 못했습니다.",
    );
    // previewedAt도 읽히는 형태로 적는다. (서울 09:31)
    expect(screen.getByText("26.09.08 09:31")).toBeInTheDocument();
  });
});
