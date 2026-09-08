# 0049. 홈에서 제거된 `route_enabled` 플래그를 걷어내고 배지 어휘를 백엔드 3종에 맞춘다

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | AI Agent (Claude) |
| 변경 유형 | fix |
| 영향 범위 | 화면(홈 대시보드) / API 타입 / 테스트 픽스처 |
| 관련 브랜치 | fix/home-route-flag |
| 관련 커밋 | (커밋 후 기입) |
| 관련 이슈·PR | #53 (점검 리포트 #47 의 H4·H6·L2), divurve-api#84 |

## 변경 사유 (Why)

**(1) 사실과 다른 안내가 사용자에게 나가고 있었다.**
백엔드는 divurve-api#84 에서 목표 Route 기능 플래그를 없앴다 — 계산이 확정돼 "아직 준비 중"이라는
상태 자체가 사라졌고, `goals_route` 응답의 키는 `active_goals` 하나뿐이다. 그런데 프론트는 계속
`goals_route.route_enabled` 를 읽었다. 없는 필드라 값은 항상 `undefined`(falsy)였고, 그 결과
대시보드 '내 목표' 카드는 **목표가 있어도** 이 문구만 그렸다:

> 환전 경로 계산 기능은 아직 서버에서 준비 중입니다. 준비되면 목표별 회차 계획이 이곳에 표시됩니다.

서버는 준비돼 있다. 프론트가 삭제된 플래그를 읽고 스스로 기능을 꺼서 거짓 안내를 한 것이다.
응답을 `toCamelCase(...) as T` 로 캐스팅만 하고 런타임 검증을 하지 않기 때문에 타입도 이 사고를
잡아 주지 못했다(리포트 §4-2).

**(2) 배지 어휘가 백엔드와 갈려 있었다(잠복).**
백엔드 `RegimeBadgeMapper` 는 국면 4종(`calm`·`normal`·`elevated`·`stress`)을 배지 3종
(`normal`·`caution`·`turbulent`)으로 옮겨 `today.badge`·`attention.regime_badge` 에 싣는다.
프론트 표는 오지 않는 `calm`·`elevated`·`extreme` 을 들고 있으면서 **실제로 오는 `turbulent` 가
없었다.** 데모 응답이 `normal` 이라 드러나지 않았을 뿐, 급변 국면에서는 라벨이 원문 `turbulent`,
톤이 경고색이 아닌 `default` 로 나갔다. 가장 위험한 국면에서 배지가 가장 밋밋해지는 셈이다.

같은 유형(어휘 표가 조용히 어긋남)의 버그가 이번 점검에서 반복됐으므로, 재발 방지를 함께 넣는다.

**(3) 위험성향 등급 어휘도 갈려 있었다(검수 중 추가 발견).**
백엔드 `HomeSummaryResponse.ProfileFitDto.grade` 와 `RiskProfileResponse` 의 `allowableValues` 는
`stable`·`balanced`·`aggressive`·`challenging` 4종이다. 그런데 `GRADE_LABELS` 에는 서버가 보내지
않는 `conservative` 가 있고 실제로 오는 `stable`·`challenging` 이 **없었다** — 4종 중 2종만 맞았다.
안정형·도전형으로 진단된 사용자에게는 라벨 대신 영어 코드 `stable`·`challenging` 이 그대로 노출된다.
점검 리포트(`docs/api-audit-2026-09.md`)에도 없던 항목이라 이 변경에서 함께 고친다.

## 변경 내용 (What)

- `api/generated/divurve-api.ts`
  - `HomeSummaryResponse.goalsRoute` 에서 `routeEnabled` 삭제.
  - `HomeBlockState` 에서 `route_pending` 삭제 → `filled | empty | not_measured`
    (백엔드 `BlockDto` 의 `allowableValues` 와 동일).
  - `HomeBadge = "normal" | "caution" | "turbulent"` 신설. 응답의 `badge`·`regimeBadge` 자체는
    런타임 검증이 없으므로 `string` 으로 두고 어휘는 주석으로 연결한다.
- `types/home.ts` — `GoalsRouteData.isRouteEnabled` 삭제.
- `screens/home/home-presenter.ts`
  - `toGoalsRoute()` 의 플래그 분기 제거. 경로 기능은 항상 열린 것으로 다룬다.
  - `BADGE_LABELS`·`BADGE_TONES`·`BADGE_FALLBACK_HEADLINES` 를 **`Record<HomeBadge, T>`** 로
    선언. 어휘가 하나라도 빠지면 `tsc` 가 막는다.
- `RiskGrade` 리터럴 유니온(`stable`·`balanced`·`aggressive`·`challenging`)을 신설하고
  `GRADE_LABELS` 를 **`Record<RiskGrade, string>`** 로 선언. `conservative` 제거,
  `stable`("안정형")·`challenging`("도전형") 추가. 조회는 타입 가드 `isRiskGrade()` 를 거친다.
  - 모르는 값은 `isHomeBadge()` 타입 가드로 걸러 원문·중립 톤으로 물러난다(기존 동작 유지).
- `screens/home/goals-route-card.tsx` — "준비 중" 문단과 플래그 분기 삭제. 목표가 없을 때만
  빈 안내를 그린다.
- `test/api-fixtures.ts` — 홈 픽스처를 실제 응답 형태에 맞춤(`routeEnabled` 제거,
  `route_pending` → `empty`).

### 배지 표 변경 전후

| badge | 변경 전 라벨 / 톤 | 변경 후 라벨 / 톤 |
|---|---|---|
| `normal` | 정상 / normal | 정상 / normal |
| `caution` | 주의 / warn | 주의 / warn |
| `turbulent` | **(표에 없음)** turbulent / default | **급변 / danger** |
| `calm`·`elevated`·`extreme` | 안정·높음·매우 높음 | **삭제**(배지로 오지 않는 값) |

`turbulent` 의 대체 문구도 추가했다: "변동이 큰 국면입니다. 계획의 가정을 확인해 보세요."

## 영향 / 리스크

- '내 목표' 카드는 이제 목표가 있으면 목표 목록(이름·목표일·통화·금액·상태)을, 없으면
  "등록된 목표가 없습니다…" 안내를 그린다. 데모 세션에는 활성 목표 1건(`미국 대학원 학비`,
  USD 60,000, 2027-09-08)이 있어 목록이 렌더된다.
- `HomeBlockState` 에서 `route_pending` 이 빠졌으므로, 백엔드가 이 상태를 되살리면 컴파일이
  먼저 알려 준다. 서버가 그래도 보내면 `toBlockStates()` 가 그대로 담고 화면은
  `!== "empty"` 기준이라 카드는 계속 렌더된다(조용한 비활성화로 돌아가지 않는다).
- 라벨 문구는 백엔드 `Badge.label()`(정상·주의·급변)과 같은 말을 쓴다. 화면마다 어휘가 갈리지
  않도록 앞으로도 서버 라벨을 따른다.
- 남은 어휘 불일치(X-Ray `concentration.status`, `profileFit.grade` 의 `conservative` ↔ 백엔드
  `stable`/`challenging`)는 이 변경의 범위 밖이다 — 별도 이슈에서 다룬다.

## 검증

- [x] 실제 응답 확인 — `GET /api/v1/home/summary` (데모 세션):
      `goals_route` 는 `active_goals` 만, `today.badge` 는 `normal`.
- [x] `grep -rn "routeEnabled\|routePending" src` → 0건
- [x] `npm run lint` (에러 0, 기존 react-refresh 경고만) / `npm run build` 통과
- [x] 테스트 통과 + 커버리지 100% — 106 파일 833 테스트, 라인·브랜치·함수·구문 100%

## 롤백 방법

이 브랜치의 커밋을 `git revert` 하면 된다. 단 되돌리면 '내 목표' 카드가 다시 영구 비활성
상태로 돌아가므로, 롤백은 백엔드가 `route_enabled` 를 되살린 경우에만 의미가 있다.
