# 0044. 내 자산(X-ray) 화면에 AI 자연어 설명 연결

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | Claude (AI Agent) |
| 변경 유형 | feat |
| 영향 범위 | 화면(내 자산 통화 노출·통화 적합도), API 호출(`POST /api/v1/ai/explain`) |
| 관련 브랜치 | feat/xray-ai-explanation |
| 관련 커밋 | (작업 중) |
| 관련 이슈·PR | #46 |

## 변경 사유 (Why)

공통 요구사항 6번 "사용자 맞춤 AI 자연어 설명"의 내 자산 화면 연결분이다.
내 자산 화면은 통화별 노출 비중·집중도 판정처럼 숫자와 판정 라벨만 놓여 있어,
"이 수치가 내 상황에서 무슨 뜻인가"를 사용자가 스스로 이어 붙여야 했다.
공용 훅(`useAiExplanation`)과 표현 컴포넌트(`AiExplanation`)가 각각 이슈 I3·I2로
먼저 머지되어 있으므로, 이 변경은 두 탭에 그 자산을 붙이고 각 탭에 맞는 근거
수치(facts)를 골라 넘기는 일만 한다.

지면을 `xray_exposure`·`xray_fitness`로 나눈 이유는 같은 화면이라도 사용자가
보고 있는 결과가 다르기 때문이다. 서버가 지면별로 문장 성격을 다르게 잡을 수
있어야 한다.

## 변경 내용 (What)

- `screens/xray/xray-ai-explanation.tsx` 신규 — 공용 훅과 표현 컴포넌트를 잇는
  컨테이너. 로딩 표시는 공용 스피너(`<Spinner size={20} />`)를 주입한다.
  지면 리터럴 `xray_exposure` · `xray_fitness`를 이 파일에서 상수로 고정한다.
- `screens/xray/xray-presenter.ts`에 `toExposureExplanationFacts()` ·
  `toFitnessExplanationFacts()` 추가. 화면이 이미 표시 중인 엔진 값을 골라 담기만
  하고 새로 계산하지 않는다(AGENTS.md §1). 값이 없는 키는 빼고 보낸다.
- `xray-exposure-view.tsx` — 두 컬럼 아래(`grid-column: 1 / -1`)에 설명 영역을
  놓는다. facts: 총자산·외화/원화 자산·외화 비중·통화별 노출(코드·원화·비중)·
  1% 민감도·총수익률·집중도 판정과 기준선.
- `xray-fitness-view.tsx` — 비중 조정 시뮬레이터 아래에 설명 영역을 놓는다.
  facts: 주력 통화·집중도 비중·판정·기준선·격차(pp)·위험성향 상태와 등급.
- 두 뷰와 `xray-screen.tsx`에 `explanationRequester` 선택 prop을 추가해 요청
  경로를 주입할 수 있게 했다(테스트 격리용, 기본값은 공용 훅의 기본 경로).

## 영향 / 리스크

- 계산 결과는 바뀌지 않는다. facts는 기존 `XRayDashboardData`의 값을 그대로
  옮겨 담을 뿐이고, 프론트에서 파생 수치를 새로 만들지 않는다.
- 근거 수치가 비면(노출 목록이 비었거나 집중도가 없을 때) 훅이 요청하지 않고
  `idle`로 남아 설명 영역 자체를 그리지 않는다. 서버가 빈 facts에 400을 주므로
  의도된 동작이다. 자산 미등록 계정에서 불필요한 400이 발생하지 않는다.
- 탭을 오갈 때마다 해당 지면의 요청이 새로 나간다(뷰가 언마운트되므로).
  호출량이 문제가 되면 상위에서 캐시하는 방향을 따로 검토한다.
- **비율은 0~1 스케일로 보낸다.** 백엔드 `AiResponseValidator.parseToken()`은
  서술 속 `%`로 끝나는 토큰을 100으로 나눠 facts와 대조한다("63%" → `0.63`).
  따라서 화면 표시용 0~100 값을 그대로 실으면 `63 ≠ 0.63`으로 어긋나 매번
  `numericMatch: false` → `fallback: true`가 된다. 프리젠터의 `toRatio()`가
  표시용 퍼센트를 API 원본과 같은 비율 단위로 되돌려 담는다.
  키 이름도 단위가 드러나도록 `fxRatioPct`→`fx_ratio`, `sharePct`→`share`,
  `totalReturnPct`→`total_return`, `concentrationSharePct`→`concentration_share`,
  `concentrationThresholdPct`→`concentration_threshold`, `gapPp`→`gap`으로 바꿨다.
- facts 키 표기는 **snake_case** 로 통일했다. `requestExplanation` 이 `isRawBody`
  로 보내 표기 변환을 거치지 않으므로 키가 백엔드 계약 그대로 서버에 닿는다.
  홈(`home_market_summary`)·환율 전망(`forecast_summary`) 화면의 facts 와 같은 규칙이다.
- 이 단위 규칙은 AI 설명을 붙이는 **모든 화면에 공통**이다. 홈·환율 전망 등
  후속 연결 시에도 비율은 0~1로 실어야 한다.

## 검증

- [x] 테스트 통과 + 커버리지 100% (`npx vitest run --coverage` — 97 파일 / 740 테스트)
- [x] `npm run lint` 오류 0 (기존 react-refresh 경고만 유지)
- [x] `npm run build` 성공
- [x] loading / error(+재시도) / success / fallback / 빈 facts 분기 테스트 추가
- [ ] (수치 변경 없음)

## 롤백 방법

`xray-ai-explanation.tsx`를 지우고 두 뷰의 `<XRayAiExplanation>` 블록과
`explanationRequester` prop, 프리젠터의 facts 빌더 두 개를 되돌린다.
공용 훅·컴포넌트는 이 변경에서 손대지 않았으므로 다른 화면에는 영향이 없다.
