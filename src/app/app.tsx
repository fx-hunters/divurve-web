import { useEffect, useRef, useState } from "react";
import { AuthPage, type AuthMode } from "../AuthPage";
import { LandingPage } from "../LandingPage";
import { OnboardingTour } from "../OnboardingTour";
import { Footer } from "../components/layout/footer";
import { Header } from "../components/layout/header";
import { MobileNav } from "../components/layout/mobile-nav";
import { Sidebar } from "../components/layout/sidebar";
import { useTabNavigation } from "../hooks/use-tab-navigation";
import { useTheme } from "../hooks/use-theme";
import { ForecastScreen } from "../screens/forecast/forecast-screen";
import { HomeScreen } from "../screens/home/home-screen";
import { MyPageScreen } from "../screens/mypage/mypage-screen";
import { RouteScreen } from "../screens/route/route-screen";
import { XRayScreen } from "../screens/xray/xray-screen";
import { InitialSetupScreen } from "../screens/initial-setup/initial-setup-screen";
import { ApiStateView } from "../components/common/api-state-view";
import { DetailedDiagnosisInvite } from "../components/diagnosis/detailed-diagnosis-invite";
import { NAV_ITEMS } from "../types/navigation";
import type { AuthSuccessResult } from "../types/auth";
import type { InitialSetupEntryMode } from "../types/diagnosis";
import { login, logout, signup } from "../api/auth";
import {
  clearDiagnosisProgress,
  readDiagnosisProgress,
} from "../api/diagnosis-progress-store";
import { readApiSession } from "../api/session";
import {
  INITIAL_SETUP_PATH,
  resolvePostAuthDestination,
} from "./post-auth-routing";
import { useSessionBootstrap, type SessionEnsurer } from "./use-session-bootstrap";
import {
  DETAILED_DIAGNOSIS_PATH,
  DIAGNOSIS_RESULT_PATH,
  QUICK_DIAGNOSIS_PATH,
  resolveDiagnosisRoute,
} from "./diagnosis-routing";
import { DiagnosisResultScreen } from "../screens/mypage/diagnosis-result-screen";
import type { InitialSetupSubmission } from "../screens/initial-setup/initial-setup-screen";
import { getDetailedDiagnosisInviteDelayForEnvironment } from "./diagnosis-invite-timing";

export const TOUR_STORAGE_KEY = "divurve_tour_done";
export const TOUR_INACTIVITY_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export function shouldShowTour(
  storedValue: string | null,
  now: number = Date.now(),
): boolean {
  if (!storedValue) {
    return true;
  }
  const timestamp = Number(storedValue);
  if (Number.isNaN(timestamp) || timestamp <= 1) {
    return true;
  }
  return now - timestamp >= TOUR_INACTIVITY_THRESHOLD_MS;
}

interface AppProps {
  /** 테스트에서 세션 확보 경로를 주입하기 위한 통로. */
  readonly ensureSession?: SessionEnsurer;
}

export function App({ ensureSession }: AppProps = {}) {
  const { activeTab, navigate } = useTabNavigation();
  const initialDiagnosisRoute = resolveDiagnosisRoute(
    window.location.pathname,
    readApiSession()?.isDemo === false,
  );
  const [showLanding, setShowLanding] = useState<boolean>(
    () => window.location.pathname === "/",
  );
  const [showAuth, setShowAuth] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [showTour, setShowTour] = useState<boolean>(false);
  const [showInitialSetup, setShowInitialSetup] = useState<boolean>(
    () => initialDiagnosisRoute.kind === "input",
  );
  const [initialSetupEntryMode, setInitialSetupEntryMode] =
    useState<InitialSetupEntryMode>(() =>
      initialDiagnosisRoute.kind === "input"
        ? initialDiagnosisRoute.entryMode
        : "onboarding",
    );
  const [showDiagnosisResult, setShowDiagnosisResult] = useState<boolean>(
    () => initialDiagnosisRoute.kind === "result",
  );
  const [showDetailedInvite, setShowDetailedInvite] = useState(false);
  const invitationTimerRef = useRef<number | null>(null);
  const { isDark, toggleTheme, setTheme } = useTheme("dark");

  const isDashboardVisible = !showLanding && !showAuth && !showInitialSetup;
  const { state: sessionState, retry: retrySession } = useSessionBootstrap(
    isDashboardVisible,
    ensureSession,
  );

  const currentTabItem = NAV_ITEMS.find((item) => item.id === activeTab);
  const activeTabTitle = currentTabItem!.label;

  useEffect(() => {
    const handleInitialSetupHistory = () => {
      const isMemberSession = readApiSession()?.isDemo === false;
      const diagnosisRoute = resolveDiagnosisRoute(
        window.location.pathname,
        isMemberSession,
      );

      if (diagnosisRoute.kind === "input") {
        setInitialSetupEntryMode(diagnosisRoute.entryMode);
        setShowLanding(false);
        setShowAuth(false);
        setShowTour(false);
        setShowDetailedInvite(false);
        setShowDiagnosisResult(false);
        setShowInitialSetup(true);
        return;
      }

      setShowInitialSetup(false);
      setShowDiagnosisResult(diagnosisRoute.kind === "result");
    };

    window.addEventListener("popstate", handleInitialSetupHistory);
    return () => window.removeEventListener("popstate", handleInitialSetupHistory);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(invitationTimerRef.current ?? undefined);
    },
    [],
  );

  const handleNavigate = (tab: Parameters<typeof navigate>[0]) => {
    setShowDiagnosisResult(false);
    setShowDetailedInvite(false);
    navigate(tab);
  };

  const goToLogin = () => {
    setShowLanding(false);
    setAuthMode("login");
    setShowAuth(true);
  };

  const goToSignup = () => {
    setShowLanding(false);
    setAuthMode("signup");
    setShowAuth(true);
  };

  const handleBackToLanding = () => {
    handleNavigate("home");
    setShowInitialSetup(false);
    setShowAuth(false);
    setShowLanding(true);
  };

  const handleLogout = () => {
    logout();
    handleNavigate("home");
    setShowInitialSetup(false);
    setShowLanding(true);
    setShowAuth(false);
  };

  const handleEnterDashboard = () => {
    setShowLanding(false);
    setShowAuth(false);
    setShowInitialSetup(false);
    setShowDiagnosisResult(false);
    setShowDetailedInvite(false);
    try {
      const stored = localStorage.getItem(TOUR_STORAGE_KEY);
      if (shouldShowTour(stored)) {
        setShowTour(true);
      }
    } catch {
      setShowTour(true);
    }
  };

  const handleAuthenticated = (result: AuthSuccessResult | void) => {
    const destination = resolvePostAuthDestination(result);

    if (destination === "initialSetup") {
      setInitialSetupEntryMode("onboarding");
      setShowLanding(false);
      setShowAuth(false);
      setShowTour(false);
      setShowInitialSetup(true);
      if (window.location.pathname !== INITIAL_SETUP_PATH) {
        window.history.pushState(null, "", INITIAL_SETUP_PATH);
      }
      return;
    }

    handleNavigate("home");
    handleEnterDashboard();
  };

  const handleInitialSetupComplete = (
    submission: InitialSetupSubmission,
  ) => {
    setShowLanding(false);
    setShowAuth(false);
    setShowTour(false);
    setShowInitialSetup(false);
    setShowDetailedInvite(false);

    if (initialSetupEntryMode === "onboarding") {
      handleNavigate("home");
      if (submission.draft.quickDiagnosis) {
        window.clearTimeout(invitationTimerRef.current ?? undefined);
        invitationTimerRef.current = window.setTimeout(() => {
          setShowDetailedInvite(true);
          invitationTimerRef.current = null;
        }, getDetailedDiagnosisInviteDelayForEnvironment(window));
      }
      return;
    }

    if (
      initialSetupEntryMode === "detailedDiagnosis" &&
      readDiagnosisProgress().status === "detailComplete"
    ) {
      window.history.replaceState(null, "", DIAGNOSIS_RESULT_PATH);
      setShowDiagnosisResult(true);
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }

    window.history.replaceState(null, "", "/mypage");
    setShowDiagnosisResult(false);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const openDiagnosisInput = (
    entryMode: InitialSetupEntryMode,
    pathname: string,
  ) => {
    setInitialSetupEntryMode(entryMode);
    setShowLanding(false);
    setShowAuth(false);
    setShowTour(false);
    setShowDiagnosisResult(false);
    setShowDetailedInvite(false);
    setShowInitialSetup(true);
    if (window.location.pathname !== pathname) {
      window.history.pushState(null, "", pathname);
    }
  };

  const handleStartQuickDiagnosis = () => {
    clearDiagnosisProgress();
    openDiagnosisInput("quickDiagnosis", QUICK_DIAGNOSIS_PATH);
  };

  const handleStartDetailedDiagnosis = () => {
    openDiagnosisInput("detailedDiagnosis", DETAILED_DIAGNOSIS_PATH);
  };

  const handleViewDetailedDiagnosis = () => {
    setShowDetailedInvite(false);
    setShowDiagnosisResult(true);
    if (window.location.pathname !== DIAGNOSIS_RESULT_PATH) {
      window.history.pushState(null, "", DIAGNOSIS_RESULT_PATH);
    }
  };

  const handleTourComplete = () => {
    setShowTour(false);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, Date.now().toString());
    } catch {
      // localStorage disabled fallback
    }
  };

  const handleStartTour = () => {
    setShowTour(true);
  };

  const handleSetIsDark = (isNextDark: boolean) => {
    setTheme(isNextDark ? "dark" : "light");
  };

  if (showLanding) {
    return (
      <LandingPage
        onEnter={handleEnterDashboard}
        onLogin={goToLogin}
        onSignup={goToSignup}
        isDark={isDark}
        setIsDark={handleSetIsDark}
      />
    );
  }

  if (showAuth) {
    return (
      <AuthPage
        initialMode={authMode}
        onSuccess={handleAuthenticated}
        onBack={handleBackToLanding}
        authenticateLogin={async (input, persistence) => {
          return login(input, persistence);
        }}
        authenticateSignup={async (input) => {
          return signup(input);
        }}
      />
    );
  }

  if (showInitialSetup) {
    return (
      <InitialSetupScreen
        key={initialSetupEntryMode}
        entryMode={initialSetupEntryMode}
        onComplete={handleInitialSetupComplete}
      />
    );
  }

  if (sessionState.status === "bootstrapping") {
    return (
      <ApiStateView
        status="loading"
        title="체험 데이터를 준비하고 있습니다"
        message="서버에서 계정 세션을 확인하고 있습니다."
      />
    );
  }

  if (sessionState.status === "failed") {
    return (
      <ApiStateView
        status="error"
        title="체험 데이터를 준비하지 못했습니다"
        message={sessionState.message}
        onRetry={retrySession}
      />
    );
  }

  const isDemoAccount = sessionState.accountKind === "demo";

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        accountKind={sessionState.accountKind}
        onSelectTab={handleNavigate}
        onLogin={goToLogin}
      />

      <div className="app-main-layout">
        <Header
          activeTabTitle={activeTabTitle}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onNavigateToMypage={() => handleNavigate("mypage")}
        />

        <main className="app-scroll-content">
          <div
            key={activeTab}
            className="app-content-container page-enter-animation"
          >
            {activeTab === "home" && (
              <HomeScreen onNavigate={handleNavigate} />
            )}
            {activeTab === "planner" && (
              <RouteScreen mode={isDemoAccount ? "demo" : "api"} onNavigate={handleNavigate} />
            )}
            {activeTab === "assets" && (
              <XRayScreen onNavigate={handleNavigate} />
            )}
            {activeTab === "range" && (
              <ForecastScreen onNavigate={handleNavigate} />
            )}
            {activeTab === "mypage" && showDiagnosisResult && (
              <DiagnosisResultScreen
                progress={readDiagnosisProgress()}
                onBack={() => handleNavigate("mypage")}
                onChangeSettings={() => handleNavigate("mypage")}
                onRestart={handleStartQuickDiagnosis}
              />
            )}
            {activeTab === "mypage" && !showDiagnosisResult && (
              <MyPageScreen
                onNavigate={handleNavigate}
                onLogin={goToLogin}
                onLogout={handleLogout}
                onStartTour={handleStartTour}
                onStartQuickDiagnosis={
                  isDemoAccount ? undefined : handleStartQuickDiagnosis
                }
                onStartDetailedDiagnosis={
                  isDemoAccount ? undefined : handleStartDetailedDiagnosis
                }
                onViewDetailedDiagnosis={
                  isDemoAccount ? undefined : handleViewDetailedDiagnosis
                }
                onRestartDiagnosis={
                  isDemoAccount ? undefined : handleStartQuickDiagnosis
                }
              />
            )}
          </div>
        </main>

        <Footer accountKind={sessionState.accountKind} />
      </div>

      <MobileNav activeTab={activeTab} onSelectTab={handleNavigate} />

      {showDetailedInvite && !isDemoAccount && (
        <DetailedDiagnosisInvite
          onStart={handleStartDetailedDiagnosis}
          onDismiss={() => setShowDetailedInvite(false)}
        />
      )}

      {showTour && (
        <OnboardingTour
          onComplete={handleTourComplete}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
