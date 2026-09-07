import { Icon } from "../../components/common/icon";
import type { ExplanationDomain } from "./initial-setup-types";

export const EXPLANATION_DOMAIN_OPTIONS: readonly {
  readonly value: ExplanationDomain;
  readonly title: string;
  readonly description: string;
}[] = [
  {
    value: "finance",
    title: "금융·경제",
    description: "시장과 금융 용어를 활용해 설명해요.",
  },
  {
    value: "dev",
    title: "개발·기술",
    description: "구조와 원리를 중심으로 설명해요.",
  },
  {
    value: "marketing",
    title: "마케팅·브랜드",
    description: "고객과 흐름을 중심으로 설명해요.",
  },
  {
    value: "plain",
    title: "일상적인 설명",
    description: "낯선 용어를 줄이고 편안하게 설명해요.",
  },
] as const;

interface ExplanationDomainStepProps {
  readonly selectedDomain?: ExplanationDomain;
  readonly onSelect: (domain: ExplanationDomain) => void;
}

export function ExplanationDomainStep({
  selectedDomain,
  onSelect,
}: ExplanationDomainStepProps) {
  return (
    <section aria-labelledby="explanation-domain-title">
      <p className="initial-setup__eyebrow">설명 개인화</p>
      <h2 className="initial-setup__step-title" id="explanation-domain-title">
        어떤 분야의 설명이 가장 익숙한가요?
      </h2>
      <p className="initial-setup__step-description">
        같은 내용을 이해하기 편한 표현으로 보여드릴 때만 사용하며, 성향 결과에는
        영향을 주지 않아요.
      </p>
      <div
        className="initial-setup__option-grid"
        role="radiogroup"
        aria-labelledby="explanation-domain-title"
      >
        {EXPLANATION_DOMAIN_OPTIONS.map((option) => (
          <label
            className="initial-setup__choice"
            data-selected={selectedDomain === option.value}
            key={option.value}
          >
            <input
              type="radio"
              name="explanation-domain"
              value={option.value}
              checked={selectedDomain === option.value}
              onChange={() => onSelect(option.value)}
            />
            <span className="initial-setup__choice-mark" aria-hidden="true">
              {selectedDomain === option.value && <Icon name="check" size={14} />}
            </span>
            <span>
              <strong>{option.title}</strong>
              <small>{option.description}</small>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
