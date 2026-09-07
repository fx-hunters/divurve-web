import { describe, expect, it } from "vitest";
import {
  DETAILED_DIAGNOSIS_PATH,
  DIAGNOSIS_RESULT_PATH,
  QUICK_DIAGNOSIS_PATH,
  resolveDiagnosisRoute,
} from "./diagnosis-routing";

describe("diagnosis routing", () => {
  it.each([
    ["/initial-setup", { kind: "input", entryMode: "onboarding" }],
    [QUICK_DIAGNOSIS_PATH, { kind: "input", entryMode: "quickDiagnosis" }],
    [DETAILED_DIAGNOSIS_PATH, { kind: "input", entryMode: "detailedDiagnosis" }],
    [DIAGNOSIS_RESULT_PATH, { kind: "result" }],
    ["/mypage", { kind: "none" }],
  ] as const)("회원의 %s 경로를 해석한다", (pathname, expected) => {
    expect(resolveDiagnosisRoute(pathname, true)).toEqual(expected);
  });

  it("데모 계정에는 진단 전용 경로를 강제하지 않는다", () => {
    expect(resolveDiagnosisRoute(DETAILED_DIAGNOSIS_PATH, false)).toEqual({
      kind: "none",
    });
  });
});
