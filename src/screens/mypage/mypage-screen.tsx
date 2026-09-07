import { useMyPage, NOTIFICATION_OPTIONS } from './use-mypage';
import { Icon } from '../../components/common/icon';
import type { NavTabId } from '../../types/navigation';
import { MyPageApiScreen } from './mypage-api-screen';
import type { MyPageApiDependencies } from './use-mypage-api';

export interface MyPageScreenProps {
  readonly isDemo?: boolean;
  readonly isLoggedIn?: boolean;
  readonly onNavigate?: (tab: NavTabId) => void;
  readonly onLogin?: () => void;
  readonly onLogout?: () => void;
  readonly onStartTour?: () => void;
  readonly onStartQuickDiagnosis?: () => void;
  readonly onStartDetailedDiagnosis?: () => void;
  readonly onViewDetailedDiagnosis?: () => void;
  readonly onRestartDiagnosis?: () => void;
  readonly apiDependencies?: MyPageApiDependencies;
}

export function MyPageScreen({
  isDemo = true,
  isLoggedIn = true,
  onNavigate,
  onLogin,
  onLogout,
  onStartTour,
  onStartQuickDiagnosis,
  onStartDetailedDiagnosis,
  onViewDetailedDiagnosis,
  onRestartDiagnosis,
  apiDependencies,
}: MyPageScreenProps) {
  if (!isDemo) {
    return (
      <MyPageApiScreen
        onNavigate={onNavigate}
        onLogout={onLogout}
        onStartTour={onStartTour}
        onStartQuickDiagnosis={onStartQuickDiagnosis}
        onStartDetailedDiagnosis={onStartDetailedDiagnosis}
        onViewDetailedDiagnosis={onViewDetailedDiagnosis}
        onRestartDiagnosis={onRestartDiagnosis}
        dependencies={apiDependencies}
      />
    );
  }

  return (
    <MyPageDemoScreen
      isLoggedIn={isLoggedIn}
      onNavigate={onNavigate}
      onLogin={onLogin}
      onLogout={onLogout}
      onStartTour={onStartTour}
    />
  );
}

function MyPageDemoScreen({
  isLoggedIn = true,
  onNavigate,
  onLogin,
  onLogout,
  onStartTour,
}: MyPageScreenProps) {
  const {
    profile,
    notifications,
    toastMessage,
    toggleNotification,
    handlePasswordChange,
    handleLogout,
    handleLogin,
    handleRediagnosis,
  } = useMyPage();

  const handleNavigate = (tab: NavTabId) => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  const handleLoginClick = () => {
    if (onLogin) {
      onLogin();
    } else {
      handleLogin();
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      handleLogout();
    }
  };

  return (
    <div
      style={{
        maxWidth: '48rem',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      {/* 토스트 피드백 */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '5rem',
            right: '1.5rem',
            zIndex: 9999,
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--primary)',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            animation: 'barSlideInDown 0.35s var(--ease-out-smooth) forwards',
            transition: 'all var(--transition-normal)',
          }}
        >
          <Icon name="checkCircle" size={18} className="text-primary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. 사용자 프로필 카드 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          padding: 'clamp(1.25rem, 3.5vw, 2rem)',
          borderRadius: 'var(--radius-2xl)',
          flexWrap: 'wrap',
        }}
      >
        {/* 아바타 */}
        <div
          style={{
            width: '5rem',
            height: '5rem',
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0,
          }}
        >
          <Icon name="user" size={40} className="text-muted" />
        </div>

        {/* 이름 / 이메일 */}
        <div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.25rem',
              color: 'var(--text)',
            }}
          >
            {profile.name}
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {profile.email}
          </p>
        </div>

        {/* 액션 버튼 그룹 */}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            flexWrap: 'wrap',
          }}
        >
          {isLoggedIn ? (
            <>
              {/* 비밀번호 변경 버튼 */}
              <button
                type="button"
                onClick={handlePasswordChange}
                style={{
                  padding: '0.625rem 1rem',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <Icon name="edit" size={15} className="text-muted" />
                <span>비밀번호 변경</span>
              </button>

              {/* 로그아웃 버튼 */}
              <button
                type="button"
                onClick={handleLogoutClick}
                style={{
                  padding: '0.625rem 1rem',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--danger)';
                  e.currentTarget.style.color = 'var(--danger)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <Icon name="logOut" size={15} />
                <span>로그아웃</span>
              </button>
            </>
          ) : (
            /* 로그인 버튼 (비로그인 상태일 때) */
            <button
              type="button"
              onClick={handleLoginClick}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-content)',
                border: 'none',
                borderRadius: 'var(--radius-xl)',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: 'var(--shadow-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <Icon name="logIn" size={15} />
              <span>로그인</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. 의사결정 프로필 (투자성향) */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          padding: 'clamp(1.25rem, 3.5vw, 2rem)',
          borderRadius: 'var(--radius-2xl)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
                color: 'var(--text)',
              }}
            >
              의사결정 프로필 (투자성향)
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-muted)',
              }}
            >
              안전 버킷 하한과 집중도 기준선 판정에 쓰입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRediagnosis}
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              backgroundColor: 'var(--primary-subtle)',
              color: 'var(--primary)',
              border: '1px solid var(--primary-border)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-border)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-subtle)';
            }}
          >
            재진단
          </button>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Icon name="shield" size={28} className="text-primary" />
            <span
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              {profile.riskProfile}
            </span>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '0.375rem 0.75rem',
              borderRadius: 'var(--radius-lg)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            진단일: {profile.diagnosisDate}
          </span>
        </div>
      </div>

      {/* 3. 기본 설정 */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          padding: 'clamp(1.25rem, 3.5vw, 2rem)',
          borderRadius: 'var(--radius-2xl)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            borderBottom: '1px solid var(--border)',
            paddingBottom: '1rem',
            color: 'var(--text)',
          }}
        >
          기본 설정
        </h2>

        {/* 알림 설정 */}
        <div
          style={{
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <h3
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              marginBottom: '1.25rem',
              color: 'var(--text)',
            }}
          >
            알림 설정 (계획 변화 기준)
          </h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {NOTIFICATION_OPTIONS.map((item) => {
              const isChecked = notifications[item.id];
              return (
                <label
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    cursor: 'pointer',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid transparent',
                    transition: 'all 0.2s',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleNotification(item.id)}
                    style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      accentColor: 'var(--primary)',
                      cursor: 'pointer',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'var(--text)',
                    }}
                  >
                    {item.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. 바로가기 */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          padding: 'clamp(1.25rem, 3.5vw, 2rem)',
          borderRadius: 'var(--radius-2xl)',
        }}
      >
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            borderBottom: '1px solid var(--border)',
            paddingBottom: '1rem',
            marginBottom: '1.5rem',
            color: 'var(--text)',
          }}
        >
          바로가기
        </h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleNavigate('assets')}
            style={{
              fontSize: '0.875rem',
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontWeight: 600,
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-xl)',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            자산 내역 편집 <Icon name="arrowRight" size={16} className="text-muted" />
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('planner')}
            className="btn-primary-glow"
            style={{
              fontSize: '0.875rem',
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-content)',
              fontWeight: 700,
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-xl)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            외화 목표 편집 <Icon name="arrowRight" size={16} className="opacity-70" />
          </button>
          {onStartTour && (
            <button
              type="button"
              onClick={onStartTour}
              style={{
                fontSize: '0.875rem',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontWeight: 600,
                padding: '0.75rem 1.25rem',
                borderRadius: 'var(--radius-xl)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-sm)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.color = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text)';
              }}
            >
              <Icon name="sparkles" size={16} className="text-primary" />
              <span>가이드 투어 다시보기</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
