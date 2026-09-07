import type { DiagnosisProgress } from "../../types/diagnosis";
import {
  getRiskProfileCopy,
  getRiskProfileDisplayName,
} from "./diagnosis-presenter";

export interface DiagnosisStatusCopy {
  readonly statusLabel: string;
  readonly resultLabel: string;
  readonly description: string;
  readonly actionLabel: string;
}

export function getDiagnosisStatusCopy(
  progress: DiagnosisProgress,
): DiagnosisStatusCopy {
  switch (progress.status) {
    case "unmeasured":
      return {
        statusLabel: "미측정",
        resultLabel: "아직 참고 진단을 시작하지 않았어요",
        description: "간편 진단 3문항부터 시작할 수 있습니다.",
        actionLabel: "간편 진단 시작",
      };
    case "quickComplete":
      return {
        statusLabel: "간편 진단 완료",
        resultLabel: getRiskProfileDisplayName(progress.quickResult.kind),
        description: getRiskProfileCopy(progress.quickResult.kind).summary,
        actionLabel: "상세 진단 시작",
      };
    case "detailInProgress":
      return {
        statusLabel: "상세 진단 진행 중",
        resultLabel: getRiskProfileDisplayName(progress.quickResult.kind),
        description: "상세 진단 중 답하지 않은 문항부터 이어집니다.",
        actionLabel: "상세 진단 이어서",
      };
    case "detailComplete":
      return {
        statusLabel: "상세 진단 완료",
        resultLabel: getRiskProfileDisplayName(progress.quickResult.kind),
        description: getRiskProfileCopy(progress.quickResult.kind).summary,
        actionLabel: "상세 결과 보기",
      };
  }
}
