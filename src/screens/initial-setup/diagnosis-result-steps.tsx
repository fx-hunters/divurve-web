import { Badge } from "../../components/common/badge";
import { Icon } from "../../components/common/icon";
import { DiagnosisNarrative } from "../../components/diagnosis/diagnosis-narrative";
import {
  createDetailedDiagnosisPresentation,
  getRiskProfileCopy,
} from "../../components/diagnosis/diagnosis-presenter";
import type {
  CompletedDetailedDiagnosisAnswers,
  QuickRiskResult,
} from "../../types/diagnosis";

function JourneyCurve() {
  return (
    <svg
      className="initial-setup__journey-curve"
      viewBox="0 0 520 90"
      role="img"
      aria-label="간편 진단에서 상세 설명으로 이어지는 설정 경로"
    >
      <path className="initial-setup__journey-track" d="M16 64 C128 4 210 84 318 38 S444 24 504 48" />
      <path className="initial-setup__journey-line" d="M16 64 C128 4 210 84 318 38 S444 24 504 48" />
      <circle cx="16" cy="64" r="6" />
      <circle cx="318" cy="38" r="6" />
      <circle cx="504" cy="48" r="7" />
    </svg>
  );
}

interface QuickResultStepProps {
  readonly result: QuickRiskResult;
}

export function QuickResultStep({ result }: QuickResultStepProps) {
  const copy = getRiskProfileCopy(result.kind);
  return (
    <section className="initial-setup__result" aria-labelledby="quick-result-title">
      <Badge variant="primary">간편 진단 완료 · {result.score}/9점</Badge>
      <h2 className="initial-setup__result-title" id="quick-result-title">
        현재 결과는 <strong>{copy.displayName}</strong>이에요
      </h2>
      <p className="initial-setup__result-summary">{copy.summary}</p>
      <JourneyCurve />
      <div className="initial-setup__evidence" aria-label="답변에서 확인한 근거">
        <h3>답변에서 확인한 기준</h3>
        <ul>
          {result.evidence.map((evidence) => (
            <li key={evidence}>
              <Icon name="checkCircle" size={18} />
              <span>{evidence}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="initial-setup__notice">
        이 결과는 금융회사의 표준 적합성 진단이 아닌 Divurve MVP 참고 진단입니다.
      </p>
    </section>
  );
}

interface DetailCompleteStepProps {
  readonly result: QuickRiskResult;
  readonly answers: CompletedDetailedDiagnosisAnswers;
}

export function DetailCompleteStep({ result, answers }: DetailCompleteStepProps) {
  const presentation = createDetailedDiagnosisPresentation(result, answers);
  return (
    <section className="initial-setup__result" aria-labelledby="detail-result-title">
      <Badge variant="normal">상세 진단 완료</Badge>
      <h2 className="initial-setup__result-title" id="detail-result-title">
        같은 <strong>{presentation.profileName}</strong> 결과를 내 상황에 맞게 설명했어요
      </h2>
      <p className="initial-setup__result-summary">
        간편 진단의 대표 성향과 {result.score}점은 그대로 유지됩니다.
      </p>
      <DiagnosisNarrative presentation={presentation} />
      <p className="initial-setup__notice">
        상세 답변은 대표 위험성향을 바꾸지 않고 설명 방식에만 반영됩니다.
      </p>
    </section>
  );
}
