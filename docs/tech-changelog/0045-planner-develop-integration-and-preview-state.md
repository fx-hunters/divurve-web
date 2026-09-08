# 0045. 최신 develop 통합과 Planner preview 상태 분리

| 항목 | 내용 |
| --- | --- |
| 날짜 | 2026-09-08 |
| 작성자 | Codex |
| 변경 유형 | fix / refactor / test |
| 영향 범위 | Planner API 상태 / Journey 화면 / X-Ray / Sidebar / 테스트 |
| 관련 브랜치 | `feat/planner-api-demo-ui-sync` |
| 관련 커밋 | `1b10e58`, `67601c3` |
| 관련 이슈·PR | 미지정 |

## 변경 사유 (Why)

기능 브랜치가 최신 `origin/develop`보다 23개 커밋 뒤에 있어 Plan 버전 이력,
공용 Spinner, AI 설명, 새 Sidebar·Header 구조와 Planner 공통 Journey를 함께
유지할 통합이 필요했다. 병합 뒤에는 활성 Plan이 없는 목표에서 만든 일시적인
preview가 뒤로 이동해도 남아, 사용자가 계획 생성을 확인하지 않았는데 다시
`계획 Curve 보기`를 누르면 Curve로 바로 이동하는 결함도 확인됐다.

이 결함은 저장된 활성 Plan과 저장 전 preview를 모두 `plan !== null`로 판단한 것이
원인이었다. 사용자 확인 전에는 create/apply 요청이 실행되지 않고, 계획 생성 뒤
서버에서 활성 Plan을 다시 확인한 경우에만 Curve를 보여주도록 상태 경계를 분리했다.

## 변경 내용 (What)

- 최신 `origin/develop`을 일반 merge하고 충돌 9개를 파일별로 통합했다.
- `PlannerPlanSummaryViewModel.planSource`를 `active | preview`로 구분했다.
- `continueFromStatus()`는 `active` Plan만 Curve로 직접 이동시키고, `preview`는
  생성 확인 장면으로 보낸다.
- 생성 확인에서 뒤로 이동하면 transient preview와 관련 피드백을 폐기한다.
- plan create 뒤 `GET` 기반 Planner 개요를 다시 조회해 활성 Plan을 확인한 후에만
  성공 상태와 Curve 전환을 허용한다.
- draft ID가 없는 scenario 비교는 apply 요청을 보내지 않는다.
- develop의 Plan 버전 이력을 공통 Journey의 현재 상태 장면에서 열 수 있게 유지했다.
- X-Ray의 AI 설명과 데이터 출처 배지, Sidebar의 새 메뉴·알림 구조를 함께 보존했다.
- 공통 Journey로 대체되고 production 참조가 없는 레거시 Route 파일 19개를 제거했다.
- API 화면과 데모 화면은 같은 `PlannerJourneyScreen` 표현 트리를 사용하며, 데모
  action은 서버 API를 호출하지 않는 기존 경계를 유지한다.

## 영향 / 리스크

- 금융 수치와 계산 규칙은 변경하지 않았다. `planSource`는 UI 저장 상태만 나타낸다.
- create 요청 자체가 성공했더라도 뒤이은 활성 Plan 재조회에서 Plan을 확인하지 못하면
  Curve로 이동하지 않고 재확인 안내를 표시한다.
- 레거시 파일의 CSS 선택자는 후속 스타일 정리 대상으로 일부 남을 수 있으나,
  production TypeScript import는 모두 새 Journey 트리를 사용한다.
- Planner AI 설명은 이번 통합에서 새로 연결하지 않았다. 공통 AI 설명과 Home,
  Forecast, X-Ray 연결은 develop 구현을 유지하며 Planner 연결은 후속 범위다.
- 브라우저 viewport별 육안 검수는 로컬 커밋 이후 별도로 수행해야 한다.

## 검증

- [x] Planner API 화면 targeted test — 13개 통과
- [x] Journey flow targeted test — 7개 통과
- [x] Journey 표현 컴포넌트 targeted test — 6개 통과
- [x] Route / X-Ray / Sidebar targeted test — 22개 통과
- [x] `npx tsc --noEmit` — 오류 0개
- [x] `npm run lint` — 오류 0개, 기존 Fast Refresh 경고 17개
- [x] `npm test -- --run` — 108개 파일, 871개 테스트 통과
- [x] `npm run test -- --coverage` — 108개 파일, 871개 테스트 통과,
  statements/branches/functions/lines 100%
- [x] `npm run build` — 770개 모듈, production build 성공
- [x] `git diff --check` — whitespace 오류 0개

첫 coverage 실행은 새 apply 방어 분기 두 줄이 검증되지 않아 statements/lines
99.98%, branches 99.96%로 실패했다. draft ID가 없는 scenario 응답에서 apply를
호출하지 않는 테스트를 추가한 뒤 네 지표 모두 100%로 복구했다. 전체 테스트 중
마이페이지 비동기 갱신에서 React `act(...)` 경고 1건, lint의 Fast Refresh 경고
17건, build의 500kB 초과 chunk 경고가 남지만 이번 Planner 변경의 실패는 아니다.

## 롤백 방법

- `67601c3`을 revert하면 preview 상태 분리, 회귀 테스트와 레거시 경계 정리를
  한 단위로 되돌릴 수 있다.
- `1b10e58`은 develop 통합 merge이므로 되돌릴 때는 merge parent를 명시해 revert한다.
- API 생성 파일과 백엔드 저장소는 수정하지 않았으므로 별도 롤백이 필요 없다.
