import { useEffect, useRef, useState } from "react";
import { Badge } from "../common/badge";
import { Icon } from "../common/icon";
import "./detailed-diagnosis-invite.css";

interface DetailedDiagnosisInviteProps {
  readonly onStart: () => void;
  readonly onDismiss: () => void;
}

export function DetailedDiagnosisInvite({
  onStart,
  onDismiss,
}: DetailedDiagnosisInviteProps) {
  const [phase, setPhase] = useState<"prompt" | "deferred">("prompt");
  const [isStarting, setIsStarting] = useState(false);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement;
    primaryButtonRef.current!.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.focus();
    };
  }, [onDismiss]);

  const handleStart = () => {
    setIsStarting(true);
    onStart();
  };

  return (
    <div className="detail-invite" role="presentation">
      <button
        className="detail-invite__backdrop"
        type="button"
        aria-label="상세 진단 안내 닫기"
        onClick={onDismiss}
      />
      <section
        className="detail-invite__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-invite-title"
      >
        <div className="detail-invite__handle" aria-hidden="true" />
        <button
          className="detail-invite__close"
          type="button"
          aria-label="상세 진단 안내 닫기"
          onClick={onDismiss}
        >
          <Icon name="x" size={20} />
        </button>

        <div className="detail-invite__curve" aria-hidden="true">
          <svg viewBox="0 0 560 80">
            <path d="M8 58 C112 4 196 78 302 35 S454 15 550 48" />
            <circle cx="8" cy="58" r="5" />
            <circle cx="302" cy="35" r="5" />
            <circle cx="550" cy="48" r="6" />
          </svg>
        </div>

        {phase === "prompt" ? (
          <>
            <Badge variant="normal">내 상황에 맞춘 설명</Badge>
            <h2 id="detail-invite-title">3문항만 더 답하면</h2>
            <p className="detail-invite__lead">
              같은 진단 결과를 내 상황에 맞는 말로 더 구체적으로 설명할 수
              있어요.
            </p>
            <p className="detail-invite__notice">
              추가 답변은 현재 항로형과 점수를 바꾸지 않습니다.
            </p>
            <div className="detail-invite__actions">
              <button
                className="detail-invite__button detail-invite__button--quiet"
                type="button"
                onClick={() => setPhase("deferred")}
              >
                나중에 할게요
              </button>
              <button
                ref={primaryButtonRef}
                className="detail-invite__button detail-invite__button--primary"
                type="button"
                disabled={isStarting}
                onClick={handleStart}
              >
                지금 맞춤 설정하기
              </button>
            </div>
          </>
        ) : (
          <>
            <Badge variant="primary">나중에 이어서</Badge>
            <h2 id="detail-invite-title">언제든 이어갈 수 있어요</h2>
            <p className="detail-invite__lead">
              마이페이지 → 의사결정 프로필에서 언제든 이어갈 수 있어요.
            </p>
            <div className="detail-invite__actions">
              <button
                ref={primaryButtonRef}
                className="detail-invite__button detail-invite__button--quiet"
                type="button"
                disabled={isStarting}
                onClick={handleStart}
              >
                지금 맞춤 설정하기
              </button>
              <button
                className="detail-invite__button detail-invite__button--primary"
                type="button"
                onClick={onDismiss}
              >
                확인했어요
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
