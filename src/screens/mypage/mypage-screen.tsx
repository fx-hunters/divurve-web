import { useState } from "react";
import { readDiagnosisProgress } from "../../api/diagnosis-progress-store";
import {
  readProfilePreferences,
  writeProfilePreferences,
} from "../../api/profile-preferences-store";
import { ApiStateView } from "../../components/common/api-state-view";
import { Badge } from "../../components/common/badge";
import { Card } from "../../components/common/card";
import { Icon } from "../../components/common/icon";
import { DiagnosisStatusCard } from "../../components/diagnosis/diagnosis-status-card";
import type { ProfileExplanationPreferences } from "../../types/diagnosis";
import type { NavTabId } from "../../types/navigation";
import type { MyPageViewData } from "../../types/mypage";
import {
  createProfilePreferencesViewModel,
  createServerDiagnosisSummary,
} from "./mypage-profile-presenter";
import { MyPageSettingsForm } from "./mypage-settings-form";
import { ProfileExplanationSettings } from "./profile-explanation-settings";
import { useMyPage, type MyPageDependencies } from "./use-mypage";
import "./mypage-screen.css";

export interface MyPageScreenProps {
  readonly onNavigate?: (tab: NavTabId) => void;
  readonly onLogin?: () => void;
  readonly onLogout?: () => void;
  readonly onStartTour?: () => void;
  readonly onStartQuickDiagnosis?: () => void;
  readonly onStartDetailedDiagnosis?: () => void;
  readonly onViewDetailedDiagnosis?: () => void;
  readonly onRestartDiagnosis?: () => void;
  readonly dependencies?: MyPageDependencies;
}

export function MyPageScreen({
  onNavigate,
  onLogin,
  onLogout,
  onStartTour,
  onStartQuickDiagnosis,
  onStartDetailedDiagnosis,
  onViewDetailedDiagnosis,
  onRestartDiagnosis,
  dependencies,
}: MyPageScreenProps) {
  const { state, saveState, reload, saveSettings } = useMyPage(dependencies);
  const [localPreferences, setLocalPreferences] = useState(
    readProfilePreferences,
  );

  if (state.status === "loading") {
    return (
      <ApiStateView
        status="loading"
        title="마이페이지를 불러오는 중입니다"
        message="프로필과 서버 설정을 확인하고 있습니다."
      />
    );
  }

  if (state.status === "error") {
    return (
      <ApiStateView
        status="error"
        title="마이페이지를 불러오지 못했습니다"
        message={state.message}
        onRetry={reload}
      />
    );
  }

  const progress = readDiagnosisProgress();
  const preferenceModel = createProfilePreferencesViewModel(
    state.data.settings,
    localPreferences,
    progress,
  );
  const serverRiskProfile = state.data.riskProfile;
  const serverResult = serverRiskProfile?.isMeasured
    ? createServerDiagnosisSummary(serverRiskProfile.grade, {
        scoreLabel: serverRiskProfile.scoreLabel,
        diagnosedOnLabel: serverRiskProfile.diagnosedOnLabel,
        limitationNote: serverRiskProfile.limitationNote,
      })
    : undefined;

  const handleSavePreferences = (
    preferences: ProfileExplanationPreferences,
  ) => {
    writeProfilePreferences(preferences);
    setLocalPreferences(preferences);
  };

  return (
    <section aria-label="마이페이지" className="mypage-screen">
      <ProfileCard
        data={state.data}
        onLogin={onLogin}
        onLogout={onLogout}
      />

      <DiagnosisStatusCard
        progress={progress}
        onStartQuick={onStartQuickDiagnosis}
        onStartDetailed={onStartDetailedDiagnosis}
        onViewDetailed={onViewDetailedDiagnosis}
        onRestart={onRestartDiagnosis}
        serverResult={serverResult}
      />

      <ProfileExplanationSettings
        model={preferenceModel}
        onSave={handleSavePreferences}
      />

      <Card title="알림 설정">
        <MyPageSettingsForm
          settings={state.data.settings}
          saveState={saveState}
          onSave={saveSettings}
        />
      </Card>

      <NotificationsCard data={state.data} />
      <ShortcutsCard onNavigate={onNavigate} onStartTour={onStartTour} />
    </section>
  );
}

function ProfileCard({
  data,
  onLogin,
  onLogout,
}: {
  readonly data: MyPageViewData;
  readonly onLogin?: () => void;
  readonly onLogout?: () => void;
}) {
  const { profile } = data;

  return (
    <Card
      title="사용자 프로필"
      action={<Badge variant="primary">{profile.accountLabel}</Badge>}
    >
      <div className="mypage-screen__profile">
        <span className="mypage-screen__avatar" aria-hidden="true">
          <Icon name="user" size={36} className="text-muted" />
        </span>
        <div className="mypage-screen__identity">
          <strong>{profile.name}</strong>
          <span>{profile.email}</span>
        </div>
        {profile.isDemoAccount
          ? onLogin && (
              <button
                className="mypage-screen__account-action mypage-screen__account-action--primary"
                type="button"
                onClick={onLogin}
              >
                <Icon name="logIn" size={15} />
                로그인
              </button>
            )
          : onLogout && (
              <button
                className="mypage-screen__account-action"
                type="button"
                onClick={onLogout}
              >
                <Icon name="logOut" size={15} />
                로그아웃
              </button>
            )}
      </div>
    </Card>
  );
}

function NotificationsCard({ data }: { readonly data: MyPageViewData }) {
  return (
    <Card title="최근 알림">
      {data.notifications.length === 0 ? (
        <p className="mypage-screen__muted">새 알림이 없습니다.</p>
      ) : (
        <ul className="mypage-screen__notifications">
          {data.notifications.map((notification) => (
            <li key={notification.id}>
              <div>
                <strong>{notification.title}</strong>
                <span>
                  {notification.receivedAtLabel}
                  {notification.isRead ? "" : " · 새 알림"}
                </span>
              </div>
              <p>{notification.message}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ShortcutsCard({
  onNavigate,
  onStartTour,
}: {
  readonly onNavigate?: (tab: NavTabId) => void;
  readonly onStartTour?: () => void;
}) {
  return (
    <Card title="바로가기">
      <div className="mypage-screen__shortcuts">
        <button type="button" onClick={() => onNavigate?.("assets")}>
          자산 내역 편집
          <Icon name="arrowRight" size={16} className="text-muted" />
        </button>
        <button type="button" onClick={() => onNavigate?.("planner")}>
          외화 목표 편집
          <Icon name="arrowRight" size={16} className="text-muted" />
        </button>
        {onStartTour && (
          <button type="button" onClick={onStartTour}>
            <Icon name="sparkles" size={16} className="text-primary" />
            가이드 투어 다시보기
          </button>
        )}
      </div>
    </Card>
  );
}
