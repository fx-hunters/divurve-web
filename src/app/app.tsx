import { useEffect, useRef, useState } from "react";
import { AuthPage } from "../AuthPage";
import { LandingPage } from "../LandingPage";
import { OnboardingTour } from "../OnboardingTour";
import { Footer } from "../components/layout/footer";
import { Header } from "../components/layout/header";
import { MobileNav } from "../components/layout/mobile-nav";
import { Sidebar } from "../components/layout/sidebar";
import { useTheme } from "../hooks/use-theme";
import { ForecastScreen } from "../screens/forecast/forecast-screen";
import { HomeScreen } from "../screens/home/home-screen";
import { MyPageScreen } from "../screens/mypage/mypage-screen";
import { RouteScreen } from "../screens/route/route-screen";
import { XRayScreen } from "../screens/xray/xray-screen";
import { InitialSetupScreen } from "../screens/initial-setup/initial-setup-screen";
import { ApiStateView } from "../components/common/api-state-view";
import { DetailedDiagnosisInvite } from "../components/diagnosis/detailed-diagnosis-invite";
import { NAV_ITEMS, type NavTabId } from "../types/navigation";
import type { AuthSuccessResult } from "../types/auth";
import type { InitialSetupEntryMode } from "../types/diagnosis";
import { login, logout, signup } from "../api/auth";
import {
  clearDiagnosisProgress,
  readDiagnosisProgress,
} from "../api/diagnosis-progress-store";
import {
  dashboardRoute,
  plannerDetailRoute,
  resolvePostAuthRoute,
  DIAGNOSIS_RESULT_ROUTE,
  LANDING_ROUTE,
} from "./app-routing";
import { useAppRoute } from "./use-app-route";
import { useSessionBootstrap, type SessionEnsurer } from "./use-session-bootstrap";
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
  const { route, navigate, replace } = useAppRoute();
  const [showTour, setShowTour] = useState<boolean>(false);
  const [showDetailedInvite, setShowDetailedInvite] = useState(false);
  const invitationTimerRef = useRef<number | null>(null);
  const { isDark, toggleTheme, setTheme } = useTheme("dark");

  const isDashboardVisible = route.kind === "dashboard";
  const { state: sessionState, retry: retrySession } = useSessionBootstrap(
    isDashboardVisible,
    ensureSession,
  );

  // 투어·초대는 대시보드 위에만 뜬다. 뒤로가기로 대시보드를 벗어나면 함께 닫는다.
  useEffect(() => {
    if (route.kind !== "dashboard") {
      setShowTour(false);
      setShowDetailedInvite(false);
    }
  }, [route.kind]);

  useEffect(
    () => () => {
      window.clearTimeout(invitationTimerRef.current ?? undefined);
    },
    [],
  );

  const handleNavigate = (tab: NavTabId) => {
    setShowDetailedInvite(false);
    navigate(dashboardRoute(tab));
  };

  const goToLogin = () => {
    navigate({ kind: "auth", mode: "login" });
  };

  const goToSignup = () => {
    navigate({ kind: "auth", mode: "signup" });
  };

  const handleBackToLanding = () => {
    navigate(LANDING_ROUTE);
  };

  const handleLogout = () => {
    logout();
    navigate(LANDING_ROUTE);
  };

  const handleEnterDashboard = () => {
    navigate(dashboardRoute("home"));
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
    const destination = resolvePostAuthRoute(result);

    if (destination.kind === "diagnosisInput") {
      navigate(destination);
      return;
    }

    handleEnterDashboard();
  };

  const handleInitialSetupComplete = (
    entryMode: InitialSetupEntryMode,
    submission: InitialSetupSubmission,
  ) => {
    if (entryMode === "onboarding") {
      navigate(dashboardRoute("home"));
      if (submission.draft.quickDiagnosis) {
        window.clearTimeout(invitationTimerRef.current ?? undefined);
        invitationTimerRef.current = window.setTimeout(() => {
          setShowDetailedInvite(true);
          invitationTimerRef.current = null;
        }, getDetailedDiagnosisInviteDelayForEnvironment(window));
      }
      return;
    }

    // 진단만 다시 본 경우라 되돌아갈 입력 화면이 없다. 히스토리를 갈아끼운다.
    if (
      entryMode === "detailedDiagnosis" &&
      readDiagnosisProgress().status === "detailComplete"
    ) {
      replace(DIAGNOSIS_RESULT_ROUTE);
      return;
    }

    replace(dashboardRoute("mypage"));
  };

  const openDiagnosisInput = (entryMode: InitialSetupEntryMode) => {
    setShowDetailedInvite(false);
    navigate({ kind: "diagnosisInput", entryMode });
  };

  const handleStartQuickDiagnosis = () => {
    clearDiagnosisProgress();
    openDiagnosisInput("quickDiagnosis");
  };

  const handleStartDetailedDiagnosis = () => {
    openDiagnosisInput("detailedDiagnosis");
  };

  const handleViewDetailedDiagnosis = () => {
    setShowDetailedInvite(false);
    navigate(DIAGNOSIS_RESULT_ROUTE);
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

  if (route.kind === "landing") {
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

  if (route.kind === "auth") {
    return (
      <AuthPage
        initialMode={route.mode}
        onModeChange={(mode) => replace({ kind: "auth", mode })}
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

  if (route.kind === "diagnosisInput") {
    return (
      <InitialSetupScreen
        key={route.entryMode}
        entryMode={route.entryMode}
        onComplete={(submission) =>
          handleInitialSetupComplete(route.entryMode, submission)
        }
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

  const activeTab = route.tab;
  const showDiagnosisResult = route.view === "diagnosisResult";
  const plannerDetail = route.view === "plannerDetail" ? route : null;
  const isDemoAccount = sessionState.accountKind === "demo";
  const currentTabItem = NAV_ITEMS.find((item) => item.id === activeTab);
  const activeTabTitle = currentTabItem!.label;

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
              <RouteScreen
                mode={isDemoAccount ? "demo" : "api"}
                onNavigate={handleNavigate}
                detailRoute={
                  plannerDetail === null
                    ? undefined
                    : {
                        source: plannerDetail.source,
                        goalId: plannerDetail.goalId,
                        planId: plannerDetail.planId,
                      }
                }
                onOpenPlanDetail={(source, goalId, planId) =>
                  navigate(plannerDetailRoute(source, goalId, planId))
                }
                onBackFromDetail={() => navigate(dashboardRoute("planner"))}
              />
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
