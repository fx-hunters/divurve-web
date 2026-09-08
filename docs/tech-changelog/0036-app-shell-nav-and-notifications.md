# 0036. 앱 셸 내비게이션 재편 · 연결 확인 제거 · 알림 메뉴 연결

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | Claude (AI Agent) |
| 변경 유형 | chore / feat |
| 영향 범위 | 화면, API, 상태 |
| 관련 브랜치 | chore/app-shell-nav |
| 관련 커밋 | (PR 머지 시 기입) |
| 관련 이슈·PR | #38 |

## 변경 사유 (Why)

세 가지 요구가 모두 앱 셸(사이드바·헤더)이라는 한 덩어리를 건드려서 함께 처리했다. 따로 쪼갰으면 `components/layout/**`와 `types/navigation.ts`를 두고 충돌만 났다.

**1. 사이드바 메뉴명이 화면 내용과 어긋나 있었다.** "홈"은 실제로는 요약 지표를 모아 보여주는 대시보드였고, "환율 범위"는 화면 안에서 이미 "전망"이라는 어휘를 쓰고 있었다. 메뉴명과 화면 어휘가 다르면 사용자는 같은 걸 두 이름으로 배워야 한다.

**2. '연결 확인'은 개발용 진단 화면이지 사용자 기능이 아니었다.** 백엔드 연결 상태를 점검하려고 만든 화면(변경 로그 0004)이 사용자 내비게이션에 그대로 남아 있었다. 사용자에게는 의미가 없고, 메뉴 한 칸을 차지하며, 계약 점검용 코드가 제품 번들에 실렸다.

**3. 알림 아이콘이 눌러도 아무 반응이 없었다.** 조사해 보니 백엔드에 `GET /api/v1/notifications`가 이미 있었다 — 다만 `NotificationController`가 아직 빈 목록만 반환한다(TODO). 아이콘을 지우는 선택지도 있었으나, 엔드포인트가 실재하고 서버가 알림을 채우면 그대로 동작하므로 **삭제 대신 연결**하기로 했다. 죽은 버튼을 남겨두는 것과 지우는 것 사이에서, 이미 있는 계약에 붙이는 쪽이 낭비가 적다.

**4. 헤더 제목이 사이드바 로고와 어긋나 보였다.** 두 블록의 높이 계산 기준이 달라(패딩 vs `--header-height`) 구분선과 제목 기준선이 미묘하게 틀어져 있었다.

## 변경 내용 (What)

- `types/navigation.ts` — 메뉴 5개로 재편. 라벨 `홈`→`대시보드`, `환율 범위`→`환율 전망`. 순서를 **대시보드 / 환전 플래너 / 환율 전망 / 내 자산 / 마이페이지**로 조정하고, `NavTabId`·`iconName` 유니온에서 `connectivity` 제거
- `components/layout/header.tsx` — `box-sizing: border-box` + 명시적 `line-height`로 사이드바 로고 블록(좌우 여백 `1.5rem`)과 기준선 정렬. 기본 `activeTabTitle`도 "대시보드"로
- `api/notifications.ts` (신규) — `GET /api/v1/notifications`. 언래핑·표기 변환은 기존 `client.ts` 래퍼에 위임해 경계를 한 곳으로 유지 (AGENTS.md §4·§5)
- `components/layout/use-notifications.ts` (신규) — 값·상태만 반환하는 훅 (§7.3)
- `components/layout/notification-menu.tsx` (신규) — 헤더 알림 드롭다운. 로딩/빈/에러 상태를 각각 렌더(§7.8), `aria-expanded`·Escape·외부 클릭 닫기 지원
- **연결 확인 완전 제거** — `screens/connectivity/**`, `api/connectivity.ts`(+테스트), `app/app.tsx` 분기, `hooks/use-tab-navigation.ts` 경로 매핑, `components/common/icon.tsx`의 `connectivity` 아이콘

## 영향 / 리스크

- **`NavTabId`에서 `connectivity`가 사라졌다.** 타입 유니온이라 잔여 참조는 `tsc --noEmit`에서 전부 잡힌다. `grep -rn "connectivity" src` 0건으로 확인
- **알림은 당분간 항상 빈 상태로 보인다.** 백엔드가 아직 알림을 생성하지 않기 때문이며, 프론트 결함이 아니다. 서버가 채우면 코드 변경 없이 목록이 나온다
- 사용자가 기억하던 "홈"·"환율 범위"라는 이름이 바뀐다. 화면 내용은 그대로다
- URL 경로는 건드리지 않았다 — 라벨만 바뀌어 기존 링크는 그대로 동작한다

## 검증

- [x] 테스트 통과 + 커버리지 100% (704 tests / 93 files, `All files` 100%)
- [x] `npm run lint` 0 errors
- [x] `npm run build` (tsc --noEmit 포함) 통과 — connectivity 잔여 참조 없음을 타입 검사로 확증
- [x] `grep -rn "connectivity" src` 0건
- [ ] (수치 변경 없음)

## 롤백 방법

이 브랜치의 머지 커밋을 `git revert -m 1` 한다. `api/notifications.ts`와 알림 메뉴만 되돌리려면 해당 파일 삭제 후 `header.tsx`의 `NotificationMenu` 자리에 이전의 정적 `aria-label="알림"` 버튼을 복원하면 된다. 연결 확인 화면 복원이 필요하면 `develop`의 4b9b427 시점 `screens/connectivity/**`·`api/connectivity.ts`를 체크아웃하고 `NavTabId`에 `connectivity`를 되돌린다.
