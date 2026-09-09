export const PLANNER_DEMO_PROGRESS_KEY = "divurve_planner_demo_progress_v1";

export interface PlannerDemoGoalProgress {
  readonly recordedSequences: readonly number[];
  readonly appliedScenarioId: string | null;
  /** 기록 당시 선택한 예시 경로. 숫자·계정 정보는 저장하지 않는다. */
  readonly recordedScenarioIds?: Readonly<Record<string, string>>;
}

export interface PlannerDemoProgress {
  readonly version: 1;
  readonly goals: Readonly<Record<string, PlannerDemoGoalProgress>>;
}

export const EMPTY_PLANNER_DEMO_PROGRESS: PlannerDemoProgress = {
  version: 1,
  goals: {},
};

function parseGoalProgress(value: unknown): PlannerDemoGoalProgress | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.recordedSequences)) return null;
  const recordedSequences = [
    ...new Set(
      record.recordedSequences.filter(
        (sequence): sequence is number =>
          typeof sequence === "number" &&
          Number.isInteger(sequence) &&
          sequence > 0,
      ),
    ),
  ].sort((first, second) => first - second);
  const appliedScenarioId =
    typeof record.appliedScenarioId === "string"
      ? record.appliedScenarioId
      : null;
  const scenarioIds = record.recordedScenarioIds;
  const recordedScenarioIds = scenarioIds !== null && typeof scenarioIds === "object" && !Array.isArray(scenarioIds)
    ? Object.fromEntries(Object.entries(scenarioIds).filter(([seq, id]) =>
        recordedSequences.includes(Number(seq)) && typeof id === "string",
      )) as Readonly<Record<string, string>>
    : {};
  return { recordedSequences, appliedScenarioId,
    ...(Object.keys(recordedScenarioIds).length === 0 ? {} : { recordedScenarioIds }),
  };
}

export function readPlannerDemoProgress(): PlannerDemoProgress {
  try {
    const raw = sessionStorage.getItem(PLANNER_DEMO_PROGRESS_KEY);
    if (raw === null) return EMPTY_PLANNER_DEMO_PROGRESS;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return EMPTY_PLANNER_DEMO_PROGRESS;
    }
    const record = parsed as Record<string, unknown>;
    if (record.version !== 1 || record.goals === null || typeof record.goals !== "object") {
      return EMPTY_PLANNER_DEMO_PROGRESS;
    }
    const goals = Object.fromEntries(
      Object.entries(record.goals as Record<string, unknown>).flatMap(
        ([goalId, value]) => {
          const progress = parseGoalProgress(value);
          return goalId.length > 0 && progress !== null
            ? [[goalId, progress] as const]
            : [];
        },
      ),
    );
    return { version: 1, goals };
  } catch {
    return EMPTY_PLANNER_DEMO_PROGRESS;
  }
}

export function writePlannerDemoProgress(progress: PlannerDemoProgress): void {
  try {
    sessionStorage.setItem(PLANNER_DEMO_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // 저장소가 막혀도 현재 마운트의 데모 상태는 계속 사용할 수 있다.
  }
}

export function getPlannerDemoGoalProgress(
  progress: PlannerDemoProgress,
  goalId: string,
): PlannerDemoGoalProgress {
  return (
    progress.goals[goalId] ?? {
      recordedSequences: [],
      appliedScenarioId: null,
    }
  );
}

export function recordPlannerDemoSequence(
  progress: PlannerDemoProgress,
  goalId: string,
  sequence: number,
): PlannerDemoProgress {
  if (!Number.isInteger(sequence) || sequence <= 0) return progress;
  const current = getPlannerDemoGoalProgress(progress, goalId);
  if (current.recordedSequences.includes(sequence)) return progress;
  return {
    version: 1,
    goals: {
      ...progress.goals,
      [goalId]: {
        ...current,
        recordedSequences: [...current.recordedSequences, sequence].sort(
          (first, second) => first - second,
        ),
        ...(current.appliedScenarioId === null ? {} : {
          recordedScenarioIds: {
            ...current.recordedScenarioIds,
            [sequence]: current.appliedScenarioId,
          },
        }),
      },
    },
  };
}

export function applyPlannerDemoScenario(
  progress: PlannerDemoProgress,
  goalId: string,
  scenarioId: string,
): PlannerDemoProgress {
  const current = getPlannerDemoGoalProgress(progress, goalId);
  if (current.appliedScenarioId === scenarioId) return progress;
  return {
    version: 1,
    goals: {
      ...progress.goals,
      [goalId]: { ...current, appliedScenarioId: scenarioId },
    },
  };
}
