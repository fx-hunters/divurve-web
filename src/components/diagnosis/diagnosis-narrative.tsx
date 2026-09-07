import type { DetailedDiagnosisPresentation } from "./diagnosis-presenter";
import "./diagnosis-narrative.css";

interface DiagnosisNarrativeProps {
  readonly presentation: DetailedDiagnosisPresentation;
}

export function DiagnosisNarrative({ presentation }: DiagnosisNarrativeProps) {
  return (
    <div className="diagnosis-narrative" aria-label="상세 진단 설명">
      <p className="diagnosis-narrative__sentence">
        {presentation.profileSentence.prefix}
        <strong
          className="diagnosis-narrative__profile"
          data-segment="risk-profile"
        >
          {presentation.profileSentence.emphasis}
        </strong>
        {presentation.profileSentence.suffix}
      </p>
      <p className="diagnosis-narrative__sentence">
        {presentation.fundSentence.prefix}
        <strong
          className="diagnosis-narrative__detail"
          data-segment="detail-context"
        >
          {presentation.fundSentence.emphasis}
        </strong>
        {presentation.fundSentence.suffix}
      </p>
      <p className="diagnosis-narrative__sentence">
        <strong
          className="diagnosis-narrative__detail"
          data-segment="detail-context"
        >
          {presentation.guidanceSentence.experienceEmphasis}
        </strong>
        {presentation.guidanceSentence.connector}
        <strong
          className="diagnosis-narrative__detail"
          data-segment="detail-context"
        >
          {presentation.guidanceSentence.levelEmphasis}
        </strong>
        {presentation.guidanceSentence.suffix}
      </p>
    </div>
  );
}
