import { Badge } from "../../components/common/badge";
import { Icon } from "../../components/common/icon";

interface DiagnosisOption<ChoiceCode extends string> {
  readonly code: ChoiceCode;
  readonly label: string;
}

interface DiagnosisQuestionStepProps<ChoiceCode extends string> {
  readonly phaseLabel: string;
  readonly questionNumber: number;
  readonly totalQuestions: number;
  readonly code: string;
  readonly title: string;
  readonly options: readonly DiagnosisOption<ChoiceCode>[];
  readonly selectedCode?: ChoiceCode;
  readonly onSelect: (code: ChoiceCode) => void;
}

export function DiagnosisQuestionStep<ChoiceCode extends string>({
  phaseLabel,
  questionNumber,
  totalQuestions,
  code,
  title,
  options,
  selectedCode,
  onSelect,
}: DiagnosisQuestionStepProps<ChoiceCode>) {
  const titleId = `diagnosis-${code}-title`;
  return (
    <section aria-labelledby={titleId}>
      <div className="initial-setup__question-meta">
        <Badge variant="primary">{phaseLabel}</Badge>
        <span>{questionNumber} / {totalQuestions}</span>
      </div>
      <h2 className="initial-setup__step-title" id={titleId}>{title}</h2>
      <p className="initial-setup__step-description">
        가장 가까운 답을 하나 선택해 주세요.
      </p>
      <div className="initial-setup__answer-list" role="radiogroup" aria-labelledby={titleId}>
        {options.map((option) => (
          <label
            className="initial-setup__answer"
            data-selected={selectedCode === option.code}
            key={option.code}
          >
            <input
              type="radio"
              name={`diagnosis-${code}`}
              value={option.code}
              checked={selectedCode === option.code}
              onChange={() => onSelect(option.code)}
            />
            <span className="initial-setup__answer-code" aria-hidden="true">
              {selectedCode === option.code
                ? <Icon name="check" size={16} />
                : option.code}
            </span>
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
