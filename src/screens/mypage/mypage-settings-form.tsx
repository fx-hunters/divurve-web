import { useState } from "react";
import type {
  NotificationSettingKey,
  SettingsUpdateRequest,
} from "../../api/generated/divurve-api";
import type { SettingsView } from "../../types/mypage";
import type { SettingsSaveState } from "./use-mypage";

interface MyPageSettingsFormProps {
  readonly settings: SettingsView;
  readonly saveState: SettingsSaveState;
  readonly onSave: (input: SettingsUpdateRequest) => void;
}

/**
 * 서버 알림 설정을 편집한다.
 *
 * 환전 우대율과 스프레드는 서버 계산 계약에 속하므로 사용자 프로필 설정에서
 * 편집하거나 다시 계산하지 않는다. 설명 분야와 수준은 별도 설정 컴포넌트가
 * 브라우저 임시 상태의 출처를 구분해 관리한다.
 */
export function MyPageSettingsForm({
  settings,
  saveState,
  onSave,
}: MyPageSettingsFormProps) {
  const [notifications, setNotifications] = useState<
    Readonly<Record<NotificationSettingKey, boolean>>
  >(() =>
    Object.fromEntries(
      settings.notificationSettings.map((item) => [item.key, item.isEnabled]),
    ) as Record<NotificationSettingKey, boolean>,
  );

  return (
    <form
      className="mypage-notification-settings"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(notifications);
      }}
    >
      <fieldset>
        <legend>계획 변화 알림</legend>
        {settings.notificationSettings.map((item) => (
          <label key={item.key}>
            <input
              type="checkbox"
              checked={notifications[item.key]}
              onChange={() =>
                setNotifications((current) => ({
                  ...current,
                  [item.key]: !current[item.key],
                }))
              }
            />
            <span>{item.label}</span>
          </label>
        ))}
      </fieldset>

      <div className="mypage-notification-settings__actions">
        <button type="submit" disabled={saveState.status === "saving"}>
          {saveState.status === "saving" ? "저장 중…" : "알림 설정 저장"}
        </button>
        {saveState.status === "saved" && (
          <span role="status">서버에 저장했습니다.</span>
        )}
        {saveState.status === "error" && (
          <span role="alert">{saveState.message}</span>
        )}
      </div>
    </form>
  );
}
