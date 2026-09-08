# 0056. 대시보드 홈과 랜딩의 경로 충돌 해소 및 앱 라우팅 단일화

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | AI Agent (Claude) |
| 변경 유형 | fix / refactor |
| 영향 범위 | 화면(전 화면 URL), 상태(라우팅) |
| 관련 브랜치 | fix/app-routing |
| 관련 커밋 | (커밋 후 기입) |
| 관련 이슈·PR | #74 |

## 변경 사유 (Why)

로그인한 사용자가 대시보드에서 새로고침하면 랜딩 페이지로 튕겼다.

원인은 같은 URL을 두 화면이 쓰고 있었다는 것이다.

| 화면 | 경로 | 판정 위치 |
|---|---|---|
| 랜딩 | `/` | `app.tsx` — `useState(() => window.location.pathname === "/")` |
| 대시보드 홈 | `/` | `use-tab-navigation.ts` — `NAV_PATHS.home` |

로그인 직후 `navigate("home")`이 주소를 `/`로 만들고, 그 상태에서 새로고침하면 `showLanding`
초기값이 다시 `true`가 된다. `/route`·`/xray`처럼 고유 경로가 있는 탭은 멀쩡한데 홈만 깨진
이유가 이것이다.

문제는 단발 버그가 아니라 **경로 해석이 흩어져 있어 충돌을 아무도 못 본 것**이다. 변경 전
경로 판정은 네 곳에 나뉘어 있었다.

| 파일 | 담당 |
|---|---|
| `hooks/use-tab-navigation.ts` | 탭 5개의 경로 ↔ 탭 매핑 |
| `app/post-auth-routing.ts` | 인증 직후 목적지 + `/initial-setup` 상수 |
| `app/diagnosis-routing.ts` | 진단 3경로 + 결과 경로 |
| `app/app.tsx` | 랜딩·로그인 표시 여부를 boolean 4개(`showLanding`, `showAuth`, `showInitialSetup`, `showDiagnosisResult`)로 따로 관리 |

어느 파일도 전체 경로 목록을 알지 못하므로 `/`가 두 번 쓰였다는 사실이 코드상 드러나지 않았다.
같은 구조 때문에 파생 문제도 함께 있었다.

- **로그인/회원가입 화면에 경로가 없다.** `showAuth` state로만 존재해 새로고침하면 사라지고
  링크 공유·뒤로가기가 불가능했다.
- **랜딩에서 대시보드로 들어가도 주소가 그대로 `/`**였다(`handleEnterDashboard`가 state만 변경).
  즉 대시보드에 있는데 주소는 랜딩이라, 새로고침하면 다시 튕기는 상태가 계속 유지됐다.
- **뒤로가기로 `/`에 와도 대시보드가 남았다.** `popstate` 핸들러가 진단 경로만 처리했다.
- **URL과 화면이 어긋난 채 남았다.** 데모·비로그인 세션이 `/diagnosis/quick`으로 들어오면
  화면만 대시보드로 바뀌고 주소는 `/diagnosis/quick`에 머물러, 새로고침할 때마다 같은 되돌림이
  반복됐다.
- **자기 자신을 깨우는 우회 코드.** `handleInitialSetupComplete`가 `replaceState` 후
  `window.dispatchEvent(new PopStateEvent("popstate"))`로 자기 popstate 핸들러를 강제 실행했다.
  라우팅 상태가 한곳에 없어서 생긴 패턴이다.

## 변경 내용 (What)

- **`src/app/app-routing.ts` 신규** — 사용자 앱 경로의 단일 해석기. `APP_PATHS`(전 화면 경로 상수),
  `AppRoute` 판별 유니온, `resolveAppRoute(pathname, isMemberSession)`,
  `toPathname(route)`, `resolvePostAuthRoute(result)`를 모았다. 전체 경로 목록이 한 파일에 있어야
  이번 같은 충돌이 눈에 보인다.
- **`src/app/use-app-route.ts` 신규** — 주소창과 화면을 한 쌍으로 묶는 훅. `route` 상태,
  `navigate`(pushState), `replace`(replaceState), `popstate` 구독을 담당한다. 새로고침·뒤로가기·
  링크 진입이 모두 같은 해석기를 지난다.
- **대시보드 홈 경로를 `/dashboard`로 분리.** `/`는 랜딩 전용이 됐다.
- **로그인 `/login`, 회원가입 `/signup` 부여.** `AuthPage`에 `onModeChange` 콜백을 추가해
  화면 안에서 모드를 바꿔도 주소가 따라가게 했다.
- **`app.tsx`를 라우트 하나에서 파생하도록 변경.** boolean 4개 + `activeTab` + `initialSetupEntryMode`
  6개 state가 `route` 하나로 줄었다. 화면 위에만 뜨는 `showTour`·`showDetailedInvite`는 UI state로 남긴다.
- **주소 정규화.** 해석 결과의 정식 경로와 주소창이 다르면 `replaceState`로 맞춘다.
  `/route/` → `/route`, 모르는 경로 `/typo` → `/dashboard`, 권한이 없어 되돌린
  `/diagnosis/quick` → `/dashboard`. URL과 화면이 어긋난 채 남지 않는다.
- **우회 코드 제거.** `PopStateEvent` 수동 디스패치를 `replace(route)` 호출로 대체했다.
- **삭제**: `hooks/use-tab-navigation.ts`, `app/post-auth-routing.ts`, `app/diagnosis-routing.ts`
  (+ 각 테스트). 기능은 전부 위 두 파일로 옮겼다.

### 레이어 배치

새 훅을 `src/hooks/`가 아니라 `src/app/`에 둔 이유는 AGENTS.md §7.1 단방향 의존성이다.
의존 방향이 `app` → `screens` → `components` → `hooks` → `api`이므로 `hooks/`에 있는 훅이
`app/app-routing.ts`를 import하면 하위가 상위를 참조하게 된다. 라우팅은 앱 셸의 관심사이고
`app.tsx`만 쓰므로 `app/` 아래가 맞는 자리다.

### `/`를 로그인 여부로 분기하지 않은 이유

"경로는 `/` 그대로 두고, 세션이 있으면 대시보드를 띄운다"는 선택지도 있었다. 택하지 않았다.
같은 URL이 사람에 따라 다른 화면이 되면 공유·북마크가 무엇을 가리키는지 알 수 없고,
이번 버그의 원인인 "URL 하나에 화면 둘"이 그대로 남는다.

## 영향 / 리스크

- **주소가 바뀐다.** 대시보드 홈의 북마크·외부 링크가 `/`였다면 이제 랜딩이 뜬다.
  배포 후 홍보물·문서에 `/`를 대시보드로 안내한 곳이 있으면 `/dashboard`로 갱신해야 한다.
- **SPA 폴백 필요.** `/dashboard`·`/login`은 서버 라우트가 아니다. Vite dev 서버는 자체
  history fallback으로 처리하지만, 정적 호스팅에 배포할 때는 모든 경로를 `index.html`로
  보내는 설정이 필요하다. `/route`·`/xray`가 이미 같은 조건이라 새로 생긴 종류의 요구는 아니다.
- **`/admin` 영향 없음.** `root.tsx`가 사용자 앱보다 먼저 갈라내므로 관리자 라우팅은 그대로다.
- 진단 흐름 경로(`/initial-setup`, `/diagnosis/*`, `/mypage/diagnosis`)와 탭 경로
  (`/route`, `/xray`, `/forecast`, `/mypage`)는 값이 바뀌지 않았다.
- 수치 변경 없음.

## 검증

- [x] `npm run lint` — 0 errors (남은 13건은 이번 변경과 무관한 기존 `react-refresh` warning)
- [x] `npx tsc --noEmit` / `npm run build` — 통과
- [x] `npm run test -- --coverage` — 114개 파일 / 906개 테스트 전부 통과,
      라인·브랜치·함수·구문 커버리지 100% 유지
- [x] `src/app/app-routing.test.ts` 신규 — 경로 해석·역변환·인증 후 목적지, 랜딩과 대시보드 홈이
      서로 다른 경로를 쓴다는 회귀 단언 포함
- [x] `src/app/use-app-route.test.ts` 신규 — push/replace 구분, popstate 랜딩 복귀,
      비회원의 진단 경로 되돌림 시 주소까지 맞추는지, 별칭 경로 정규화
- [x] `src/app/app.test.tsx` 추가 — `/dashboard` 새로고침 시 랜딩으로 튕기지 않음(이번 버그의
      회귀 테스트), 모르는 경로 정규화, 회원가입 진입과 모드 전환의 주소 동기화, 뒤로가기 랜딩 복귀
- [x] 개발 서버 수동 확인 — `/dashboard` 직접 진입 시 랜딩 미표시, `/typo-path` → 주소가
      `/dashboard`로 정리, `/login` 로그인 폼 렌더, `/` 랜딩 렌더

## 롤백 방법

`fix/app-routing`의 머지 커밋을 revert한다. 부분 롤백이 필요하면 `app-routing.ts`·
`use-app-route.ts`를 지우고 `use-tab-navigation.ts`·`post-auth-routing.ts`·`diagnosis-routing.ts`를
복원한 뒤 `app.tsx`를 boolean state 방식으로 되돌린다. 다만 그 경우 `/` 충돌이 함께 되살아난다.
