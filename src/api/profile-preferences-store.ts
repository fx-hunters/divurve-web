import type {
  ExplanationDomain,
  ExplanationLevel,
  ProfileExplanationPreferences,
} from "../types/diagnosis";

export const PROFILE_PREFERENCES_STORAGE_KEY =
  "divurve.profile-explanation-preferences.v1";

function isExplanationDomain(value: unknown): value is ExplanationDomain {
  return (
    value === "finance" ||
    value === "dev" ||
    value === "marketing" ||
    value === "plain"
  );
}

function isExplanationLevel(value: unknown): value is ExplanationLevel {
  return value === "simple" || value === "reasoned" || value === "analytical";
}

function parsePreferences(value: unknown): ProfileExplanationPreferences | null {
  if (typeof value !== "object" || value === null) return null;

  const candidate = value as Record<string, unknown>;
  const domain = candidate.explanationDomain;
  const level = candidate.explanationLevel;

  if (domain !== undefined && !isExplanationDomain(domain)) return null;
  if (level !== undefined && !isExplanationLevel(level)) return null;

  return {
    ...(domain === undefined ? {} : { explanationDomain: domain }),
    ...(level === undefined ? {} : { explanationLevel: level }),
  };
}

export function readProfilePreferences(): ProfileExplanationPreferences {
  const storedValue = window.sessionStorage.getItem(
    PROFILE_PREFERENCES_STORAGE_KEY,
  );
  if (!storedValue) return {};

  try {
    return parsePreferences(JSON.parse(storedValue)) ?? {};
  } catch {
    return {};
  }
}

export function writeProfilePreferences(
  preferences: ProfileExplanationPreferences,
): void {
  const parsed = parsePreferences(preferences);
  if (!parsed) return;

  if (
    parsed.explanationDomain === undefined &&
    parsed.explanationLevel === undefined
  ) {
    window.sessionStorage.removeItem(PROFILE_PREFERENCES_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(
    PROFILE_PREFERENCES_STORAGE_KEY,
    JSON.stringify(parsed),
  );
}
