# 0038. 사용자 화면용 AI 자연어 설명 훅·표현 컴포넌트 추가

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | Claude (AI 에이전트) |
| 변경 유형 | feat |
| 영향 범위 | 화면(공용 컴포넌트) / 상태 |
| 관련 브랜치 | feat/ai-explanation |
| 관련 커밋 | (PR 병합 시 기입) |
| 관련 이슈·PR | #40 |

## 변경 사유 (Why)

공통 UI 요구사항 "사용자 맞춤 AI 자연어 설명"에 대해 백엔드 `POST /api/v1/ai/explain`과
프런트 `api/ai-explain.ts`는 이미 있었지만, 소비처가 `screens/admin/**`(운영자 점검 화면)
뿐이라 사용자 화면에는 한 곳도 연결돼 있지 않았다.

화면 4곳(홈 · 환율 전망 · 환전 플래너 · 내 자산)이 각자 요청/상태 관리/표시를 다시 짜면
같은 코드가 네 번 복제되고, 이 API의 까다로운 계약(아래)이 화면마다 다르게 해석될 위험이
있다. 그래서 요청·상태는 훅 하나로, 표시는 표현 컴포넌트 하나로 먼저 못 박아 두고,
실제 화면 삽입은 후속 이슈가 이 두 파일을 가져다 쓰게 했다. 한 이슈가 화면 파일 5개를
동시에 잠그지 않게 하려는 의도도 있다.

이 API에서 특히 조심할 계약은 두 가지다.
1. 수치 대조·표현 필터에 걸려도 **400이 아니라 200 + `fallback: true`**로 온다. HTTP 상태만
   보고 성공으로 처리하면 검증에 걸린 문장이 맞춤 설명인 것처럼 표시된다.
2. `explain_level`·`explain_domain`은 요청에 넣지 않는다. 서버가 로그인 사용자 설정에서
   읽는다(FR-CM-08). 프런트가 임의로 실으면 사용자 설정과 어긋난다.

## 변경 내용 (What)

- `src/hooks/use-ai-explanation.ts` 신규
  - `{ surface, facts, requester? }`를 받아 설명을 요청한다. 값/상태만 반환한다(§7.3).
  - 상태는 discriminated union `idle | loading | error | success`(§7.4). 성공 상태에
    `explanation` · `verification` · `meta`를 그대로 실어, 화면이 `fallback`·`numericMatch`로
    문장 성격을 판정할 수 있게 했다.
  - `facts`가 `null`/`undefined`/빈 객체면 요청하지 않고 `idle`에 머문다(서버 400 방지).
  - 재요청 신호는 `surface` + 직렬화한 `facts` 내용으로만 판정한다. 화면이 `facts` 객체를
    렌더마다 새로 만들어도 요청이 반복되지 않는다. `requester`는 ref로만 참조한다.
  - `useEffect` 정리 함수로 언마운트 뒤 setState를 막는다. `ApiError`면 서버 메시지를,
    아니면 복구 가능한 안내 문구를 상태에 담는다(§7.8, 사과 문구 없음).
- `src/components/ai/ai-explanation.tsx` · `ai-explanation.css` 신규
  - 표현 전용. props만 읽고 fetch·전역 접근을 하지 않는다(§7.2).
  - 서버가 준 문장은 손대지 않고 그대로 나열한다. 컴포넌트 고정 문구에는 금지어
    (예측·추천·보장)를 쓰지 않았다.
  - `fallback === true` 또는 `numericMatch === false`면 "일반 안내 문장" 성격을 알리는
    보조 라벨을 붙인다.
  - 에러 상태는 `role="alert"` + 재시도 버튼(`onRetry`가 있을 때만).
  - `idle`이거나 문장이 0개면 아무것도 렌더하지 않아 빈 영역을 만들지 않는다.
  - 색상은 전부 `var(--토큰)`만 사용했다.
- 테스트 2종 신규 — loading / error(ApiError·일반 예외) / success / fallback / 빈 facts /
  언마운트 후 응답 분기를 모두 덮는다.

## 영향 / 리스크

- 기존 화면 동작은 바뀌지 않는다. `screens/**`는 한 파일도 수정하지 않았고, 새 파일은 아직
  어디에서도 렌더되지 않는다(후속 화면 이슈에서 삽입).
- 로딩 표시는 공용 스피너(`components/common/spinner.tsx`)가 별도 이슈 산출물이라 이 브랜치에
  아직 없다. 직접 의존하는 대신 `loadingIndicator?: ReactNode` prop을 두고 기본값으로 내부의
  작은 CSS 표시 요소를 쓴다. 공용 스피너가 들어오면 prop으로 주입하거나 기본 요소만 교체하면
  되고, 이 컴포넌트의 API는 그대로다.
- `facts` 비교에 `JSON.stringify`를 쓰므로 순환 참조가 있는 객체를 넘기면 렌더 중 예외가 난다.
  `facts`는 서버에 그대로 실어 보낼 평범한 JSON 값이어야 한다는 계약이므로 허용 범위로 봤다.
- 수치 계산 변경 없음(계산은 백엔드 전담).

## 검증

- [x] `npm run lint` — 신규 파일 경고·오류 0건
- [x] `npm run build` 통과
- [x] 테스트 통과 + 커버리지 100%
- [ ] (수치 변경 시) 변경 전후 값 확인 — 해당 없음

## 롤백 방법

새로 추가된 파일만 지우면 된다. 소비처가 아직 없어 다른 화면에 영향이 없다.

- `src/hooks/use-ai-explanation.ts` (+ 테스트)
- `src/components/ai/**`
