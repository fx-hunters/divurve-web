import { useState } from "react";
import { readDiagnosisProgress } from "../../api/diagnosis-progress-store";
import {
  readProfilePreferences,
  writeProfilePreferences,
} from "../../api/profile-preferences-store";
import { ApiStateView } from "../../components/common/api-state-view";
import { Badge } from "../../components/common/badge";
import { Card } from "../../components/common/card";
import { DiagnosisStatusCard } from "../../components/diagnosis/diagnosis-status-card";
import type { ProfileExplanationPreferences } from "../../types/diagnosis";
import type { NavTabId } from "../../types/navigation";
import {
  createProfilePreferencesViewModel,
  createServerDiagnosisSummary,
} from "./mypage-profile-presenter";
import { ProfileExplanationSettings } from "./profile-explanation-settings";
import {
  useMyPageApi,
  type MyPageApiDependencies,
} from "./use-mypage-api";
import "./mypage-api-screen.css";

interface MyPageApiScreenProps {
  readonly onNavigate?: (tab: NavTabId) => void;
  readonly onLogout?: () => void;
  readonly onStartTour?: () => void;
  readonly onStartQuickDiagnosis?: () => void;
  readonly onStartDetailedDiagnosis?: () => void;
  readonly onViewDetailedDiagnosis?: () => void;
  readonly onRestartDiagnosis?: () => void;
  readonly dependencies?: MyPageApiDependencies;
}

export function MyPageApiScreen({
  onNavigate,
  onLogout,
  onStartTour,
  onStartQuickDiagnosis,
  onStartDetailedDiagnosis,
  onViewDetailedDiagnosis,
  onRestartDiagnosis,
  dependencies,
}: MyPageApiScreenProps) {
  const { state, reload } = useMyPageApi(dependencies);
  const [localPreferences, setLocalPreferences] = useState(
    readProfilePreferences,
  );

  if (state.status === "loading") {
    return (
      <ApiStateView
        status="loading"
        title="사용자 설정을 불러오는 중입니다"
        message="프로필과 설정을 확인하고 있습니다."
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

  const { profile, settings, riskProfile, notifications } = state.data;
  const progress = readDiagnosisProgress();
  const preferenceModel = createProfilePreferencesViewModel(
    settings,
    localPreferences,
    progress,
  );
  const serverResult = riskProfile
    ? createServerDiagnosisSummary(riskProfile.riskType)
    : undefined;

  const handleSavePreferences = (
    preferences: ProfileExplanationPreferences,
  ) => {
    writeProfilePreferences(preferences);
    setLocalPreferences(preferences);
  };

  return (
    <section aria-label="마이페이지" className="mypage-api">
      <Card
        title="사용자 프로필"
        action={
          <Badge variant="primary">
            {profile.isDemo ? "데모 계정" : "회원 계정"}
          </Badge>
        }
      >
        <strong className="mypage-api__profile-name">{profile.name}</strong>
        <p className="mypage-api__muted">{profile.email}</p>
      </Card>

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

      <Card title="최근 알림">
        {notifications.notifications.length === 0 ? (
          <p className="mypage-api__muted">새 알림이 없습니다.</p>
        ) : (
          <ul className="mypage-api__notifications">
            {notifications.notifications.map((notification) => (
              <li key={notification.id}>
                <strong>{notification.title}</strong> · {notification.message}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mypage-api__links">
        {onNavigate && (
          <>
            <button
              className="mypage-api__link"
              type="button"
              onClick={() => onNavigate("assets")}
            >
              자산 내역 보기
            </button>
            <button
              className="mypage-api__link"
              type="button"
              onClick={() => onNavigate("planner")}
            >
              외화 목표 보기
            </button>
          </>
        )}
        {onStartTour && (
          <button
            className="mypage-api__link mypage-api__link--neutral"
            type="button"
            onClick={onStartTour}
          >
            가이드 투어 다시보기
          </button>
        )}
        {onLogout && (
          <button
            className="mypage-api__link mypage-api__link--danger"
            type="button"
            onClick={onLogout}
          >
            로그아웃
          </button>
        )}
      </div>
    </section>
  );
}
