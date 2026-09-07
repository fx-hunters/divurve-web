# 0025. 마이페이지를 실제 API 데이터로 통합

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-07 |
| 작성자 | Claude (Opus 5) |
| 변경 유형 | feat / refactor |
| 영향 범위 | 화면(마이페이지) / 상태 / API |
| 관련 브랜치 | feat/mypage-api-integration |
| 관련 커밋 | (커밋 후 기입) |
| 관련 이슈·PR | #18 |

## 변경 사유 (Why)

마이페이지는 데모용 화면(`MyPageDemoScreen`, 인라인 스타일·풍부한 레이아웃)과 API용 화면(`MyPageApiScreen`, Card 기반 텍스트)이 **같은 4개 섹션을 두 벌로 구현**하고 있었다. 데모 쪽은 `INITIAL_USER_PROFILE`("김데모") 상수를 렌더하고, 실효 스프레드를 `(1.0 * (100 - rate)) / 100`으로 **프론트에서 계산**했다. AGENTS.md §1("계산 로직을 프론트에 다시 구현하지 않는다")에 정면으로 어긋나고, 서버 값과 갈릴 수밖에 없다.

데모 데이터 결정 주체를 BE로 옮기는 작업(PR-C)의 첫 도메인으로, **완성도가 높은 데모 UI를 정본으로 남기고 데이터 출처만 API로 교체**한다.

## 변경 내용 (What)

- `screens/mypage/mypage-presenter.ts` 신규: `MyPageBundle` → 화면 데이터 순수 변환. 라벨·포매팅·단위 변환(비율→퍼센트)만 하고 수치를 새로 만들지 않는다
- `types/mypage.ts`: 데모 상수용 타입(`UserProfile`, `RiskProfileType`, `NotificationOption`)을 표시 데이터 타입으로 교체
- `use-mypage.ts`: 단일 훅으로 재작성. `use-mypage-api.ts`를 흡수하고 loading/error/success + 저장 상태를 다룬다. **의존성 객체를 ref로 참조**해, 호출자가 인라인 객체를 넘겨도 조회가 반복되지 않는다
- `mypage-screen.tsx`: `isDemo` 분기 삭제. 데모 UI 레이아웃을 유지한 채 서버 데이터로 채운다. 계정 배지는 `ProfileResponse.isDemo`가 결정하고, 데모 계정에는 로그인 CTA를, 회원 계정에는 로그아웃을 노출한다
- `mypage-settings-form.tsx` 신규: 조회 완료 후에만 마운트되어 서버 값으로 초기화한다. 우대율 슬라이더 + 알림 5종 토글을 `PUT /api/v1/me/settings`로 저장
- 삭제: `mypage-api-screen.tsx`, `use-mypage-api.ts`, `INITIAL_USER_PROFILE`, FE 실효 스프레드 계산식, 근거 없이 동작하던 `handleRediagnosis`·`handlePasswordChange` 토스트

## 영향 / 리스크

### 수치 변경 — 실효 스프레드

| 항목 | 변경 전 (FE 계산) | 변경 후 (서버 값) |
|---|---|---|
| 우대율 80% | `1.0 × (100-80)/100` = **0.2%** | 서버 `effective_spread_ratio` = **0.20%** (기준 1.00% 기준) |
| 우대율 60%, 기준 스프레드 1.75% | **0.4%** (기준 스프레드를 1.0%로 가정) | **0.70%** |

FE는 기준 스프레드를 1.0%로 **하드코딩**하고 있었는데 실제 서버 기준값은 1.75%였다. 즉 기존 표시는 틀린 값이었다.

### 그 밖

- 프로필·성향·알림이 이제 실제 계정 데이터다. 갓 발급된 데모 계정은 알림이 없고 성향이 미진단이라 각각 빈 상태로 표시된다
- 계약이 없는 기능(재진단, 비밀번호 변경)은 **버튼을 제거**했다. 아무 일도 하지 않으면서 성공 토스트를 띄우고 있었기 때문이다
- 진단 전 상태를 `status: "not_measured"`로 판정한다. 백엔드의 `limitationNote`(해커톤 MVP 가설 안내)를 그대로 노출한다
- `MyPageScreen`에서 `isDemo`·`isLoggedIn` prop이 사라졌다. 호출처는 `app.tsx` 한 곳

## 검증

- [x] 테스트 통과 + 커버리지 100% (338 passed)
- [x] `npm run lint` 오류 0건, `npm run build` 성공
- [x] 실제 배포 BE 대상 수동 확인:
  - 데모 계정 프로필·설정·알림 5종이 서버 값으로 렌더됨
  - 미진단 계정에 "아직 성향 진단 결과가 없습니다" + `limitationNote` 표시
  - 우대율 60% + 알림 토글 변경 후 저장 → `PUT /me/settings` 성공, **서버가 재계산한 실효 스프레드 0.70%로 갱신됨**
- [x] 수치 변경 전후 값 확인 (위 표)

## 롤백 방법

`0024`(계약 재동기화)에 의존한다. 되돌리려면 이 커밋을 revert하면 되고, 그 경우 데모 상수 기반 마이페이지와 FE 실효 스프레드 계산식이 복구된다.
