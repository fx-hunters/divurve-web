import { useState } from "react";
import { Card } from "../../components/common/card";
import {
  getExplanationDomainLabel,
  getExplanationLevelLabel,
} from "../../components/diagnosis/diagnosis-presenter";
import type {
  ExplanationDomain,
  ExplanationLevel,
  ProfileExplanationPreferences,
} from "../../types/diagnosis";
import type { ProfilePreferencesViewModel } from "./mypage-profile-presenter";

const DOMAINS: readonly ExplanationDomain[] = [
  "finance",
  "dev",
  "marketing",
  "plain",
];

const LEVELS: readonly ExplanationLevel[] = [
  "simple",
  "reasoned",
  "analytical",
];

interface ProfileExplanationSettingsProps {
  readonly model: ProfilePreferencesViewModel;
  readonly onSave: (preferences: ProfileExplanationPreferences) => void;
}

export function ProfileExplanationSettings({
  model,
  onSave,
}: ProfileExplanationSettingsProps) {
  const [domain, setDomain] = useState(model.explanationDomain);
  const [level, setLevel] = useState(model.explanationLevel);
  const [isSaved, setIsSaved] = useState(false);

  return (
    <Card title="기본 설정">
      <form
        className="mypage-preferences"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ explanationDomain: domain, explanationLevel: level });
          setIsSaved(true);
        }}
      >
        <label className="mypage-preferences__field">
          <span>익숙한 설명 분야</span>
          <select
            value={domain}
            onChange={(event) => {
              setDomain(event.target.value as ExplanationDomain);
              setIsSaved(false);
            }}
          >
            {DOMAINS.map((option) => (
              <option key={option} value={option}>
                {getExplanationDomainLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="mypage-preferences__field">
          <span>설명 수준</span>
          <select
            value={level}
            onChange={(event) => {
              setLevel(event.target.value as ExplanationLevel);
              setIsSaved(false);
            }}
          >
            {LEVELS.map((option) => (
              <option key={option} value={option}>
                {getExplanationLevelLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <p className="mypage-preferences__source">{model.sourceLabel}</p>
        <button className="mypage-preferences__submit" type="submit">
          설명 설정 반영
        </button>
      </form>
      {isSaved && (
        <p className="mypage-preferences__saved" role="status">
          이번 접속의 설명 설정에 반영했어요.
        </p>
      )}
    </Card>
  );
}
