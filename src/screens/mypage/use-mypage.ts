import { useState, useCallback, useMemo } from 'react';
import type {
  UserProfile,
  NotificationKey,
  NotificationOption,
  RiskProfileType,
} from '../../types/mypage';

export const NOTIFICATION_OPTIONS: readonly NotificationOption[] = [
  { id: 'budgetWarning', label: '예산 부족 경고' },
  { id: 'highVolatility', label: '고변동성 구간 진입' },
  { id: 'opportunityBucket', label: '기회 버킷 실행 알림' },
  { id: 'safetyMode', label: '안전모드 전환 알림' },
] as const;

export const INITIAL_USER_PROFILE: UserProfile = {
  name: '김데모',
  email: 'demo.kim@example.com',
  riskProfile: '안정항로형',
  diagnosisDate: '2026.08.15',
};

const RISK_PROFILES: readonly RiskProfileType[] = [
  '안정항로형',
  '균형항로형',
  '적극항로형',
  '도전항로형',
];

export function useMyPage() {
  const [profile, setProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [bankPreferentialRate, setBankPreferentialRate] = useState<number>(80);
  const [notifications, setNotifications] = useState<Record<NotificationKey, boolean>>({
    budgetWarning: true,
    highVolatility: true,
    opportunityBucket: false,
    safetyMode: false,
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 3000);
  }, []);

  const handleRateChange = useCallback((newRate: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newRate)));
    setBankPreferentialRate(clamped);
  }, []);

  const toggleNotification = useCallback((key: NotificationKey) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handlePasswordChange = useCallback(() => {
    showToast('비밀번호 변경 안내 메일이 발송되었습니다.');
  }, [showToast]);

  const handleLogout = useCallback(() => {
    showToast('로그아웃되었습니다.');
  }, [showToast]);

  const handleLogin = useCallback(() => {
    showToast('로그인 페이지로 이동합니다.');
  }, [showToast]);

  const handleRediagnosis = useCallback(() => {
    // Cycle to next risk profile or update date
    setProfile((prev) => {
      const currentIndex = RISK_PROFILES.indexOf(prev.riskProfile);
      const nextIndex = (currentIndex + 1) % RISK_PROFILES.length;
      const nextProfile = RISK_PROFILES[nextIndex] as RiskProfileType;
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
      return {
        ...prev,
        riskProfile: nextProfile,
        diagnosisDate: today,
      };
    });
    showToast('의사결정 성향이 재진단되었습니다.');
  }, [showToast]);

  // Base standard spread is ~1.0%, so at 80% discount effective spread is 0.2%
  const effectiveSpread = useMemo(() => {
    const spread = (1.0 * (100 - bankPreferentialRate)) / 100;
    return spread.toFixed(1);
  }, [bankPreferentialRate]);

  return {
    profile,
    bankPreferentialRate,
    notifications,
    toastMessage,
    effectiveSpread,
    setBankPreferentialRate: handleRateChange,
    toggleNotification,
    handlePasswordChange,
    handleLogout,
    handleLogin,
    handleRediagnosis,
    clearToast: () => setToastMessage(null),
  };
}
