import "./initial-setup-screen.css";
import type {
  InitialSetupDependencies,
  InitialSetupSubmission,
} from "./initial-setup-types";
import type { InitialSetupEntryMode } from "../../types/diagnosis";
import { InitialSetupView } from "./initial-setup-view";
import { useInitialSetup } from "./use-initial-setup";

interface InitialSetupScreenProps {
  readonly onComplete: (submission: InitialSetupSubmission) => void;
  readonly entryMode?: InitialSetupEntryMode;
  readonly dependencies?: Partial<InitialSetupDependencies>;
}

export function InitialSetupScreen({
  onComplete,
  entryMode = "onboarding",
  dependencies,
}: InitialSetupScreenProps) {
  const { state, actions } = useInitialSetup(onComplete, {
    entryMode,
    dependencies,
  });
  return <InitialSetupView state={state} actions={actions} />;
}

export type { InitialSetupSubmission } from "./initial-setup-types";
