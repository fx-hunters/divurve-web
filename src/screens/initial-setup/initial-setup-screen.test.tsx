import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DIAGNOSIS_PROGRESS_STORAGE_KEY,
  readDiagnosisProgress,
  writeDiagnosisProgress,
} from "../../api/diagnosis-progress-store";
import { readProfilePreferences } from "../../api/profile-preferences-store";
import { fetchImportedAssetSummary } from "../../api/asset-import";
import { IMPORTED_ASSET_SUMMARY_FIXTURE } from "../../test/api-fixtures";
import type { ImportedAssetSummary } from "../../types/assets";
import { calculateQuickRiskResult } from "./risk-diagnosis";
import { InitialSetupScreen } from "./initial-setup-screen";

vi.mock("../../api/asset-import", () => ({
  fetchImportedAssetSummary: vi.fn(),
}));

function enterRiskStep() {
  fireEvent.click(screen.getByRole("radio", { name: /금융·경제/ }));
  fireEvent.click(screen.getByRole("button", { name: "다음" }));
  fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
}

function answerQuick(choiceLabels: readonly RegExp[]) {
  choiceLabels.forEach((label, index) => {
    fireEvent.click(screen.getByRole("radio", { name: label }));
    fireEvent.click(
      screen.getByRole("button", {
        name: index === 2 ? "결과 보기" : "다음 질문",
      }),
    );
  });
}

function seedQuickResult() {
  const quickResult = calculateQuickRiskResult({ Q1: "B", Q2: "B", Q3: "B" });
  writeDiagnosisProgress({ status: "quickComplete", quickResult });
  return quickResult;
}

describe("InitialSetupScreen", () => {
  beforeEach(() => {
    sessionStorage.clear();
    // 기본값은 응답이 오지 않는 조회다. 자산 단계를 지나칠 뿐인 테스트가
    // 예상 못 한 상태 전이를 만들지 않게 한다.
    vi.mocked(fetchImportedAssetSummary).mockReset();
    vi.mocked(fetchImportedAssetSummary).mockReturnValue(
      new Promise<ImportedAssetSummary>(() => {}),
    );
  });

  it("첫 화면에는 설명 분야 한 단계만 표시한다", () => {
    render(<InitialSetupScreen onComplete={vi.fn()} />);

    expect(
      screen.getByRole("heading", {
        name: "어떤 분야의 설명이 가장 익숙한가요?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
    expect(screen.queryByText("지금 보유한 자산이에요")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이전" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
  });

  it("자산 불러오기 선택 뒤 서버 조회 결과를 표시하고 입력값을 유지한다", async () => {
    let resolveImport!: (value: ImportedAssetSummary) => void;
    vi.mocked(fetchImportedAssetSummary).mockReturnValue(
      new Promise<ImportedAssetSummary>((resolve) => {
        resolveImport = resolve;
      }),
    );
    render(<InitialSetupScreen onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole("radio", { name: /개발·기술/ }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(
      screen.getByRole("button", { name: "자산 불러오기" }),
    ).toBeInTheDocument();
    expect(fetchImportedAssetSummary).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "자산 불러오기" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "보유 자산을 확인하고 있어요",
    );

    await act(async () => {
      resolveImport(IMPORTED_ASSET_SUMMARY_FIXTURE);
    });

    expect(await screen.findByText("자산을 확인했어요")).toBeInTheDocument();
    expect(screen.getByText("64,058,000원")).toBeInTheDocument();
    expect(screen.getByText("36,000,000원")).toBeInTheDocument();
    expect(screen.getByText("USD · JPY · EUR")).toBeInTheDocument();
    expect(screen.getByText("샘플 데이터")).toBeInTheDocument();
    expect(screen.getByText("AAPL · 12주 · USD")).toBeInTheDocument();
    expect(screen.getByText("400,000 JPY")).toBeInTheDocument();
    expect(screen.getByText("생활비 통장 · 12,000,000원")).toBeInTheDocument();
    expect(fetchImportedAssetSummary).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    expect(screen.getByText("64,058,000원")).toBeInTheDocument();
    // 되돌아와도 이미 확인한 자산을 다시 조회하지 않는다.
    expect(fetchImportedAssetSummary).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    expect(screen.getByRole("radio", { name: /개발·기술/ })).toBeChecked();
    expect(readProfilePreferences()).toMatchObject({ explanationDomain: "dev" });
  });

  it("기준 시각을 못 받으면 출처만 표시한다", async () => {
    vi.mocked(fetchImportedAssetSummary).mockResolvedValue({
      ...IMPORTED_ASSET_SUMMARY_FIXTURE,
      currencyCodes: [],
      asOf: "",
    });
    render(<InitialSetupScreen onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole("radio", { name: /개발·기술/ }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(screen.getByRole("button", { name: "자산 불러오기" }));

    expect(await screen.findByText("자산을 확인했어요")).toBeInTheDocument();
    expect(
      screen.getByText(/현재 계정에 준비된 샘플 자산을 서버에서 조회했습니다/),
    ).toBeInTheDocument();
    expect(screen.getByText("보유한 외화 없음")).toBeInTheDocument();
  });

  it("자산 조회 오류를 표시하고 다시 시도할 수 있다", async () => {
    vi.mocked(fetchImportedAssetSummary)
      .mockRejectedValueOnce(new Error("조회 실패"))
      .mockRejectedValueOnce("unknown error");
    render(<InitialSetupScreen onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole("radio", { name: /일상적인 설명/ }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(screen.getByRole("button", { name: "자산 불러오기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("조회 실패");
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "보유 자산을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  });

  it("서버가 샘플이 아니라고 밝히면 내 계정 데이터 배지를 표시한다", async () => {
    vi.mocked(fetchImportedAssetSummary).mockResolvedValue({
      ...IMPORTED_ASSET_SUMMARY_FIXTURE,
      isSampleData: false,
    });
    render(<InitialSetupScreen onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole("radio", { name: /금융·경제/ }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(screen.getByRole("button", { name: "자산 불러오기" }));

    expect(await screen.findByText("내 계정 데이터")).toBeInTheDocument();
  });

  it("등록 자산이 없으면 빈 상태를 표시하고 다음 이동을 허용한다", async () => {
    vi.mocked(fetchImportedAssetSummary).mockResolvedValue({
      ...IMPORTED_ASSET_SUMMARY_FIXTURE,
      totalAssetKrw: 0,
      fxAssetKrw: 0,
      krwAssetKrw: 0,
      currencyCodes: [],
      hasAssets: false,
      holdings: [],
      deposits: [],
      krwAssets: [],
      isSampleData: undefined,
    });
    render(<InitialSetupScreen onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole("radio", { name: /금융·경제/ }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(screen.getByRole("button", { name: "자산 불러오기" }));

    expect(await screen.findByText("불러올 자산이 없습니다")).toBeInTheDocument();
    expect(screen.getByText("서버 조회 데이터")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });

  it("Q1~Q3를 한 문항씩 표시하고 항로형 결과 뒤 홈 시작 행동을 제공한다", () => {
    const onComplete = vi.fn();
    render(<InitialSetupScreen onComplete={onComplete} />);
    enterRiskStep();
    answerQuick([/일부를 줄이고/, /작은 변동까지/, /여러 번 나누어/]);

    expect(
      screen.getByRole("heading", { name: /현재 결과는 균형항로형 이에요/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("간편 진단 완료 · 3/9점")).toBeInTheDocument();
    expect(screen.getByText(/MVP 참고 진단/)).toBeInTheDocument();
    expect(readDiagnosisProgress()).toMatchObject({
      status: "quickComplete",
      quickResult: { label: "균형항로형", score: 3 },
    });
    expect(screen.queryByText(/3문항을 더 답하면/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "홈 시작하기" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("이전 문항의 답을 바꾸면 항로형 결과를 다시 계산한다", () => {
    render(<InitialSetupScreen onComplete={vi.fn()} />);
    enterRiskStep();
    answerQuick([/대부분 줄인다/, /변동이 작은 편/, /빨리 필요한 금액/]);
    expect(
      screen.getByRole("heading", { name: /현재 결과는 안정항로형 이에요/ }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    fireEvent.click(screen.getByRole("radio", { name: /추가 기회도 검토/ }));
    fireEvent.click(screen.getByRole("button", { name: "다음 질문" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 질문" }));
    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));
    expect(
      screen.getByRole("heading", { name: /현재 결과는 균형항로형 이에요/ }),
    ).toBeInTheDocument();
  });

  it("상세 진단은 별도 1/3 진행률로 재개하고 대표 점수를 바꾸지 않는다", () => {
    const onComplete = vi.fn();
    const quickResult = seedQuickResult();
    render(
      <InitialSetupScreen
        entryMode="detailedDiagnosis"
        onComplete={onComplete}
      />,
    );

    expect(screen.getByRole("region", { name: "상세 진단 진행률" })).toHaveTextContent(
      "1 / 3",
    );
    expect(screen.queryByLabelText("초기 설정 진행률")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /일부는 분리/ }));
    fireEvent.click(screen.getByRole("button", { name: "다음 질문" }));
    fireEvent.click(screen.getByRole("radio", { name: "핵심만 쉽게" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 질문" }));
    fireEvent.click(screen.getByRole("radio", { name: /몇 차례 경험/ }));
    fireEvent.click(screen.getByRole("button", { name: "상세 결과 보기" }));

    expect(screen.getByRole("heading", { name: /같은 균형항로형 결과/ })).toBeInTheDocument();
    expect(screen.getByLabelText("상세 진단 설명")).toHaveTextContent(
      "생활비와 일부 함께 관리",
    );
    expect(readDiagnosisProgress()).toMatchObject({
      status: "detailComplete",
      quickResult: { score: quickResult.score, kind: quickResult.kind },
    });
    expect(readProfilePreferences()).toMatchObject({ explanationLevel: "simple" });
    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    expect(screen.getByRole("radio", { name: /몇 차례 경험/ })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "상세 결과 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "상세 결과 확인하기" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("상세 진단을 미루면 첫 미응답 문항부터 이어갈 수 있다", () => {
    const onComplete = vi.fn();
    seedQuickResult();
    const { unmount } = render(
      <InitialSetupScreen entryMode="detailedDiagnosis" onComplete={onComplete} />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /명확하게 분리/ }));
    fireEvent.click(screen.getByRole("button", { name: "다음 질문" }));
    fireEvent.click(screen.getByRole("button", { name: "나중에 이어서" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(readDiagnosisProgress()).toMatchObject({
      status: "detailInProgress",
      detailedAnswers: { Q4: "C" },
    });

    unmount();
    render(
      <InitialSetupScreen entryMode="detailedDiagnosis" onComplete={vi.fn()} />,
    );
    expect(screen.getByRole("heading", { name: /어느 정도 깊이/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    expect(screen.getByRole("radio", { name: /명확하게 분리/ })).toBeChecked();
  });

  it("마이페이지 간편 진단 모드는 초기 설정 Shell 없이 Q1부터 시작한다", () => {
    render(
      <InitialSetupScreen entryMode="quickDiagnosis" onComplete={vi.fn()} />,
    );
    expect(screen.getByRole("region", { name: "간편 진단 진행률" })).toHaveTextContent(
      "1 / 3",
    );
    expect(screen.getAllByText("간편 진단")).toHaveLength(2);
    expect(screen.queryByText("초기 설정")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이전" })).toBeDisabled();
  });

  it("각 상위 단계를 건너뛰면 임의 기본값 없이 완료한다", () => {
    const onComplete = vi.fn();
    render(<InitialSetupScreen onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("radio", { name: /마케팅·브랜드/ }));
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    fireEvent.click(screen.getByRole("button", { name: "진단 건너뛰고 홈으로" }));

    expect(onComplete).toHaveBeenCalledWith({
      draft: {},
      skippedSteps: ["explanationDomain", "assets", "riskProfile"],
    });
    expect(sessionStorage.getItem(DIAGNOSIS_PROGRESS_STORAGE_KEY)).toBeNull();
    expect(readProfilePreferences()).toEqual({});
  });

  it("360px와 reduced-motion 환경에서도 진행률과 주요 조작을 제공한다", async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 360 });
    const matchMedia = vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    const { container } = render(<InitialSetupScreen onComplete={vi.fn()} />);
    expect(container.querySelector(".initial-setup")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "초기 설정 진행률" })).toBeVisible();
    expect(screen.getByRole("button", { name: "건너뛰기" })).toBeVisible();
    await waitFor(() => expect(matchMedia).toHaveBeenCalledTimes(0));
    matchMedia.mockRestore();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  });
});
