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
import { Skeleton } from "../../components/common/skeleton";
import { DiagnosisStatusCard } from "../../components/diagnosis/diagnosis-status-card";
import type { ProfileExplanationPreferences } from "../../types/diagnosis";
import type { NavTabId } from "../../types/navigation";
import type { MyPageViewData } from "../../types/mypage";
import {
  createProfilePreferencesViewModel,
  createServerDiagnosisSummary,
} from "./mypage-profile-presenter";
import { MyPageSettingsForm } from "./mypage-settings-form";
import {
  PREFERENCES_CARD_TITLE,
  ProfileExplanationSettings,
} from "./profile-explanation-settings";
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

  /*
   * 로딩이라고 화면을 통째로 가리지 않는다. 바로가기와 진단 카드는 서버가
   * 필요 없으므로 그대로 살아 있고, 서버 값이 들어갈 자리만 비워 둔다.
   */
  const data = state.status === "success" ? state.data : null;
  const progress = readDiagnosisProgress();
  const serverRiskProfile = data?.riskProfile;
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
      {/*
        값 자리가 비어 있는 동안 상태를 한 번만 읽어 준다. 자리표시자 막대는
        전부 aria-hidden 이라 여기 말고는 읽힐 것이 없다.
      */}
      {data === null && (
        <span className="sr-only" role="status">
          마이페이지를 불러오는 중입니다. 프로필과 서버 설정을 확인하고 있습니다.
        </span>
      )}

      <ProfileCard data={data} onLogin={onLogin} onLogout={onLogout} />

      <DiagnosisStatusCard
        progress={progress}
        onStartQuick={onStartQuickDiagnosis}
        onStartDetailed={onStartDetailedDiagnosis}
        onViewDetailed={onViewDetailedDiagnosis}
        onRestart={onRestartDiagnosis}
        serverResult={serverResult}
      />

      {/*
        두 설정 카드는 서버 값으로 useState 를 채운다. 늦게 온 값은 그 상태에
        반영되지 않으므로, 값이 오기 전에는 폼을 세우지 않고 카드 틀과 제목만
        남긴 채 자리표시자를 깐다.
      */}
      {data === null ? (
        <Card title={PREFERENCES_CARD_TITLE}>
          <PlaceholderFields count={2} />
        </Card>
      ) : (
        <ProfileExplanationSettings
          model={createProfilePreferencesViewModel(
            data.settings,
            localPreferences,
            progress,
          )}
          onSave={handleSavePreferences}
        />
      )}

      <Card title="알림 설정">
        {data === null ? (
          <PlaceholderFields count={3} />
        ) : (
          <MyPageSettingsForm
            settings={data.settings}
            saveState={saveState}
            onSave={saveSettings}
          />
        )}
      </Card>

      <NotificationsCard data={data} />
      <ShortcutsCard onNavigate={onNavigate} onStartTour={onStartTour} />
    </section>
  );
}

/** 서버 값이 오기 전 폼 자리를 잡아 두는 줄. 라벨과 컨트롤 높이를 흉내 낸다. */
function PlaceholderFields({ count }: { readonly count: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {Array.from({ length: count }, (_unused, index) => (
        // 길이가 고정이고 재정렬이 없어 index 를 key 로 쓴다(AGENTS.md §7.6).
        <div
          key={index}
          style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}
        >
          <Skeleton width="7rem" />
          <Skeleton shape="block" height="2.5rem" />
        </div>
      ))}
    </div>
  );
}

function ProfileCard({
  data,
  onLogin,
  onLogout,
}: {
  /** 아직 서버를 기다리는 중이면 null. 제목과 버튼 자리는 그대로 둔다. */
  readonly data: MyPageViewData | null;
  readonly onLogin?: () => void;
  readonly onLogout?: () => void;
}) {
  const profile = data?.profile ?? null;

  return (
    <Card
      title="사용자 프로필"
      action={
        profile === null ? (
          <Skeleton width="4rem" />
        ) : (
          <Badge variant="primary">{profile.accountLabel}</Badge>
        )
      }
    >
      <div className="mypage-screen__profile">
        <span className="mypage-screen__avatar" aria-hidden="true">
          <Icon name="user" size={36} className="text-muted" />
        </span>
        <div className="mypage-screen__identity">
          <strong>{profile?.name ?? <Skeleton width="6rem" />}</strong>
          <span>{profile?.email ?? <Skeleton width="10rem" />}</span>
        </div>
        {profile === null && <Skeleton width="5.5rem" height="2.25rem" />}
        {profile !== null &&
          (profile.isDemoAccount
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
            ))}
      </div>
    </Card>
  );
}

/** 로딩 중 세워 둘 알림 자리표시자 수. */
const PLACEHOLDER_NOTIFICATIONS = [0, 1];

function NotificationsCard({
  data,
}: {
  /** 아직 서버를 기다리는 중이면 null. 제목은 그대로 두고 목록만 비운다. */
  readonly data: MyPageViewData | null;
}) {
  if (data === null) {
    return (
      <Card title="최근 알림">
        <ul className="mypage-screen__notifications">
          {PLACEHOLDER_NOTIFICATIONS.map((row) => (
            <li key={row}>
              <div>
                <Skeleton width="8rem" />
                <Skeleton width="5rem" />
              </div>
              <Skeleton width="80%" />
            </li>
          ))}
        </ul>
      </Card>
    );
  }

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
