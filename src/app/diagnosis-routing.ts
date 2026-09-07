import type { InitialSetupEntryMode } from "../types/diagnosis";

export const QUICK_DIAGNOSIS_PATH = "/diagnosis/quick";
export const DETAILED_DIAGNOSIS_PATH = "/diagnosis/detail";
export const DIAGNOSIS_RESULT_PATH = "/mypage/diagnosis";

export type DiagnosisRoute =
  | {
      readonly kind: "input";
      readonly entryMode: InitialSetupEntryMode;
    }
  | { readonly kind: "result" }
  | { readonly kind: "none" };

export function resolveDiagnosisRoute(
  pathname: string,
  isMemberSession: boolean,
): DiagnosisRoute {
  if (!isMemberSession) return { kind: "none" };

  if (pathname === "/initial-setup") {
    return { kind: "input", entryMode: "onboarding" };
  }
  if (pathname === QUICK_DIAGNOSIS_PATH) {
    return { kind: "input", entryMode: "quickDiagnosis" };
  }
  if (pathname === DETAILED_DIAGNOSIS_PATH) {
    return { kind: "input", entryMode: "detailedDiagnosis" };
  }
  if (pathname === DIAGNOSIS_RESULT_PATH) {
    return { kind: "result" };
  }
  return { kind: "none" };
}
