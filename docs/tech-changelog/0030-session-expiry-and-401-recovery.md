# 0030. 세션 만료 판정과 401 자동 복구

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-07 |
| 작성자 | Claude (Opus 5) |
| 변경 유형 | fix |
| 영향 범위 | API 경계(세션·인증) / 전 화면 |
| 관련 브랜치 | fix/session-expiry-and-refresh |
| 관련 커밋 | (커밋 후 기입) |
| 관련 이슈·PR | #29 |

## 변경 사유 (Why)

"랜딩에서 대시보드 체험하기를 눌러도 `/auth/demo`가 호출되지 않는다"는 보고를 받아 조사했다. 브라우저에서 `fetch`를 감싸 호출을 기록해 재현·대조했다.

| 조건 | 실제 호출 |
|---|---|
| sessionStorage에 세션 있음 | `/home/summary`만 — **`/auth/demo` 없음** |
| sessionStorage 비움 | `/auth/demo` → `/home/summary` |

`ensureApiSession()`이 저장된 세션이 있으면 그대로 반환하는 것 자체는 의도한 동작이다. 매번 새 데모 계정을 만들지 않기 위해서다.

**진짜 결함은 만료를 판정할 방법이 아예 없었다는 점이다.** `saveApiSession()`이 저장하던 것은 `accessToken`·`refreshToken`·`expiresIn`·`isDemo`뿐이었다. `expiresIn: 1800`은 **상대 시간(초)**인데 **발급 시각을 저장하지 않아** 만료 여부를 계산할 수 없었다. 그래서 3시간 전에 만료된 토큰도 유효한 세션으로 통과했고, 다음 흐름이 만들어졌다.

1. 데모 세션 발급 → sessionStorage 저장
2. 탭을 열어둔 채 30분 경과 → 토큰 만료
3. 대시보드 진입 → `readApiSession()`이 만료된 세션을 반환 → `/auth/demo` 미호출
4. 모든 API가 401 → 화면마다 "인증이 필요합니다"

`refreshSession()`은 `auth.ts`에 구현돼 있었지만 **어디에서도 호출하지 않아** 401 복구 경로가 통째로 비어 있었다.

## 변경 내용 (What)

### 만료 판정 (`api/session.ts`)

- `StoredApiSession`에 `expiresAt`(epoch ms) 추가. `saveApiSession()`이 저장 시점에 `now + expiresIn * 1000`으로 계산해 함께 기록한다
- `readApiSession()`은 만료된 세션에 `null`을 반환한다. 그러면 `ensureApiSession()`이 자연히 재발급한다
- `readStoredApiSession()` 신설 — 만료를 따지지 않고 저장값을 읽는다. 액세스 토큰이 만료돼도 리프레시 토큰은 살아 있을 수 있어 갱신 경로에서 쓴다
- `SESSION_EXPIRY_SKEW_MS = 30_000` — 만료 직전 토큰으로 요청을 보내 중간에 401을 맞지 않도록 30초 여유를 둔다
- `expiresAt`이 없는 예전 형식은 만료를 판정할 수 없으므로 **버린다**. 이 변경 이전에 저장된 세션을 들고 있는 사용자는 자동으로 재발급받는다

### 401 자동 복구 (`api/client.ts`)

- `registerSessionRefresher()` 신설. `auth.ts`가 `client.ts`를 쓰므로 client가 auth를 직접 부르면 순환이 된다. 갱신 수단을 밖에서 주입받아 의존 방향을 지킨다(AGENTS.md §7.1)
- 토큰이 없으면 네트워크를 타기 전에 먼저 갱신을 시도한다. 만료로 토큰이 사라진 경우가 여기에 해당한다
- 서버가 401을 주면 **한 번만** 갱신해 재요청한다. 재요청도 401이면 더 갱신하지 않고 서버 오류를 그대로 던진다

### 갱신자 (`api/session-bootstrap.ts`)

- `installSessionRefresh()`가 `refreshAccessToken`을 client에 등록한다. `ensureApiSession()`이 이를 호출하므로 대시보드 진입 전에 항상 설치된다
- 갱신 요청은 **단일 비행**이다. 여러 요청이 동시에 401을 맞아도 `/auth/refresh`는 한 번만 나간다
- 갱신에 실패하면 남은 세션을 버려서, 다음 `ensureApiSession()`이 데모 세션을 새로 발급받을 수 있게 한다

### 변경 로그 번호 정리

`0026`이 두 개(`fix-sensitivity-key-casing`, `forecast-api-integration`) 있었다. 도메인 통합 연속(0026 forecast → 0027 xray → 0028 home)을 유지하기 위해 `fix-sensitivity-key-casing`을 `0029`로 옮겼다.

## 영향 / 리스크

- 이 변경 이전에 저장된 세션은 전부 무효가 되어 한 번 재발급된다. 데모 계정은 호출마다 새로 생기므로(BE 확인 완료) 데이터 손실은 없다. **회원 계정은 재로그인이 필요하다**
- `POST /auth/refresh`가 실패하면 세션을 비우므로, 리프레시 토큰까지 만료된 사용자는 데모 세션으로 떨어진다. 회원 계정에서는 로그인 화면으로 유도하는 처리가 별도로 필요하다(후속 과제)
- StrictMode 이중 마운트로 개발 모드에서는 조회 요청이 2번 나간다. 단일 비행 덕분에 `/auth/demo`와 `/auth/refresh`는 1번씩만 나간다. 프로덕션 빌드에는 해당 없다

## 검증

- `npm run lint` — 오류 0 (경고 11, 기존 `react-refresh` 경고)
- `npm run build` — 성공
- `npm run test -- --coverage` — 58 파일 419 테스트 통과, 라인·분기·함수·구문 커버리지 100%
- 배포 BE 실호출로 세 경로 확인 (브라우저에서 `fetch`를 감싸 호출 기록)

| 상황 | 기록된 호출 | 결과 |
|---|---|---|
| 세션 없음 | `/auth/demo` → `/home/summary` | `expiresAt` 저장, 잔여 30분 |
| 세션 만료(`expiresAt`을 과거로 조작) | `/auth/demo` → `/home/summary` | 재발급, 화면 정상 |
| 액세스 토큰만 손상(만료 시각은 유효) | `/home/summary`(401) ×2 → **`/auth/refresh` ×1** → `/home/summary` ×2 | 토큰 교체, 화면 정상. 동시 401에도 갱신은 한 번 |

## 롤백

`fix/session-expiry-and-refresh` 병합 커밋을 revert한다. 되돌리면 만료 판정이 사라져 같은 증상이 재현되므로, 저장 형식만 유지하고 싶다면 `api/session.ts` 변경만 남긴다.
