# 0055. 비율→퍼센트 변환 규칙을 `src/lib/percent.ts` 한 곳으로 모음

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | AI Agent (Claude) |
| 변경 유형 | refactor |
| 영향 범위 | 화면(홈·X-Ray·전망), 공용 모듈(신규 `src/lib/`) |
| 관련 브랜치 | claude/cool-hamilton-d6e7c6 |
| 관련 커밋 | (커밋 후 기입) |
| 관련 이슈·PR | #60 (홈 통화별 노출), divurve-api#94 / divurve-api PR #133 |

## 변경 사유 (Why)
비율(0~1)을 소수 첫째 자리 퍼센트로 바꾸는 규칙 `Math.round(ratio * 1000) / 10`이 세 화면에
각각 복제되어 있었다.

| 위치 | 형태 |
|---|---|
| `src/screens/xray/xray-presenter.ts` | `export function toPercent` |
| `src/screens/forecast/forecast-presenter.ts` | `export function toPercent` |
| `src/screens/home/home-presenter.ts` | `fxRatioPct` 계산부에 **인라인 표현식**으로 직접 작성 |

이게 위험한 이유는 단순 중복이 아니다. 홈의 통화별 노출과 X-Ray의 통화별 노출은 백엔드의
**같은 `PortfolioSnapshot`** 에서 나온 같은 값을 그린다(divurve-api#94, PR #133). 백엔드에는 두
출력이 일치하는지 검증하는 테스트까지 걸려 있다. 그런데 프론트에서 세 복제본 중 하나만 반올림이
달라지면(예: `toFixed(1)`로 바꾸거나 자릿수를 조정) 백엔드 계약은 그대로 통과하는데도 두 화면의
숫자가 조용히 어긋난다. 복제본이 셋이면 그런 변경이 언제든 한쪽에만 적용될 수 있다.

홈의 것은 함수조차 아닌 인라인 표현식이어서, `toPercent`를 grep해도 걸리지 않았다. 규칙이 바뀔 때
가장 먼저 누락될 자리였다.

화면끼리 import로 공유하는 것은 AGENTS.md §7.1 단방향 레이어링 위반이므로(`screens/home` →
`screens/xray` 금지) 애초에 선택지가 아니었다. 그래서 화면보다 아래 레이어에 공용 자리를 만든다.

## 변경 내용 (What)
- `src/lib/percent.ts` 신규. `toPercent` 하나만 export하고, 왜 이 규칙이 한 파일에만 있어야 하는지
  (홈·X-Ray가 같은 스냅샷을 그린다는 사실)를 doc comment로 남겼다.
- **놓을 자리 선정**: AGENTS.md §3 폴더 구조에는 공용 순수 함수 자리가 없고, `screens/` 아래는
  제외 조건이다. §7.1 의존성 방향(`app` → `screens` → `components` → `hooks` → `api`)에서
  이 함수는 아무것도 의존하지 않는 **최하위**이므로 모든 레이어가 안전하게 import할 수 있다.
  `api/`는 백엔드 경계(snake_case→camelCase) 전용이라 표시용 포매터를 두면 §7.1 위반이다.
  기존 `src/types/`·`src/hooks/`가 이미 같은 방식으로 §3 목록 밖에 있는 공용 레이어이므로,
  그와 나란한 `src/lib/`을 신설하고 파일명은 도메인을 드러내는 `percent.ts`로 했다
  (`utils` 같은 잡동사니 이름은 피함).
- 세 화면이 모두 이 모듈을 import하도록 교체. 홈의 인라인 표현식도 `toPercent(...)` 호출로 바꿔
  세 화면이 문자 그대로 같은 코드를 지나게 했다.
- `xray-fitness-view.tsx`의 import 출처를 `./xray-presenter` → `../../lib/percent`로 변경.

### 재export를 두지 않고 전부 옮긴 이유
기존 `toPercent` export를 두 프레젠터에 재export로 남겨 호환을 유지할 수도 있었지만, 그렇게 하지
않았다. (1) 프레젠터 밖 실제 소비처는 `xray-fitness-view.tsx` 한 곳뿐이고 테스트 2개가 전부라
이전 비용이 작다. (2) 재export를 남기면 "이 규칙은 X-Ray 화면 것"이라는 잘못된 소유권 인상이
그대로 남는다. 이번 변경이 없애려는 것이 바로 그 인상이다. (3) 쓰이지 않는 재export는 죽은 코드로
남아 다음 사람이 다시 화면에서 화면으로 import하는 길을 열어둔다.

## 영향 / 리스크
- **수치 변화 없음.** 세 곳의 식이 문자 그대로 동일했으므로 변환 결과는 전과 같다.
  기존 프레젠터 테스트(`fxRatioPct: 36.1`, `sharePct` 등)가 값 변화 없이 모두 통과하는 것으로 확인.
- `toPercent`를 `xray-presenter`/`forecast-presenter`에서 import하던 코드는 더 이상 컴파일되지 않는다.
  레포 내 소비처는 모두 이번 변경에서 옮겼고, `tsc --noEmit`으로 누락이 없음을 확인했다.
- 앞으로 반올림 규칙을 바꾸면 세 화면에 동시에 적용된다. 이것이 의도한 동작이며, 백엔드가 두 출력의
  일치를 검증하는 한 세 화면은 함께 움직여야 한다.
- `src/lib/`은 이번에 처음 생긴 디렉터리다. 화면·컴포넌트·API를 import하지 않는 순수 함수만 두어야
  단방향 의존성이 유지된다.

## 검증
- [x] `npm run lint` — 0 errors (남은 15건은 이번 변경과 무관한 기존 `react-refresh` warning)
- [x] `npx tsc --noEmit` — 통과
- [x] `npm run test -- --coverage` — 107개 파일 / 835개 테스트 전부 통과, 라인·브랜치·함수·구문
      커버리지 100% 유지(`src/lib` 포함)
- [x] `src/lib/percent.test.ts` 신규 — 두 프레젠터 테스트에 흩어져 있던 케이스를 합치고, 반올림
      경계(`0.12345`→12.3, `0.12355`→12.4)와 1 초과·음수 입력을 추가로 고정
- [x] 수치 변경 없음 — 기존 기대값을 하나도 수정하지 않았고 모두 통과

## 롤백 방법
`src/lib/percent.ts`·`percent.test.ts`를 지우고, 세 화면의 import를 제거한 뒤 각 파일에 원래
`toPercent` 정의(홈은 인라인 표현식)를 되돌리면 된다. `xray-fitness-view.tsx`의 import 출처도
`./xray-presenter`로 되돌린다. 변환 결과가 바뀌지 않았으므로 롤백에 따르는 수치 영향은 없다.
