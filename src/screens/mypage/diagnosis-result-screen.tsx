import { Badge } from "../../components/common/badge";
import { DiagnosisNarrative } from "../../components/diagnosis/diagnosis-narrative";
import { createDetailedDiagnosisPresentation } from "../../components/diagnosis/diagnosis-presenter";
import type { DiagnosisProgress } from "../../types/diagnosis";
import "./diagnosis-result-screen.css";

interface DiagnosisResultScreenProps {
  readonly progress: DiagnosisProgress;
  readonly onBack: () => void;
  readonly onChangeSettings: () => void;
  readonly onRestart: () => void;
}

export function DiagnosisResultScreen({
  progress,
  onBack,
  onChangeSettings,
  onRestart,
}: DiagnosisResultScreenProps) {
  if (progress.status !== "detailComplete") {
    return (
      <section
        className="diagnosis-result-screen diagnosis-result-screen--empty"
        aria-labelledby="diagnosis-result-empty-title"
      >
        <Badge variant="primary">의사결정 프로필</Badge>
        <h2 id="diagnosis-result-empty-title">상세 결과를 아직 확인할 수 없어요</h2>
        <p>마이페이지에서 간편 진단 또는 남은 상세 문항을 이어갈 수 있습니다.</p>
        <button
          className="diagnosis-result-screen__button diagnosis-result-screen__button--primary"
          type="button"
          onClick={onBack}
        >
          마이페이지로 돌아가기
        </button>
      </section>
    );
  }

  const presentation = createDetailedDiagnosisPresentation(
    progress.quickResult,
    progress.detailedAnswers,
  );

  return (
    <section
      className="diagnosis-result-screen"
      aria-labelledby="diagnosis-result-title"
    >
      <header className="diagnosis-result-screen__header">
        <div>
          <Badge variant="normal">상세 진단 완료</Badge>
          <p className="diagnosis-result-screen__eyebrow">의사결정 프로필</p>
          <h2 id="diagnosis-result-title">{presentation.profileName}</h2>
          <p>{presentation.profileSummary}</p>
        </div>
        <svg
          className="diagnosis-result-screen__curve"
          viewBox="0 0 240 96"
          role="img"
          aria-label="간편 진단 결과에 상세 설명이 이어지는 경로"
        >
          <path d="M8 72 C58 8 118 94 168 36 S218 20 232 42" />
          <circle cx="8" cy="72" r="5" />
          <circle cx="168" cy="36" r="5" />
          <circle cx="232" cy="42" r="6" />
        </svg>
      </header>

      <div className="diagnosis-result-screen__narrative">
        <DiagnosisNarrative presentation={presentation} />
      </div>

      <details className="diagnosis-result-screen__details">
        <summary>답변 반영 기준 보기</summary>
        <dl>
          <div>
            <dt>기본 성향과 점수</dt>
            <dd>
              {presentation.profileName} · {progress.quickResult.score}/9점
            </dd>
          </div>
          <div>
            <dt>자금 상태</dt>
            <dd>{presentation.details.fundSeparation}</dd>
          </div>
          <div>
            <dt>설명 방식</dt>
            <dd>{presentation.details.explanationLevel}</dd>
          </div>
          <div>
            <dt>보유 경험</dt>
            <dd>{presentation.details.experience}</dd>
          </div>
        </dl>
        <p>
          상세 답변은 대표 항로형과 점수를 바꾸지 않고 설명의 맥락에만
          반영됩니다.
        </p>
      </details>

      <div className="diagnosis-result-screen__actions">
        <button
          className="diagnosis-result-screen__button"
          type="button"
          onClick={onBack}
        >
          마이페이지로 돌아가기
        </button>
        <button
          className="diagnosis-result-screen__button"
          type="button"
          onClick={onChangeSettings}
        >
          설정 변경
        </button>
        <button
          className="diagnosis-result-screen__button diagnosis-result-screen__button--primary"
          type="button"
          onClick={onRestart}
        >
          다시 진단하기
        </button>
      </div>
    </section>
  );
}
