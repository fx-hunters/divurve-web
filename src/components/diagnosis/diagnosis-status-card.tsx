import "./diagnosis-status-card.css";
import { Badge } from "../common/badge";
import { Card } from "../common/card";
import type { DiagnosisProgress } from "../../types/diagnosis";
import { DiagnosisNarrative } from "./diagnosis-narrative";
import { createDetailedDiagnosisPresentation } from "./diagnosis-presenter";
import { getDiagnosisStatusCopy } from "./diagnosis-status-copy";

export interface ServerDiagnosisSummary {
  readonly displayName: string;
  readonly description: string;
}

interface DiagnosisStatusCardProps {
  readonly progress: DiagnosisProgress;
  readonly onStartQuick?: () => void;
  readonly onStartDetailed?: () => void;
  readonly onViewDetailed?: () => void;
  readonly onRestart?: () => void;
  readonly serverResult?: ServerDiagnosisSummary;
}

export function DiagnosisStatusCard({
  progress,
  onStartQuick,
  onStartDetailed,
  onViewDetailed,
  onRestart,
  serverResult,
}: DiagnosisStatusCardProps) {
  const copy = getDiagnosisStatusCopy(progress);
  const isServerOnly = progress.status === "unmeasured" && serverResult;
  const resultLabel = isServerOnly ? serverResult.displayName : copy.resultLabel;
  const primaryAction =
    progress.status === "unmeasured"
      ? onStartQuick
      : progress.status === "detailComplete"
        ? onViewDetailed
        : onStartDetailed;
  const primaryLabel = isServerOnly ? "간편 진단 다시 하기" : copy.actionLabel;
  const detailedPresentation =
    progress.status === "detailComplete"
      ? createDetailedDiagnosisPresentation(
          progress.quickResult,
          progress.detailedAnswers,
        )
      : null;

  return (
    <Card>
      <section className="diagnosis-status" aria-labelledby="diagnosis-status-title">
        <div className="diagnosis-status__heading">
          <div>
            <h3 id="diagnosis-status-title">의사결정 프로필</h3>
            <p>환율 변동을 받아들이는 방식과 설명 선호를 관리합니다.</p>
          </div>
          <Badge variant={progress.status === "detailComplete" ? "normal" : "primary"}>
            {copy.statusLabel}
          </Badge>
        </div>
        <div className="diagnosis-status__result">
          <strong>{resultLabel}</strong>
          {progress.status === "detailInProgress" && <Badge variant="warn">진행 중</Badge>}
          {isServerOnly && <Badge variant="primary">서버 결과</Badge>}
        </div>
        <p className="diagnosis-status__copy">{copy.description}</p>
        {detailedPresentation && (
          <DiagnosisNarrative presentation={detailedPresentation} />
        )}
        {isServerOnly && (
          <p className="diagnosis-status__server-copy">
            {serverResult.description}
          </p>
        )}
        {(primaryAction ||
          (progress.status === "detailComplete" && onRestart)) && (
          <div className="diagnosis-status__actions">
            {progress.status === "detailComplete" && onRestart && (
              <button
                className="diagnosis-status__button diagnosis-status__button--quiet"
                type="button"
                onClick={onRestart}
              >
                다시 진단
              </button>
            )}
            {primaryAction && (
              <button
                className="diagnosis-status__button"
                type="button"
                onClick={primaryAction}
              >
                {primaryLabel}
              </button>
            )}
          </div>
        )}
      </section>
    </Card>
  );
}
