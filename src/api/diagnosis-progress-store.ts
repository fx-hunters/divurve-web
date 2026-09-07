import type { DiagnosisProgress } from "../types/diagnosis";

export const DIAGNOSIS_PROGRESS_STORAGE_KEY =
  "divurve_initial_setup_diagnosis_progress";

const UNMEASURED_PROGRESS: DiagnosisProgress = { status: "unmeasured" };

function isDiagnosisProgress(value: unknown): value is DiagnosisProgress {
  if (typeof value !== "object" || value === null || !("status" in value)) {
    return false;
  }

  const status = value.status;
  return (
    status === "unmeasured" ||
    status === "quickComplete" ||
    status === "detailInProgress" ||
    status === "detailComplete"
  );
}

export function readDiagnosisProgress(): DiagnosisProgress {
  try {
    const storedValue = sessionStorage.getItem(DIAGNOSIS_PROGRESS_STORAGE_KEY);
    if (!storedValue) return UNMEASURED_PROGRESS;

    const parsed: unknown = JSON.parse(storedValue);
    return isDiagnosisProgress(parsed) ? parsed : UNMEASURED_PROGRESS;
  } catch {
    return UNMEASURED_PROGRESS;
  }
}

export function writeDiagnosisProgress(progress: DiagnosisProgress): boolean {
  try {
    sessionStorage.setItem(
      DIAGNOSIS_PROGRESS_STORAGE_KEY,
      JSON.stringify(progress),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearDiagnosisProgress(): boolean {
  try {
    sessionStorage.removeItem(DIAGNOSIS_PROGRESS_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
