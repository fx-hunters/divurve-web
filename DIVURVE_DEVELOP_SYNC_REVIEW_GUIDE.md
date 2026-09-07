# Divurve develop 동기화 및 진단 UX 검수 가이드

## 1. 작업 브랜치와 목적

- 작업 브랜치: `feat/initial-setup-diagnosis-flow`
- 목적: 온보딩·간편 진단·상세 진단 UX를 보존하면서 최신 `origin/develop`의 실제 API·세션 구조를 병합한다.
- 기능 체크포인트: `5f3061635250eb106cfeeeb86f9424dcddd480d1`
- develop 병합 commit: `8d2281aae34621180239915b49feca5212076be1`
- 병합한 `origin/develop`: `163de96e0de9b96748241e1d239e767396d94075`
- 원격 push, PR 생성, develop 브랜치 전환 및 develop으로의 최종 merge는 수행하지 않았다.

## 2. pull 전후 커밋 관계

동기화 전 공통 조상은 `ed338f3ac0905ed16b97b5dc37633020ef10228c`였다.

| 시점 | `HEAD...origin/develop` | 의미 |
| --- | ---: | --- |
| 기능 체크포인트 전 | `0 15` | 로컬 고유 commit 0개, develop 고유 commit 15개 |
| 기능 체크포인트 후 | `1 15` | 진단 UX commit 1개, develop 고유 commit 15개 |
| merge 완료 후 | `2 0` | 기능 commit과 merge commit이 있고 develop보다 behind 0 |

merge commit의 부모는 다음 두 commit이다.

1. `5f3061635250eb106cfeeeb86f9424dcddd480d1` — 진단 UX 기능 체크포인트
2. `163de96e0de9b96748241e1d239e767396d94075` — 최신 origin/develop

## 3. 실제 발생한 충돌 파일

총 9개 파일에서 충돌이 발생했다.

1. `src/app/app.test.tsx`
2. `src/app/app.tsx`
3. `src/screens/mypage/mypage-api-screen.test.tsx` — modify/delete
4. `src/screens/mypage/mypage-api-screen.tsx` — modify/delete
5. `src/screens/mypage/mypage-screen.test.tsx`
6. `src/screens/mypage/mypage-screen.tsx`
7. `src/screens/mypage/use-mypage.ts`
8. `src/screens/xray/use-xray.ts`
9. `src/types/mypage.ts`

충돌 해결 후 `git diff --name-only --diff-filter=U` 결과와 충돌 마커 검색 결과는 모두 0건이었다.

## 4. 파일별 충돌 해결 판단

| 파일 | 해결 판단 |
| --- | --- |
| `src/app/app.tsx` | develop의 단일 세션 bootstrap과 통합 Home/X-Ray/Forecast/MyPage 화면을 유지하고, 기능 브랜치의 진단 경로·History·홈 상세 진단 안내·읽기 전용 결과 상태를 함께 보존했다. |
| `src/app/app.test.tsx` | develop의 실제 Home/MyPage fixture를 기준으로 갱신하고 회원·데모·초기 설정·상세 진단·History 회귀 테스트를 유지했다. |
| `mypage-api-screen.tsx`, 테스트 | develop에서 삭제된 상태를 유지했다. 별도 API 화면을 복원하지 않았다. |
| `mypage-screen.tsx`, 테스트 | develop의 단일 API 화면에 진단 상태 카드, 한국어 설명 설정, 상세 결과 진입·재개 동작을 옮겼다. |
| `use-mypage.ts` | develop의 프로필·설정·위험성향·알림 조회 및 설정 저장 훅을 정본으로 유지했다. |
| `src/types/mypage.ts` | develop의 API presenter용 표시 타입을 유지했다. 로컬 진단 타입은 기존 `src/types/diagnosis.ts`에 계속 분리했다. |
| `src/screens/xray/use-xray.ts` | develop의 실제 X-Ray API 조회·스트레스 실행·비중 조정 preview 흐름을 그대로 유지했다. |

## 5. develop에서 보존한 API·세션 구조

- 배포 Swagger 계약에 맞춘 `src/api/generated/divurve-api.ts`를 develop에서 가져왔다. 생성 파일은 충돌 해결 과정에서 손으로 수정하지 않았다.
- Home, MyPage, Forecast, X-Ray는 계정 종류와 무관하게 최신 통합 API loader와 presenter를 사용한다.
- `api/client.ts`의 요청 body·query snake_case 변환을 유지했다.
- 세션의 `expiresAt` 판정과 만료 임박 skew 처리를 유지했다.
- 인증 요청의 401 응답에서 refresh 후 한 번만 재요청하는 흐름을 유지했다.
- `session-bootstrap.ts`의 refresh 단일 비행 처리를 유지했다.
- 서버가 제공하지 않은 금융 수치나 X-Ray 결과를 화면에서 합성하지 않는다.
- develop의 기술 변경 로그 0024~0030과 이번 기능 로그 0031을 README 인덱스에 함께 등록했다.

## 6. 기능 브랜치에서 보존한 진단 UX

- 설명 분야: 금융·경제, 개발·기술, 마케팅·브랜드, 일상적인 설명
- 초기 설정 전용 체험 자산 불러오기와 건너뛰기
- Q1~Q3 간편 진단 및 0~9점 순수 계산
- 사용자 표시명: 안정항로형, 균형항로형, 적극항로형, 도전항로형
- Q4~Q6 상세 진단과 대표 점수·항로형 불변 원칙
- 대표 항로형과 상세 어구를 구분한 결정론적 자연어 결과
- 홈을 먼저 표시한 뒤 상세 진단 안내를 한 번만 보여 주는 흐름
- 상세 진단 연기, 마이페이지 시작·재개, 첫 미응답 문항 복원
- `/diagnosis/quick`, `/diagnosis/detail`, `/mypage/diagnosis`
- 초기 설정 Shell과 분리한 읽기 전용 상세 결과
- 키보드 접근, focus-visible, Escape, reduced-motion, 360px 이상 반응형

## 7. 삭제 상태를 유지한 파일

develop이 통합 화면으로 대체한 다음 계열은 복원하지 않았다.

- `src/screens/mypage/mypage-api-screen.tsx` 및 테스트·CSS
- `src/screens/mypage/use-mypage-api.ts` 및 테스트
- `src/screens/xray/xray-api-screen.tsx` 및 테스트
- `src/screens/xray/use-xray-api.ts` 및 테스트
- `src/screens/forecast/forecast-api-screen.tsx`, `use-forecast-api.ts` 및 관련 테스트
- `src/screens/home/home-api-summary-view.tsx` 및 테스트
- develop에서 제거한 화면 전용 Home·Forecast·X-Ray mock fixture

## 8. 이동·재구성한 기능

- 마이페이지 진단 카드와 설명 설정을 별도 `mypage-api-screen`에서 최신 `mypage-screen`으로 옮겼다.
- 서버 프로필·위험성향·알림은 `use-mypage`와 `mypage-presenter` 결과를 사용한다.
- 현재 탭의 진단 진행 상태와 설명 선호는 서버 값과 합성해 저장된 것처럼 다루지 않고 출처를 구분해 표시한다.
- 알림 설정은 실제 `PUT /api/v1/me/settings` 어댑터를 유지한다.
- 설명 분야·설명 수준은 기존 UX 계약대로 현재 세션의 임시 설정에 반영하며 서버 저장 문구를 표시하지 않는다.
- 초기 설정용 체험 자산은 `src/api/fixtures/initial-setup-assets.ts`로 분리했다. 실제 X-Ray API 데이터와 공유하거나 합성하지 않는다.

## 9. 상태별 화면 동작

| 상태 | 표시와 동작 |
| --- | --- |
| 미측정 | 간편 진단 3문항 안내와 시작 버튼 |
| 간편 진단 완료 | 대표 항로형·요약과 상세 진단 시작 |
| 상세 진단 진행 중 | 대표 항로형·진행 중 상태와 첫 미응답 문항부터 재개 |
| 상세 진단 완료 | 연결형 자연어 요약, 상세 결과 보기, 다시 진단 |
| 상세 진단 나중에 하기 | 홈을 유지하고 안내를 닫은 뒤 마이페이지 경로로 재개 |
| 서버 결과만 존재 | 서버 결과 배지·점수·진단일·한계를 로컬 진단과 구분해 표시 |

## 10. 자동 검증 결과

| 명령 | 결과 |
| --- | --- |
| 영향 범위 테스트 | 통과 — 39개 파일, 316개 테스트 |
| `npx tsc --noEmit` | 통과 — TypeScript 오류 0개 |
| `npm run lint` | 통과 — 오류 0개, Fast Refresh 경고 11개 |
| `npm run test` | 통과 — 71개 파일, 540개 테스트 |
| `npm run test -- --coverage` 최종 | 통과 — 71개 파일, 540개 테스트, statements/branches/functions/lines 100% |
| `npm run build` | 통과 — 732 modules transformed |
| `git diff --check` | 통과 |

첫 coverage 실행에서 확인된 일반 설정 저장 오류 분기를 테스트로 보강했고, 이후 전체 test와 coverage를 각각 다시 실행해 540개가 모두 통과했다.

## 11. 남은 경고

- 기능 브랜치에 이미 있던 `react-refresh/only-export-components` 경고 9개
- develop 통합으로 들어온 같은 규칙 경고 2개:
  - `src/screens/home/today-headline-card.tsx`
  - `src/screens/xray/xray-exposure-view.tsx`
- production build의 500kB 초과 chunk 경고
- 최종 JS: 764.94kB, gzip 220.51kB
- npm의 `Unknown env config "min-release-age"` 안내

위 항목은 오류가 아니며 이번 검증을 실패시키지 않았다.

## 12. 알려진 제한사항

- 초기 설정 완료를 서버의 `onboarded=true`로 갱신하는 확정 API 흐름이 아직 없다.
- Q1~Q6 응답·점수·상세 진단 진행 상태의 서버 저장 API가 없어 현재 브라우저 탭의 `sessionStorage`에만 남는다.
- 설명 분야·수준의 현재 진단 UX 값도 sessionStorage를 우선 표시한다. 서버 설정 응답과 저장 출처를 혼동하지 않는다.
- 체험 자산 불러오기는 실제 금융기관 또는 마이데이터 연결이 아니다.
- 실제 AI API는 사용하지 않으며 결과 문장은 고정 presenter가 만든다.
- 자동 검증에는 실제 Chrome에서의 최종 육안 판정이 포함되지 않았다.

## 13. 데스크톱 1440px 수동 검수

1. `npm run dev`를 실행하고 터미널의 Local URL을 연다.
2. 회원 계정으로 로그인해 `onboarded=false` 응답일 때 `/initial-setup`으로 이동하는지 확인한다.
3. 설명 분야 하나를 선택하고, 이전·다음 이동 뒤에도 선택이 유지되는지 확인한다.
4. 자산 불러오기를 눌러 `체험용 데이터` 안내와 요약을 확인한다. 실제 금융기관 연결 표현이 없어야 한다.
5. Q1~Q3를 한 문항씩 답하고 결과가 네 항로형 중 하나로 표시되는지 확인한다.
6. `홈 시작하기` 후 Home API 화면이 먼저 보이고 상세 진단 안내가 뒤이어 한 번만 나타나는지 확인한다.
7. `지금 맞춤 설정하기`을 눌러 Q4~Q6의 별도 1/3~3/3 진행률을 확인한다.
8. 완료 결과에서 대표 항로형과 Q4~Q6 상세 어구가 색상과 굵기로 구분되는지 확인한다.
9. 마이페이지에서 상세 완료 요약, 상세 결과 보기, 다시 진단을 확인한다.
10. 상세 결과 화면에 초기 설정 헤더·3/3·초기 설정 완료 CTA가 없는지 확인하고 브라우저 뒤로 가기를 검수한다.
11. Home, 내 자산, 환율 범위, 마이페이지가 모두 실제 통합 API 상태(loading/error/empty/success)를 유지하는지 확인한다.

## 14. 모바일 390px·360px 수동 검수

각 너비에서 다음을 반복한다.

1. 초기 설정 질문·선택 카드가 가로 스크롤 없이 한 열로 보이는지 확인한다.
2. 이전·다음·건너뛰기 CTA가 한 손 조작 가능한 크기인지 확인한다.
3. 홈 상세 진단 바텀시트가 하단 내비게이션과 핵심 CTA를 가리지 않는지 확인한다.
4. Q4~Q6 연결형 결과 문장이 단어 중간에서 부자연스럽게 잘리지 않는지 확인한다.
5. 마이페이지 프로필, 진단 상태, 설명 설정, 알림 설정, 바로가기가 가로 넘침 없이 보이는지 확인한다.
6. OS reduced-motion을 켠 상태에서 대기 없이 핵심 문구와 버튼을 사용할 수 있는지 확인한다.

## 15. 회원 세션 검수

1. `onboarded=false`: 로그인 후 초기 설정 진입
2. `onboarded=true`: 로그인 후 Home 진입
3. 간편 진단 완료: Home 상세 진단 안내 표시
4. 나중에 하기: 안내 닫힘 및 마이페이지에서 상세 진단 시작
5. 상세 진행 중 이탈: 마이페이지에서 첫 미응답 문항부터 재개
6. 상세 완료: `/mypage/diagnosis` 읽기 전용 결과와 History 복귀
7. 만료 세션: expiresAt 판정 후 refresh 또는 정상 재인증 흐름
8. API 401: refresh 성공 시 동일 요청이 한 번만 재시도되는지 네트워크 탭에서 확인

## 16. 데모 세션 검수

1. 랜딩에서 대시보드 체험을 시작한다.
2. BE가 발급한 데모 세션과 데모 계정 배지를 확인한다.
3. 데모 사용자가 `/initial-setup`, `/diagnosis/quick`, `/diagnosis/detail`로 강제 이동하지 않는지 확인한다.
4. Home, 내 자산, 환율 범위, 마이페이지가 계정 종류별 프론트 mock 분기 없이 API 로더를 사용하는지 확인한다.
5. 마이페이지에서 회원 전용 진단 CTA가 노출되지 않는지 확인한다.

## 17. 진단 기능 변경 통계

merge 직후 `git diff --stat origin/develop...HEAD` 기준:

```text
63 files changed, 6460 insertions(+), 1068 deletions(-)
```

이 통계는 동기화 검수 문서와 기존 검수 문서의 후속 갱신분을 넣기 전의 기능 코드 기준이다.

## 18. 최종 Git 상태

문서 commit까지 마친 뒤 확인할 상태:

```text
## feat/initial-setup-diagnosis-flow
```

- `origin/develop` 대비 behind 0
- 미해결 충돌 0
- 충돌 마커 0
- 의도하지 않은 미커밋 변경 0
- push하지 않음
- PR을 생성하지 않음
- develop 브랜치로 전환하거나 최종 merge하지 않음
