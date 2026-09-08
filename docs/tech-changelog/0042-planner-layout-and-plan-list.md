# 0042. 플래너 반응형 정리 · 불필요 문구 제거 · 계획 버전 이력 조회

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | Claude (에이전트) |
| 변경 유형 | fix / ui / feat |
| 영향 범위 | 화면(`screens/route`), API(`api/planner.ts`), 타입(`types/route.ts`) |
| 관련 브랜치 | fix/planner-layout |
| 관련 커밋 | (PR 생성 시 기입) |
| 관련 이슈·PR | #44 |

## 변경 사유 (Why)

환전 플래너 화면에 대해 다섯 가지 사용성 지적이 들어왔다.

1. **서비스명 어원 문구**가 화면에 남아 있었다. 제품 소개용 카피라 실제 조작에는 쓸모가 없고,
   랜딩에서 이미 제거된 문구가 플래너에만 남아 있어 표현이 갈렸다.
2. **안내 문구가 과했다.** 같은 mock 고지가 인트로·여정·상세에 세 번 반복되고,
   "3막", "Curve에서 필요한 경로만 갈라서 비교합니다" 같은 연출용 카피가
   실제 조작 설명을 밀어내고 있었다.
3. **반응형이 깨졌다.** 계획 Curve SVG가 좁은 폭에서 34% 크기까지 줄어 글자를 읽을 수 없었고,
   노드 상세 패널은 왼쪽 들여쓰기(`22%`) + `width: min(100%, 430px)` 조합 때문에
   컨테이너를 넘겨 `overflow: hidden` 에 잘렸다. 요약 바는 고정 최소 폭(`190px`/`180px`)에
   묶여 있어 태블릿 폭에서 겹쳤다.
4. **노란 선**이 화면 성격과 맞지 않았다. `--warn` 은 상태색인데, 대체 계획 곡선·시나리오 분기 선처럼
   경고가 아닌 요소에 쓰여 "문제가 생겼다"는 잘못된 신호를 주고 있었다.
5. **생성된 계획을 볼 방법이 없었다.** FE 는 `plans/active` 만 호출해서 과거 버전의 완료 회차 기록을
   되짚을 수 없었다. 백엔드에는 `GET /api/v1/goals/{id}/plans` (계획 버전 이력)가 이미 있다.

## 변경 내용 (What)

### 1) 어원 · 불필요 문구 제거

화면에서 지운 문구는 다음과 같다.

| 위치 | 지운/줄인 문구 | 판단 |
|---|---|---|
| `planner-journey.tsx` 툴바 | `DIVISA + CURVE · PLANNER` | 서비스명 어원. 정보 없음 |
| `planner-intro.tsx` 헤더 | `content.eyebrow` (fixture 값 `DIVISA + CURVE`) 렌더 제거 | 서비스명 어원 |
| `planner-journey.tsx` | `planner-journey__data-note` (mock 고지 3중 반복 중 1개) | 인트로·상세에 그대로 남아 고지 자체는 유지 |
| `planner-curve-stage.tsx` | "환율의 움직임을 나타내는 차트가 아니라, 날짜와 행동을 잇는 계획 경로입니다." → "환율 차트가 아니라 날짜와 행동을 잇는 계획 경로입니다." | 의미 유지, 길이만 축약 |
| `scenario-section.tsx` | eyebrow `3막 · 상황별 대체 경로` | 연출 용어 |
| `scenario-section.tsx` | "현재 Curve에서 필요한 경로만 갈라서 비교합니다." | 제목이 이미 설명 |
| `scenario-section.tsx` | 비교 안내 2문장 → "기존 계획은 흐리게 남아 있습니다." | 조작 지시는 버튼 라벨이 담당 |
| `scenario-section.tsx` | "다른 상황을 선택해 대체 Curve를 확인할 수 있습니다." | 옵션 버튼이 바로 위에 있음 |
| `scenario-section.tsx` | eyebrow `사용자 승인` | 확인 다이얼로그 제목이 이미 설명 |
| `planner-detail-drawer.tsx` | eyebrow `목 데이터로 구성된 세부 정보` | 바로 아래 mock 배지·고지와 중복 |
| `route-explanation-section.tsx` | eyebrow `선택과 연결된 AI 설명 예시` | 패널 하단 `aiNotice` 와 중복 |
| `route-status-view.tsx` | "잠시만 기다려 주세요." | 로딩 상태 자체가 의미 전달 |
| `route-status-view.tsx` | "데모 데이터를 켜거나, 실제 API 연동 후 다시 확인해 주세요." | 개발자 관점 문구 |

`PlannerIntroContent.eyebrow` 필드도 타입에서 뺐다 — 다시 렌더될 자리를 남기지 않기 위해서다.
금지어(예측·추천·보장)는 `screens/route/**`·`api/planner.ts`·`types/route.ts` 전부에서 0건을 확인했다.

### 2) 노란 선 제거 (`--warn` → 다른 구분 수단)

| 위치 | 이전 | 이후 | 정보 손실 |
|---|---|---|---|
| `.planner-curve__path--alternative` | `stroke: var(--warn)` | `stroke: var(--text)` + `stroke-width: 5` (기존 계획은 7) | **없음.** 기존 계획은 `--muted`(22% 투명도)로 흐려지고 대체 계획만 선명하게 남는 대비가 그대로다. 범례 스와치도 같이 바꿔 색이 계속 맞는다 |
| `.planner-curve__legend-line--alternative` | `background: var(--warn)` | `background: var(--text)`, `height: 2px` | 없음 (곡선과 동일한 표기) |
| `.scenario-switcher__branch` | `border-top/right: 2px solid var(--warn)` | 규칙과 DOM 요소를 함께 삭제 | **없음.** `aria-hidden="true"` 인 순수 장식이었고, `top: -3rem` 절대배치라 좁은 폭에서 위 콘텐츠와 겹치기까지 했다 |
| `.scenario-switcher__preview` | `border-left: 3px solid var(--warn)` | `border-left: 3px solid var(--border)` | 없음. 미리보기/현재 적용 구분은 패널 안 Badge(`tone`)가 담당한다 |
| `.planner-reason__tbd summary` | `color: var(--warn)` | `color: var(--text)` | 없음 (글자색) |

`route-screen.css` 에 남은 `--warn` 참조는 0건이다.

### 3) 반응형 레이아웃

- **계획 Curve SVG**: `min-height` + `transform: translateY(-36px)` 로 억지로 맞추던 것을
  `aspect-ratio: 1000 / 520` 로 바꾸고, `.planner-curve__canvas` 를 `overflow-x: auto` 컨테이너로 만들었다.
  SVG 는 `min-width: 640px` 를 가지므로 375px 화면에서도 62% 축척(라벨 20px → 약 12px)을 유지하며
  **컨테이너 안에서만** 가로 스크롤한다. body 가로 스크롤은 생기지 않는다.
- **노드 상세 패널**: `margin-left: clamp(1rem, 22%, 12rem)` + `width: min(100%, 430px)` 조합이
  컨테이너를 넘던 것을 `clamp(0rem, calc(100% - 430px), 12rem)` 으로 바꿔 남는 폭 안에서만 들여쓰게 했다.
- **목표 요약 바**: `minmax(190px, …)`/`minmax(180px, …)` 고정 최소 폭을 `minmax(0, …)` 로 바꾸고
  제목/숫자 칸에 `min-width: 0`, `overflow-wrap: anywhere`, 줄바꿈 허용을 넣었다.
- **툴바**: `grid-template-columns: 1fr auto 1fr` (가운데 칸이 어원 문구였다) → `flex` + `space-between`.
  모바일에서 문구를 숨기던 예외 규칙도 함께 제거했다.
- `.planner-journey` 의 `overflow: clip` → `overflow-x: clip`. 세로까지 자르면 sticky Action Dock 과
  그림자가 잘린다.
- `.route-section__heading-row` 줄바꿈 허용, `.planner-reason__profiles` 줄바꿈 허용,
  `.planner-goal-summary__details` 우측 칸 `minmax(0, …)`.
- 새로 추가한 계획 이력 목록은 `minmax(0, 1fr)` 그리드 + 560px 미디어쿼리로 처음부터 반응형이다.
- **죽은 CSS 정리(보이스카웃)**: 어느 컴포넌트도 쓰지 않던 `.route-screen`, `.route-screen__header*`,
  `.route-summary-grid`/`.route-plan-grid`/`.route-result-grid`, `.route-facts*`, `.route-callout*`,
  `.route-progress*`, `.route-scenario-list*`, `.route-definition-list*`, `.route-tbd*`,
  `.route-today-action*`, `.route-value--currency*`, `.route-demo-notice`, `.route-section__title`,
  `.route-section__description` 과 그에 딸린 미디어쿼리를 제거했다. `route-screen.css` 2,461줄 → 2,132줄.

### 4) 계획 버전 이력 조회

- `api/planner.ts` 에 `fetchPlanVersions(goalId)` (`GET /api/v1/goals/{id}/plans`) 와
  `fetchPlanDetail(planId)` (`GET /api/v1/plans/{id}`) 추가. 응답 타입 `PlanVersion` 은 백엔드
  `PlanVersionListResponse.Version` 과 같은 형태이며, `NON_NULL` 직렬화라 값이 없는 필드는 optional 로 뒀다.
  snake_case → camelCase 변환은 기존대로 `api/client.ts` 경계에서만 일어난다.
- `use-plan-versions.ts` (훅) + `plan-version-list.tsx` (표현) + `planner-plan-history.tsx` (container).
  목록과 상세는 서로 다른 요청이라 상태를 분리했고, 각각 **로딩 / 빈 / 에러**를 따로 렌더한다.
  로딩 표시는 공용 `Spinner`(0037)를 쓴다.
- 항목 선택 시 `GET /api/v1/plans/{id}` 로 상세를 불러와 안전 비율·분할 회차·회차 목록을 펼친다.
  목록 응답만으로는 과거 버전의 **완료 회차 기록**을 볼 수 없어 상세 호출을 쓰기로 했다 —
  이력을 보는 목적 자체가 그 기록이다.
- 진입점: 플래너 API 화면의 "현재 상태" 장면에 `계획 이력 보기` 버튼.

### 5) AI 자연어 설명 연결

- 계획 이력 장면에 `AiExplanation`(0038) + `useAiExplanation` 을 `surface: "planner_plan_summary"` 로 연결.
- `facts` 는 `planner-plan-facts.ts` 의 순수 함수가 만들고, 전부 서버가 준 값을 그대로 옮긴다
  (`plan_version`, `safe_ratio`, `split_count`, `currency_code`, `target_amount`, `held_amount`,
  `target_date`). 프론트에서 계산한 값은 하나도 없다(AGENTS.md §1).
  키 표기가 snake_case 인 이유는 `POST /api/v1/ai/explain` 이 `facts` 를 표기 변환 없이 보내기 때문이다.
- 활성 계획이 없는 목표에서는 `facts` 가 `null` 이라 훅이 요청하지 않고 컴포넌트는 아무것도 그리지 않는다.
- 이에 맞춰 presenter 의 `unsupportedAreas` 에서 "AI 설명 생성"을 뺐다.

## 영향 / 리스크

- 수치·계산 변경 없음. 표시 문구와 레이아웃, 그리고 조회 엔드포인트 추가뿐이다.
- `PlannerIntroContent.eyebrow` 를 타입에서 제거했다. fixture(`api/fixtures/route-plan.ts`)에는
  `eyebrow` 키가 남아 있지만 `as RoutePlanData` 캐스팅 경로라 타입 에러가 나지 않고, 화면에도 쓰이지 않는다.
  fixture 정리는 해당 파일 소유 범위에서 별도로 처리한다.
- `PlannerJourneyStatus` 에 필수 prop `onHistory` 가 추가됐다. 호출부는 `PlannerApiScreen` 하나뿐이다.
- 계획 이력은 **API 모드 화면**에만 붙는다. 데모(fixture) 플래너에는 서버 goal id 가 없어 붙이지 않았다.
- 곡선 SVG 가 좁은 폭에서 가로 스크롤되므로, 터치 기기에서 스크롤 방향이 갈릴 수 있다.
  `overscroll-behavior-x: contain` 으로 부모까지 번지지 않게 막아 뒀다.

## 검증

- [x] `npm run lint` — 0 errors (기존 react-refresh 경고 15건은 이 변경과 무관하게 유지)
- [x] `npm run build` — 통과
- [x] `npx vitest run --coverage` — 100 파일 / 748 테스트 통과, 라인·브랜치·함수·구문 100%
- [x] `grep -rn "Diversify\|어원" src/screens/route/` 0건
- [x] `grep -rn "예측\|추천\|보장" src/screens/route/ src/api/planner.ts src/types/route.ts` 0건
- [x] `route-screen.css` 내 `--warn` 참조 0건
- [ ] 폭별(375 / 768 / 데스크톱) 육안 확인 — 이 세션에서는 dev 서버를 띄울 수 없어
      CSS 정적 검토와 테스트로 대신했다. 통합 후 메인 세션에서 스크린샷으로 확인한다.

## 롤백 방법

- 이 변경의 커밋을 `git revert` 한다. 백엔드 계약 변경이나 저장 데이터 변경이 없어
  프론트 되돌리기만으로 완전히 복구된다.
