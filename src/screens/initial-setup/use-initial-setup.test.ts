import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_IMPORTED_ASSET_SUMMARY } from "../../api/fixtures/initial-setup-assets";
import {
  readDiagnosisProgress,
  writeDiagnosisProgress,
} from "../../api/diagnosis-progress-store";
import { calculateQuickRiskResult } from "./risk-diagnosis";
import { useInitialSetup } from "./use-initial-setup";

describe("useInitialSetup", () => {
  beforeEach(() => sessionStorage.clear());

  it("선택 전 이동과 현재 단계와 맞지 않는 응답을 무시한다", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useInitialSetup(onComplete));

    act(() => {
      result.current.actions.goBack();
      result.current.actions.goNext();
      result.current.actions.selectQuickAnswer("D");
      result.current.actions.selectDetailedAnswer("C");
      result.current.actions.deferDetailedDiagnosis();
    });

    expect(result.current.state.currentStepNumber).toBe(1);
    expect(result.current.state.draft).toEqual({});
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("자산 불러오기 중 중복 요청을 막고 완료 값을 유지한다", async () => {
    let resolveImport!: (value: typeof MOCK_IMPORTED_ASSET_SUMMARY) => void;
    const importAssets = vi.fn(
      () => new Promise<typeof MOCK_IMPORTED_ASSET_SUMMARY>((resolve) => {
        resolveImport = resolve;
      }),
    );
    const { result } = renderHook(() =>
      useInitialSetup(vi.fn(), { dependencies: { importAssets } }),
    );

    act(() => result.current.actions.selectExplanationDomain("plain"));
    act(() => result.current.actions.goNext());
    await act(async () => {
      void result.current.actions.startAssetImport();
    });
    expect(result.current.state.assetImport.status).toBe("loading");
    await act(async () => {
      await result.current.actions.startAssetImport();
    });
    expect(importAssets).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveImport(MOCK_IMPORTED_ASSET_SUMMARY);
      await Promise.resolve();
    });
    expect(result.current.state.assetImport).toEqual({
      status: "success",
      data: MOCK_IMPORTED_ASSET_SUMMARY,
    });
    expect(result.current.state.draft.importedAssets).toBe(
      MOCK_IMPORTED_ASSET_SUMMARY,
    );
  });

  it("마이페이지의 미측정 진입은 Q1에서 시작하고 이전으로 온보딩 단계에 가지 않는다", () => {
    const { result } = renderHook(() =>
      useInitialSetup(vi.fn(), { entryMode: "detailedDiagnosis" }),
    );

    expect(result.current.state.currentStep).toBe("riskProfile");
    expect(result.current.state.canGoBack).toBe(false);
    act(() => result.current.actions.goBack());
    expect(result.current.state.currentStep).toBe("riskProfile");
    expect(result.current.state.riskFlow).toEqual({
      kind: "quickQuestion",
      questionIndex: 0,
    });
  });

  it("상세 진단 첫 문항에서 이전은 상태를 유지하고 무응답 이탈은 간편 완료로 보존한다", () => {
    const quickResult = calculateQuickRiskResult({ Q1: "B", Q2: "B", Q3: "B" });
    writeDiagnosisProgress({ status: "quickComplete", quickResult });
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useInitialSetup(onComplete, { entryMode: "detailedDiagnosis" }),
    );

    act(() => result.current.actions.goBack());
    expect(result.current.state.riskFlow).toMatchObject({
      kind: "detailQuestion",
      questionIndex: 0,
    });
    act(() => result.current.actions.deferDetailedDiagnosis());
    expect(readDiagnosisProgress()).toMatchObject({ status: "quickComplete" });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
