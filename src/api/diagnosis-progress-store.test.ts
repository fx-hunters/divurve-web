import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDiagnosisProgress,
  DIAGNOSIS_PROGRESS_STORAGE_KEY,
  readDiagnosisProgress,
  writeDiagnosisProgress,
} from "./diagnosis-progress-store";
import { calculateQuickRiskResult } from "../screens/initial-setup/risk-diagnosis";

const quickResult = calculateQuickRiskResult({ Q1: "B", Q2: "B", Q3: "B" });

describe("diagnosis progress session store", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("저장값이 없거나 올바르지 않으면 미측정으로 복구한다", () => {
    expect(readDiagnosisProgress()).toEqual({ status: "unmeasured" });

    sessionStorage.setItem(DIAGNOSIS_PROGRESS_STORAGE_KEY, "null");
    expect(readDiagnosisProgress()).toEqual({ status: "unmeasured" });

    sessionStorage.setItem(DIAGNOSIS_PROGRESS_STORAGE_KEY, JSON.stringify({}));
    expect(readDiagnosisProgress()).toEqual({ status: "unmeasured" });

    sessionStorage.setItem(
      DIAGNOSIS_PROGRESS_STORAGE_KEY,
      JSON.stringify({ status: "unknown" }),
    );
    expect(readDiagnosisProgress()).toEqual({ status: "unmeasured" });

    sessionStorage.setItem(DIAGNOSIS_PROGRESS_STORAGE_KEY, "{");
    expect(readDiagnosisProgress()).toEqual({ status: "unmeasured" });
  });

  it.each([
    { status: "unmeasured" },
    { status: "quickComplete", quickResult },
    { status: "detailInProgress", quickResult, detailedAnswers: { Q4: "A" } },
    {
      status: "detailComplete",
      quickResult,
      detailedAnswers: { Q4: "A", Q5: "B", Q6: "C" },
    },
  ] as const)("$status 상태를 쓰고 다시 읽는다", (progress) => {
    expect(writeDiagnosisProgress(progress)).toBe(true);
    expect(readDiagnosisProgress()).toEqual(progress);
    expect(clearDiagnosisProgress()).toBe(true);
    expect(readDiagnosisProgress()).toEqual({ status: "unmeasured" });
  });

  it("브라우저 저장소 사용이 막혀도 안전하게 실패 상태를 반환한다", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readDiagnosisProgress()).toEqual({ status: "unmeasured" });
    vi.restoreAllMocks();

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(writeDiagnosisProgress({ status: "unmeasured" })).toBe(false);
    vi.restoreAllMocks();

    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(clearDiagnosisProgress()).toBe(false);
  });
});
