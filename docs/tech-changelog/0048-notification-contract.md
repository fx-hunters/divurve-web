# 0048. 알림 응답 필드명을 백엔드 계약에 맞춘다 (`kind`·`body`·`isRead`)

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | AI Agent (Claude) |
| 변경 유형 | fix |
| 영향 범위 | 화면(헤더 알림 드롭다운·마이페이지 최근 알림) / API 타입 / 테스트 픽스처 |
| 관련 브랜치 | fix/notification-contract |
| 관련 커밋 | (미커밋) |
| 관련 이슈·PR | #52 (점검 #47, 원 구현 #38) |

## 변경 사유 (Why)

`GET /api/v1/notifications` 의 프론트 타입이 백엔드 계약과 어긋나 있었다.
필드 6개 중 3개가 실제 응답에 존재하지 않는 이름이었다.

| FE (틀림) | BE 직렬화 | camelCase 변환 후 |
|---|---|---|
| `type` | `kind` | `kind` |
| `message` | `body` | `body` |
| `read` | `is_read` | `isRead` |

divurve-api PR #132 로 데모 알림이 시드되면서 **실제 알림이 내려오기 시작했고**,
그 결과가 지금 사용자에게 그대로 노출되고 있었다.

- `notification.message` → `undefined` → **본문 자리가 항상 빈칸**
- `notification.read` → `undefined`(falsy) → **모든 알림이 "안 읽음"** 으로 표시
- `notification.type` → `undefined` → 종류별 구분 불가

구현 당시(#38)에는 백엔드가 빈 배열만 반환해 실물 검증이 불가능했고, 픽스처를
**FE 타입에서 역산해** 만들었기 때문에 커버리지 100% 인 채로 버그가 살아남았다.
이번에는 데모 세션 토큰으로 받은 **실제 응답을 그대로** 픽스처에 옮겨 같은 방식의
재발을 막는다.

확인한 실제 응답 (2026-09-08, 데모 세션):

```json
{"data":{"notifications":[{"id":"0fc0bc6e-9277-4ed3-8d98-4b10ee2eb802",
"kind":"target_zone","title":"목표 구간에 가까워지고 있어요",
"body":"미국 대학원 학비 목표가 목표 금액의 약 70%에 도달했습니다.",
"created_at":"2026-09-08T04:26:39.969510Z","is_read":false}]}}
```

## 변경 내용 (What)

- `api/generated/divurve-api.ts` — `NotificationDto` 를 `kind`·`body`·`isRead` 로 교정.
  `kind` 는 백엔드 `allowableValues` 6종을 그대로 옮긴 문자열 리터럴 유니온
  `NotificationKind`(`step_due`·`regime_shift`·`deadline_near`·`target_zone`·
  `safe_mode`·`concentration`)로 선언했다 (AGENTS.md §4·§7.4).
- `api/notifications.ts` — `NotificationKind` 를 함께 재노출.
- `components/layout/notification-menu.tsx` — `body`·`isRead` 참조로 교정하고,
  종류 라벨을 `Record<NotificationKind, string>` 으로 두어 백엔드가 종류를 추가하면
  **컴파일 에러**가 나게 했다. 색은 기존 토큰만 사용(`var(--text-muted)` 등).
- `screens/mypage/mypage-presenter.ts` — `notification.body`·`notification.isRead`
  로 교정. 화면 뷰 모델(`NotificationView`)의 필드명은 표시용이므로 그대로 둔다.
- `test/api-fixtures.ts` — `NOTIFICATIONS_FIXTURE` 를 신설하고 위 실제 응답을 그대로
  옮겼다. `MY_PAGE_API_FIXTURE.notifications` 도 이 픽스처를 참조한다.
- 알림 관련 테스트 4종(`api/notifications.test.ts`, `use-notifications.test.ts`,
  `notification-menu.test.tsx`, mypage 테스트 2종)이 이 픽스처를 쓰도록 바꾸고,
  종류 6종 라벨을 모두 렌더하는 테스트를 추가했다.

## 영향 / 리스크

- 헤더 드롭다운과 마이페이지 "최근 알림"에서 **본문이 다시 보이고**, 안 읽은 알림에만
  강조 점·"새 알림" 문구가 붙는다. 수치 변경은 없다.
- 드롭다운 행에 종류 라벨 한 줄이 추가된다 (기존 토큰 색만 사용).
- 백엔드가 `kind` 에 7번째 값을 추가하면 `KIND_LABELS` 누락으로 빌드가 실패한다 —
  의도된 동작이다(조용한 빈칸보다 낫다).
- `NotificationDto` 외 다른 인터페이스는 건드리지 않았다.
- `docs/api-audit-2026-09.md` H3 항목이 이 변경으로 해소된다(문서 갱신은 별도).

## 검증

- [x] 테스트 통과 + 커버리지 100% — `npx vitest run --coverage`:
      106 files / 835 tests 통과, All files 100%(line·branch·function·statement)
- [x] `npm run lint` (0 errors), `npm run build` (tsc --noEmit + vite build) 통과
- [x] 데모 세션 토큰으로 `GET /api/v1/notifications` 실제 응답을 직접 받아 필드명 확인
- [x] 백엔드 DTO 원본(`dto/notifications/NotificationsResponse.java`)의
      `allowableValues` 6종과 `NotificationKind` 리터럴 대조
- [ ] (수치 변경 시) 변경 전후 값 확인 — 해당 없음

## 롤백 방법

이 변경의 커밋을 `git revert` 한다. 되돌리면 본문 빈칸·전건 "안 읽음" 표시 버그가
그대로 돌아오므로, 백엔드가 필드명을 되돌린 경우에만 의미가 있다.
