# Divurve Planner Journey API 통합 검수 가이드

## 1. 작업 기준

| 항목 | 값 |
| --- | --- |
| 작업 브랜치 | `feat/planner-journey-api` |
| 기준 develop SHA | `8fb11994bae16858871b9b5913eff49f3815ae4d` |
| 관련 이슈 | 미지정 |
| 작업 범위 | 실제 Planner API 경계, 공통 표시 모델, 단계형 Curve UI, 테스트, 문서 |

이 문서는 다른 검수자가 변경 의도와 화면 검수 순서를 저장소의 다른 문서 없이도
확인할 수 있도록 실제 구현과 자동 검증 결과를 정리한다.

## 2. 변경 전후 구조

### 변경 전

- 회원용 API 화면이 `PlannerApiOverview` 원시 응답을 직접 순회했다.
- 다음 회차 탐색, 비율·금액 포맷팅과 화면 표현이 한 컴포넌트에 섞여 있었다.
- 목표, 계획 요약, 회차 목록, 실행 입력이 카드 형태로 동시에 노출됐다.
- API 화면에 inline style이 다수 있었고 데모 Curve와 다른 시각 구조를 사용했다.

### 변경 후

```text
src/api/planner.ts
  → use-planner-api.ts
  → planner-api-presenter.ts
  → planner-api-screen.tsx
  → planner-journey-{goal-select,status,curve,action,detail}.tsx
```

- API 요청, 서버 상태, 표시용 파생, 화면 상태와 표현 책임을 분리했다.
- 순수 `presentPlannerOverview()`가 공통 `PlannerViewModel`을 만든다.
- 화면은 목표 선택 → 현재 상태 → 계획 Curve → 다음 행동 → 계획 상세를 한 장면씩 표시한다.
- API UI CSS는 `planner-api-*` namespace를 사용해 기존 데모 Curve CSS와 충돌하지 않는다.
- 기존 앱의 `RouteScreen mode="demo" | "api"` 분기와 데모 화면은 유지했다.

## 3. 전체 사용자 흐름

1. 회원 세션으로 플래너 탭 또는 `/route`에 진입한다.
2. 서버가 반환한 목표 중 하나를 선택한다. 목표 생성 버튼은 제공하지 않는다.
3. 목표 금액, 현재 확보 금액, 목표일과 표시용 확보 진행률을 확인한다.
4. 활성 계획이 있으면 회차 순서로 만든 Curve를 확인한다.
5. 완료, 다음, 예정, 건너뜀과 목표 도착 노드를 형태와 한국어 문구로 구분한다.
6. 노드를 클릭하거나 Enter·Space로 선택해 해당 회차만 확인한다.
7. 다음 회차의 실행 외화 금액과 실행 환율을 입력해 완료 기록하거나 건너뛴다.
8. 서버 처리 중에는 두 mutation 버튼이 비활성화된다.
9. 성공하면 목표와 활성 계획을 다시 조회하고, 실패하면 메시지와 상태 재확인 동작을 표시한다.
10. 계획 상세에서 서버 reason, safeRatio, splitCount와 전체 회차를 확인한다.

활성 계획이 없으면 목표의 현재 상태까지 확인한 뒤 별도 장면에서 “이 목표에는
활성 계획이 없습니다”를 표시한다. 계획 생성 기능은 제공하지 않는다.

## 4. API 입력·출력 대응표

| 메서드·경로 | 입력 | 화면에서 사용하는 출력 | 오류 처리 |
| --- | --- | --- | --- |
| `GET /api/v1/goals` | 없음 | ID, 이름, 통화, 목표 금액, 확보 금액, 목표일 | 목록이 비면 목표 empty 상태 |
| `GET /api/v1/goals/{goalId}/plans/active` | URL 인코딩한 목표 ID | 계획 ID·버전·활성 여부·reason·safeRatio·splitCount·steps | `404`만 계획 없음, 다른 오류는 화면 error |
| `POST /api/v1/plans/{planId}/steps/{sequence}/complete` | `executedAmount`, `executedRate` | 성공 회차와 저장 결과 메시지 | 서버 메시지를 보존하고 재조회 동작 제공 |
| `POST /api/v1/plans/{planId}/steps/{sequence}/skip` | 계획 ID, 회차 번호 | 건너뛰기 저장 결과 메시지 | 서버 메시지를 보존하고 재조회 동작 제공 |

`src/api/planner.ts`의 기존 endpoint 구현은 최신 계약과 일치해 생산 코드는 변경하지
않고 전용 테스트를 추가했다. `src/api/client.ts`의 snake_case 변환, 인증 헤더,
응답 언래핑과 401 refresh 후 1회 재요청도 변경하지 않았다.

## 5. 프론트 표시용 파생값

| 파생값 | 규칙 | fallback |
| --- | --- | --- |
| 확보 진행률 | `heldAmount / targetAmount`, 0~100 clamp | 분모 0 이하 또는 비유한수는 0 |
| 다음 회차 | 활성 계획에서 `completed`, `skipped`가 아닌 첫 회차 | 없으면 다음 행동 없음 |
| 금액·비율 | `Intl.NumberFormat("ko-KR")`로 표시 | 목표일 누락은 `미설정` |
| 회차 상태 | 서버 상태를 완료·다음 회차·예정·건너뜀으로 매핑 | 미완료 상태는 순서에 따라 다음 또는 예정 |
| Curve 좌표 | 회차 순서와 상태만으로 SVG 배치 | 금액·환율은 좌표에 사용하지 않음 |

## 6. 서버에 없어 구현하지 않은 기능

- 목표 생성·수정
- 계획 생성·재계산
- API 기반 대체 시나리오와 분기 계획
- 미래 환율, 환전 시점, 달성 확률 생성
- 투자 권고 또는 최적 행동 판정
- 서버 reason 외 AI 설명 생성

API 모드에 데모 시나리오나 fixture 값을 보충하지 않았다.

## 7. 변경 파일과 역할

| 파일 | 역할 |
| --- | --- |
| `src/api/planner.test.ts` | 지원 endpoint, URL 인코딩, active plan 404와 오류 전파 검증 |
| `src/screens/route/planner-api-types.ts` | 공통 Planner ViewModel, 노드·입력 검증 타입 |
| `src/screens/route/planner-api-presenter.ts` | API 응답을 표시 모델과 시각 Curve로 변환하는 순수 presenter |
| `src/screens/route/planner-api-presenter.test.ts` | 목표 수, 진행률 경계, 상태, 좌표, 입력 검증 단위 테스트 |
| `src/screens/route/use-planner-api.ts` | 조회·mutation 상태, 입력 검증, 중복 방지, 성공 후 reload |
| `src/screens/route/use-planner-api.test.ts` | loading/error/empty/success와 완료·건너뛰기 회귀 테스트 |
| `src/screens/route/planner-api-screen.tsx` | API Journey 데이터·장면 상태 컨테이너 |
| `src/screens/route/planner-api-screen.css` | Curve 중심 반응형 UI, focus, animation, reduced-motion |
| `src/screens/route/planner-api-screen.test.tsx` | 단계 전환, action, 상세, 복구, 360px·reduced-motion 테스트 |
| `src/screens/route/planner-journey-goal-select.tsx` | 서버 목표 선택 장면 |
| `src/screens/route/planner-journey-status.tsx` | 목표 현재 상태 장면 |
| `src/screens/route/planner-journey-curve.tsx` | SVG Curve와 회차 노드 장면 |
| `src/screens/route/planner-journey-curve.test.tsx` | Curve fallback·키보드·버튼 단위 테스트 |
| `src/screens/route/planner-journey-action.tsx` | 완료 입력과 건너뛰기 장면 |
| `src/screens/route/planner-journey-detail.tsx` | PC drawer·모바일 sheet 형태의 계획 상세 |
| `src/screens/route/route-screen.test.tsx` | demo/api 분기와 데이터 비혼합 회귀 테스트 |
| `docs/tech-changelog/0032-planner-journey-api-integration.md` | 변경 사유, API 경계, 파생 규칙, 검증과 롤백 기록 |
| `docs/tech-changelog/README.md` | 기술 변경 로그 0032 인덱스 등록 |
| `DIVURVE_PLANNER_JOURNEY_IMPLEMENTATION_REVIEW_GUIDE.md` | 외부 전달용 구현·검수 안내 |

`src/api/generated/**`, package 파일, 앱 라우팅, 데모 fixture와 기존 데모 Route
표현 컴포넌트는 수정하지 않았다.

## 8. 테스트 목록

- 목표 0개·1개·여러 개와 목표 전환
- active plan 404, 활성 계획 없음·있음·비활성·남은 회차 없음
- 완료·다음·예정·건너뜀·목표 도착 노드
- 진행률 0, 음수, 100 초과, 분모 0, 비유한수
- 다음 미완료 회차 선택과 알 수 없는 목표 ID fallback
- 실행 금액·실행 환율의 양의 유한수 검증
- 완료·건너뛰기 성공과 실패, 성공 후 reload
- 처리 중 완료·건너뛰기 중복 제출 방지
- API 404와 비404 오류 구분
- 기존 client의 401 refresh 후 1회 재요청
- 노드 클릭·Enter·Space, Escape 상세 닫기, 포커스 복원
- reduced-motion 환경과 360px viewport의 핵심 흐름
- API 모드에서 서버 목표만 표시되고 데모 Intro가 섞이지 않는지
- 기존 데모 Route의 Intro, Curve, 시나리오, 승인, 기록 회귀

## 9. 실제 자동 검증 결과

| 명령 | 실제 결과 |
| --- | --- |
| Planner 영향 범위 | 11개 테스트 파일, 98개 테스트 통과 |
| `npx tsc --noEmit` | 통과, TypeScript 오류 0개 |
| `npm run lint` | 통과, 오류 0개·기존 Fast Refresh 경고 11개 |
| `npm run test` | 74개 파일, 564개 테스트 통과 |
| `npm run test -- --coverage` | 74개 파일, 564개 테스트, 네 지표 100% |
| `npm run build` | 성공, 740개 모듈 변환 |
| `git diff --check` | 통과, Windows LF→CRLF 안내만 출력 |
| 신규 Planner 금지 패턴 검색 | 리터럴 색상·inline style·명시적 `any` 0건 |

빌드에는 기존의 500kB 초과 JavaScript 청크 경고가 남아 있다. npm은 환경 설정의
`min-release-age`가 향후 major 버전에서 지원되지 않는다는 경고를 출력하지만 이번
명령들의 성공 여부에는 영향을 주지 않았다.

첫 전체 coverage 실행에서는 73개 파일·553개 테스트가 모두 성공했지만 branches
99.37%, functions 98.82%로 100% 게이트를 통과하지 못했다. 새 Planner의 미실행
분기를 확인해 테스트를 추가했고, production 파일을 coverage에서 제외하거나 테스트를
skip하지 않은 채 최종 74개 파일·564개 테스트와 네 지표 100%로 재검증했다.

## 10. 데스크톱 1440px 검수 절차

1. 테스트 백엔드의 URL을 기존 `VITE_API_URL` 방식으로 설정한다.
2. `npm run dev`를 실행하고 회원 계정으로 로그인한다.
3. 플래너 탭을 열어 “내 외화 플래너”와 서버 연결 배지를 확인한다.
4. 목표가 여러 개면 각 목표를 선택하고 한 장면에 한 단계만 보이는지 확인한다.
5. 현재 상태에서 목표·확보 금액·목표일·진행률이 서버 응답과 같은지 확인한다.
6. Curve가 화면 중심에 충분한 크기로 보이고 카드들이 경로를 가리지 않는지 확인한다.
7. 각 노드를 선택해 한 회차의 날짜·금액·상태만 강조되는지 확인한다.
8. 다음 행동으로 이동해 주 CTA가 완료 기록 하나로 강조되는지 확인한다.
9. 계획 상세를 열어 reason, 안전 비율, 분할 회차와 전체 회차를 확인한다.
10. Escape와 닫기 버튼으로 drawer를 닫고 원래 버튼으로 포커스가 돌아오는지 확인한다.

## 11. 모바일 390px·360px 검수 절차

1. 브라우저 responsive mode를 각각 390px, 360px로 설정한다.
2. 목표 선택 버튼과 모든 주요 CTA의 높이가 44px 이상인지 확인한다.
3. 현재 상태 값이 한 열로 읽히고 가로 스크롤이 생기지 않는지 확인한다.
4. Curve, 노드 라벨과 선택 회차 문구가 잘리거나 겹치지 않는지 확인한다.
5. 완료 입력과 건너뛰기 버튼이 모바일 내비게이션을 가리지 않는지 확인한다.
6. 계획 상세가 하단 sheet로 열리고 360px에서도 닫기 버튼을 누를 수 있는지 확인한다.
7. OS의 동작 줄이기를 켠 뒤 Curve와 노드가 지연 없이 보이고 기능이 유지되는지 확인한다.

## 12. 실제 API 검수 절차

1. Network 탭에서 `GET /api/v1/goals` 이후 목표별 active plan 요청을 확인한다.
2. active plan이 `404`인 목표는 전체 오류가 아니라 계획 없음 장면인지 확인한다.
3. 검수용 데이터에서만 양의 실행 금액·환율을 입력해 complete 요청 body를 확인한다.
4. 처리 중 두 mutation 버튼을 연속 클릭해 요청이 한 번만 전송되는지 확인한다.
5. 성공 후 goals와 active plan이 다시 조회돼 최신 회차가 표시되는지 확인한다.
6. 건너뛰기도 검수용 회차에서 한 번만 요청되고 성공 후 재조회되는지 확인한다.
7. 만료된 액세스 토큰에서는 기존 refresh 요청 뒤 원 요청이 한 번 재시도되는지 확인한다.
8. 서버 오류에서는 서버 메시지와 “현재 상태 다시 확인”이 표시되는지 확인한다.

complete와 skip은 서버 상태를 변경하므로 실제 운영 데이터 대신 팀의 검수용 계정과
목표를 사용해야 한다.

## 13. mock과 API 구분

| 모드 | 데이터 출처 | 제공 기능 |
| --- | --- | --- |
| 데모 계정 | 기존 recurring/deadline fixture | Curve Dive, 다섯 대체 시나리오, 데모 승인·기록 |
| 회원 계정 | Swagger 계약의 실제 응답 | 서버 목표·활성 계획, 완료·건너뛰기 mutation |

API 생산 코드에서 데모 fixture를 import하지 않는다. 데모 시나리오, 달성 확률,
예시 설명을 회원 데이터에 합성하지 않는다.

## 14. 알려진 제한사항

- 실제 백엔드가 실행 중인 브라우저 육안 검수는 자동 검증에 포함되지 않았다.
- 목표와 계획 생성·수정 endpoint가 없어 해당 동작을 제공하지 않는다.
- API에는 대체 시나리오 계약이 없어 회원 화면에는 시나리오 Curve가 없다.
- 회차 status가 문자열 계약이므로 백엔드 enum이 확정되면 명시적 매핑 동기화가 필요하다.
- 데모와 API는 ViewModel 방향은 맞췄지만 전체 표현 컴포넌트를 하나로 합치지 않았다.
- JavaScript 번들은 기존과 같이 500kB를 넘어 code splitting 경고가 발생한다.

## 15. Git 상태

### `git diff --stat`

아래 명령은 Git이 추적 중인 수정 파일만 포함하며 신규 untracked 파일은 위의 변경
파일 목록과 `git status`에 별도로 표시된다.

```text
docs/tech-changelog/README.md                 |   1 +
src/screens/route/planner-api-screen.test.tsx | 192 +++++++------------
src/screens/route/planner-api-screen.tsx      | 256 ++++----------------------
src/screens/route/route-screen.test.tsx       |  24 +++
src/screens/route/use-planner-api.test.ts     | 215 ++++++++++-----------
src/screens/route/use-planner-api.ts          |  32 +++-
6 files changed, 252 insertions(+), 468 deletions(-)
```

### `git status --short --branch`

```text
## feat/planner-journey-api
 M docs/tech-changelog/README.md
 M src/screens/route/planner-api-screen.test.tsx
 M src/screens/route/planner-api-screen.tsx
 M src/screens/route/route-screen.test.tsx
 M src/screens/route/use-planner-api.test.ts
 M src/screens/route/use-planner-api.ts
?? DIVURVE_PLANNER_JOURNEY_IMPLEMENTATION_REVIEW_GUIDE.md
?? docs/tech-changelog/0032-planner-journey-api-integration.md
?? src/api/planner.test.ts
?? src/screens/route/planner-api-presenter.test.ts
?? src/screens/route/planner-api-presenter.ts
?? src/screens/route/planner-api-screen.css
?? src/screens/route/planner-api-types.ts
?? src/screens/route/planner-journey-action.tsx
?? src/screens/route/planner-journey-curve.test.tsx
?? src/screens/route/planner-journey-curve.tsx
?? src/screens/route/planner-journey-detail.tsx
?? src/screens/route/planner-journey-goal-select.tsx
?? src/screens/route/planner-journey-status.tsx
```

커밋, push, PR 생성과 develop merge는 수행하지 않았다.
