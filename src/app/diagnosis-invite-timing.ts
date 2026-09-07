export const DETAIL_INVITE_DELAY_MS = 350;

type MotionPreferenceEnvironment = {
  matchMedia?: (query: string) => Pick<MediaQueryList, "matches">;
};

export function getDetailedDiagnosisInviteDelay(
  prefersReducedMotion: boolean,
): number {
  return prefersReducedMotion ? 0 : DETAIL_INVITE_DELAY_MS;
}

export function getDetailedDiagnosisInviteDelayForEnvironment(
  environment: MotionPreferenceEnvironment,
): number {
  const prefersReducedMotion =
    typeof environment.matchMedia === "function" &&
    environment.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return getDetailedDiagnosisInviteDelay(prefersReducedMotion);
}
