# 0058. 비율→퍼센트 변환 규칙을 `src/lib/percent.ts` 한 곳으로 모음 (통합 브랜치)

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | AI Agent (Claude) |
| 변경 유형 | refactor |
| 영향 범위 | 화면(홈·X-Ray·전망), 공용 모듈(신규 `src/lib/`) |
| 관련 브랜치 | chore/shared-percent-formatter (base: `chore/ui-overhaul-integration`) |
| 관련 커밋 | (커밋 후 기입) |
| 관련 이슈·PR | #68 (선행: #66 / PR #67), #60, divurve-api#94 / divurve-api PR #133 |

## 변경 사유 (Why)

비율(0~1)을 소수 첫째 자리 퍼센트로 바꾸는 규칙 `Math.round(ratio * 1000) / 10` 이 이 브랜치에도
세 곳에 복제되어 있다.

| 위치 | 형태 |
|---|---|
| `src/screens/xray/xray-presenter.ts:17` | `export function toPercent` |
| `src/screens/forecast/forecast-presenter.ts:102` | `export function toPercent` |
| `src/screens/home/home-presenter.ts:218` | `function toPercent` (로컬, 이슈 #60에서 추가) |

홈의 통화별 노출과 X-Ray 의 통화별 노출은 백엔드의 **같은 `PortfolioSnapshot`** 에서 나온 같은 값을
그린다(divurve-api#94, PR #133). 백엔드에는 두 출력이 일치하는지 검증하는 테스트까지 걸려 있다.
복제본 중 하나만 반올림이 달라지면 백엔드 계약은 그대로 통과하는데도 두 화면 숫자가 조용히 어긋난다.

이 위험은 이미 코드에 기록되어 있었다. `home-presenter.ts:213` 의 doc comment가
*"X-Ray `xray-presenter.toPercent` 와 **같은 규칙**이어야 한다 (…) 화면 간 import 는 레이어를
넘으므로(§7.1) 규칙만 맞춘다"* 라고 적고 있다. 즉 위험을 알면서도 §7.1 단방향 레이어링
(`screens/home` → `screens/xray` 금지) 때문에 규칙 복제를 감수한 상태였다. 화면보다 아래 레이어에
공용 자리를 만들면 레이어링을 지키면서 복제를 없앨 수 있다.

### 이 변경 로그가 `develop` 의 0055와 짝을 이루는 이유

같은 통합 작업이 `develop` 라인에서 먼저 진행되어 `0055-shared-percent-formatter.md`(PR #67,
머지 커밋 `c66875d`)로 들어갔다. 그 작업은 `develop`(`388e880`)을 base로 잡았기 때문에 이 브랜치에
쌓인 스프린트 작업(#52·#53·#54·#55·#56·#59·#63)을 보지 못했고, 결과적으로 **두 라인이 만날 때
`xray-presenter.ts`·`xray-presenter.test.ts`·`xray-fitness-view.tsx` 3건이 충돌**하게 됐다
(`git merge-tree origin/develop origin/chore/ui-overhaul-integration` 로 확인. 그 전에는 충돌 0건).

**이 PR은 충돌 건수를 줄이지 않는다(3건 그대로).** 다만 충돌의 성격을 바꾼다. 실제 병합을 돌려
확인한 결과, 이 PR 적용 후 남는 3건의 충돌 hunk 에는 **`toPercent` 가 등장하지 않는다** — 양쪽 모두
`import { toPercent } from "../../lib/percent";` 로 이미 일치하기 때문이다. 남은 충돌은 전부
#54(`ConcentrationStatus` 어휘)와 #59(`isRiskProfileMeasured` 이동) 때문이고, 해소 방향도
**전부 이 브랜치(HEAD) 채택**으로 명확하다.

즉 이 PR 없이 병합하면 "한쪽은 복제본 3개, 한쪽은 공용 모듈" 상태를 손으로 판단해야 하고 잘못
고르면 복제가 되살아난다. 이 PR 이후에는 그 판단이 사라지고 어휘 작업만 남는다.

`src/lib/percent.ts` 와 `percent.test.ts` 는 `develop` 의 것과 **바이트 단위로 동일**하게 맞췄다.
처음에는 이 브랜치의 doc comment 를 더 자세히 썼는데, 그러면 add/add 충돌이 하나 더 생겨(3건→4건)
통합을 어렵게 만들었다. 두 라인이 같은 파일을 갖는 것이 주석의 상세함보다 중요하다고 판단했다.

## 변경 내용 (What)

- `src/lib/percent.ts` 신규. `toPercent` 하나만 export한다. 내용은 `develop`(PR #67)의 것과
  바이트 단위로 동일하다 — 두 라인이 같은 파일을 갖게 하는 것이 이 PR 의 핵심이다.
  `home-presenter` 에 있던 상세한 근거 주석은 이 변경 로그가 대신 보존한다.
- **놓을 자리**: §7.1 의존성 방향(`app` → `screens` → `components` → `hooks` → `api`)에서 이 함수는
  아무것도 의존하지 않는 **최하위**라 모든 레이어가 안전하게 import할 수 있다. `api/` 는 백엔드
  경계(snake_case→camelCase) 전용이라 표시용 포매터를 두면 §7.1 위반이고, `screens/` 아래는
  애초에 이 문제의 원인이다. §3 목록에 공용 순수 함수 자리가 없지만 `src/types/`·`src/hooks/` 가
  이미 같은 방식으로 §3 밖에 있는 공용 레이어이므로 그와 나란한 `src/lib/` 을 신설했다.
  파일명은 잡동사니가 되기 쉬운 `utils` 대신 도메인을 드러내는 `percent.ts` 로 했다.
- 세 화면의 복제본을 모두 제거하고 공용 모듈을 import하게 했다.
- `xray-fitness-view.tsx` 의 `toPercent` import 출처를 `./xray-presenter` → `../../lib/percent` 로
  옮겼다. 같은 import 블록의 `isConcentrationAboveThreshold`·`toConcentrationStatusLabel`·
  `toFitnessExplanationFacts` 는 X-Ray 도메인 로직이므로 `xray-presenter` 에 그대로 둔다.
- 두 프레젠터 테스트에 흩어져 있던 `toPercent` 케이스를 `src/lib/percent.test.ts` 로 합치고,
  반올림 경계와 1 초과·음수 입력을 추가로 고정했다.

### 재export 를 두지 않은 이유

기존 `toPercent` export 를 프레젠터에 재export로 남겨 호환을 유지할 수도 있었지만 그렇게 하지 않았다.
(1) 프레젠터 밖 실제 소비처는 `xray-fitness-view.tsx` 한 곳과 테스트 2개뿐이라 이전 비용이 작다.
(2) 재export 를 남기면 "이 규칙은 X-Ray 화면 것"이라는 잘못된 소유권 인상이 그대로 남는데,
이번 변경이 없애려는 것이 정확히 그 인상이다. (3) 쓰이지 않는 재export 는 죽은 코드로 남아
다음 사람이 다시 화면에서 화면으로 import 하는 길을 열어둔다.

## 영향 / 리스크

- **수치 변화 없음.** 세 곳의 식이 문자 그대로 동일했으므로 변환 결과는 전과 같다. 기존 테스트의
  기대값(`sharePct`·`fxRatioPct`·미리보기 집중도 `91.8%`·`82.1%` 등)을 **하나도 수정하지 않고**
  전부 통과한다. #63 의 미리보기 집중도 표시도 소수 첫째 자리 그대로다.
- `toPercent` 를 `xray-presenter`/`forecast-presenter` 에서 import하던 코드는 더 이상 컴파일되지
  않는다. 이 브랜치 내 소비처는 모두 옮겼고 `tsc --noEmit` 으로 누락이 없음을 확인했다.
- 앞으로 반올림 규칙을 바꾸면 세 화면에 동시에 적용된다. 이것이 의도한 동작이다.
- `src/lib/` 은 이 브랜치에서 처음 생긴 디렉터리다. 화면·컴포넌트·API 를 import 하지 않는 순수
  함수만 두어야 단방향 의존성이 유지된다.
- `src/api/generated/divurve-api.ts` 의 `CurrencyExposure` 주석이 `toPercent` 를 언급하지만 위치를
  적지 않아 여전히 유효하다. 자동 생성 파일이므로 손대지 않았다.

## 검증

- [x] `npm run lint` — 0 errors (남은 15건 warning은 이번 변경과 무관한 기존 `react-refresh` 경고)
- [x] `npx tsc --noEmit` — 통과
- [x] `npm run test -- --coverage` — 109개 파일 / 858개 테스트 전부 통과, 라인·브랜치·함수·구문
      커버리지 100% 유지(`src/lib` 포함)
- [x] 수치 변경 없음 — 기존 기대값을 하나도 수정하지 않았고 모두 통과
- [x] `develop` 과의 실제 병합을 임시 워크트리에서 돌려 충돌 3건의 hunk 내용을 직접 확인.
      `toPercent` 는 어느 hunk 에도 등장하지 않으며, 해소 방향은 전부 이 브랜치(HEAD) 채택이다
- [x] `src/lib/percent.*` 가 `develop` 의 것과 바이트 단위로 동일함을 `diff` 로 확인

## 롤백 방법

`src/lib/percent.ts`·`percent.test.ts` 를 지우고 세 화면의 import 를 제거한 뒤 각 파일에 원래
`toPercent` 정의를 되돌리면 된다(홈은 doc comment 포함). `xray-fitness-view.tsx` 의 import 도
`./xray-presenter` 블록으로 되돌린다. 변환 결과가 바뀌지 않았으므로 롤백에 따르는 수치 영향은 없다.
단, 롤백하면 두 라인의 `toPercent` 상태가 다시 갈려 병합 시 복제본 부활 여부를 손으로 판단해야 한다.
