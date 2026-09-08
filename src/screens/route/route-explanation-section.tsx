import { Badge } from "../../components/common/badge";
import type { PlannerExplanation } from "../../types/route";

interface PlannerReasonPanelProps {
  readonly explanation: PlannerExplanation;
  readonly contextLabel: string;
  readonly selectedProfileId: string;
  readonly onClose: () => void;
  readonly onSelectProfile: (profileId: string) => void;
}

export function PlannerReasonPanel({
  explanation,
  contextLabel,
  selectedProfileId,
  onClose,
  onSelectProfile,
}: PlannerReasonPanelProps) {
  const selectedProfile = explanation.profiles.find(
    (profile) => profile.id === selectedProfileId,
  )!;

  return (
    <section
      id="planner-reason-content"
      className="planner-reason"
      aria-labelledby="planner-reason-title"
    >
      <header className="planner-reason__heading">
        <div>
          <h3 id="planner-reason-title">{explanation.title}</h3>
          <span>{contextLabel}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="설명 닫기">
          ×
        </button>
      </header>

      <p className="planner-reason__summary">{explanation.summary}</p>
      <div
        className="planner-reason__profiles"
        role="group"
        aria-label="설명 난이도"
      >
        {explanation.profiles.map((profile) => (
          <button
            type="button"
            key={profile.id}
            aria-pressed={profile.id === selectedProfileId}
            onClick={() => onSelectProfile(profile.id)}
          >
            {profile.label}
          </button>
        ))}
      </div>
      <div className="planner-reason__copy" aria-live="polite">
        <Badge>{selectedProfile.levelLabel}</Badge>
        {selectedProfile.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <p className="planner-reason__notice">{explanation.aiNotice}</p>
      <details className="planner-reason__tbd">
        <summary>{explanation.tbdTitle}</summary>
        <ul>
          {explanation.tbdItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
