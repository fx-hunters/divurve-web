# Divurve 초기 설정·진단 UX 구현 외부 검수 문서

이 문서는 `divurve-web` 저장소를 직접 열지 않는 검수자도 이번 변경의 목적, 화면 흐름, 데이터 경계, 검증 결과와 수동 검수 순서를 판단할 수 있도록 작성했다. 기록 기준일은 2026-09-07이며 민감정보와 환경변수 값은 포함하지 않는다.

## 1. 작업 브랜치와 작업 목적

- 저장소: `divurve-web`
- 작업 브랜치: `feat/initial-setup-diagnosis-flow`
- 작업 목적: 로그인 후 초기 설정, Q1~Q3 간편 위험성향 진단, Q4~Q6 상세 진단, 홈의 상세 진단 안내, 마이페이지 상태·결과 화면을 하나의 일관된 사용자 흐름으로 완성한다.
- 작업 경계: UI, 프론트 상태, 순수 점수 계산, 결정론적 문장 presenter, 테스트, 문서만 변경했다.
- 보호한 경계: 생성 API, Swagger 계약, 패키지, Planner 구현, 백엔드는 변경하지 않았다.

## 2. 수정 전 발생했던 문제

- 초기 설정 2단계가 온보딩 안에서 자산을 직접 입력하게 해 실제 사용 흐름과 맞지 않았다.
- Q1~Q3가 placeholder에 가까웠고 점수 구간과 결과 화면이 완결되지 않았다.
- 간편 결과와 Q4~Q6 상세 진단이 초기 설정 3단계 안에 계속 이어져 홈 진입이 늦어졌다.
- 상세 결과를 마이페이지에서 열어도 `초기 설정`, `3/3`, `초기 설정 마치기`가 다시 나타났다.
- `목적자금 혼합형 · 적극형`처럼 Q4와 Q1~Q3를 하나의 공식 유형명처럼 연결했다.
- 사용자 화면에 `적극형`, `plain`, `simple`, 환전 우대율 API 값, 서버 실효 스프레드 같은 내부·개발자 표현이 노출됐다.
- 설명 분야와 설명 수준의 최초 선택값과 마이페이지 표시값 사이에 명확한 우선순위가 없었다.
- 상세 진단 진행 중 이탈과 첫 미응답 문항 재개가 사용자 흐름으로 분명하지 않았다.

## 3. 실제로 구현한 변경사항

1. 회원 세션의 `onboarded=false`만 `/initial-setup`으로 보내고 데모 세션은 기존 홈 흐름을 유지했다.
2. 초기 설정을 설명 분야 → 자산 불러오기 → Q1~Q3 간편 진단 → 간편 결과 → 홈 시작으로 정리했다.
3. 자산 직접 입력 UI를 체험용 fixture 기반 `자산 불러오기`의 idle/loading/error/success 상태로 교체했다.
4. Q1~Q3를 한 문항씩 표시하고 A=0, B=1, C=2, D=3 규칙을 순수 함수에 격리했다.
5. 결과 표시명을 네 가지 항로형으로 통일했다.
6. 간편 결과에서 홈으로 이동한 뒤 상세 진단 안내 sheet/dialog를 한 번 표시한다.
7. Q4~Q6 상세 진단을 `/diagnosis/detail`의 별도 `1/3`~`3/3` 흐름으로 분리했다.
8. Q4~Q6 값을 대표 항로형과 분리해 보존하고, 고정 presenter가 자연스러운 연결형 문장을 만든다.
9. 마이페이지 의사결정 프로필을 진단 상태별로 나누고 시작·재개·결과 보기·재진단 동작을 연결했다.
10. `/mypage/diagnosis`에 읽기 전용 상세 결과 화면을 추가했다.
11. 마이페이지의 설명 분야와 설명 수준을 한국어 표시값으로 편집할 수 있게 했다.
12. 개발자용 환전 우대율·스프레드 UI를 사용자 기본 설정에서 제거했다.
13. 진단 진행과 설명 설정을 계약이 있는 API처럼 가장하지 않고 각각 별도 `sessionStorage` 모듈에 격리했다.
14. History, 직접 URL 진입, 키보드 포커스, Escape 닫기, reduced-motion, 모바일 줄바꿈을 테스트했다.

## 4. 위험성향 명칭 변경 전·후 비교

점수 계산과 내부 의미는 유지하고 사용자에게 보이는 명칭만 항로형으로 통일했다.

| 점수 | 내부 값 | 변경 전 표시 | 변경 후 표시 |
|---:|---|---|---|
| 0~2 | `stable` | 안정형 | 안정항로형 |
| 3~4 | `balanced` | 균형형 | 균형항로형 |
| 5~6 | `active` | 적극형 | 적극항로형 |
| 7~9 | `challenger` | 도전형 | 도전항로형 |

서버 호환 presenter는 `challenge`, `challenger`, 과거 한국어 명칭과 새 항로형 명칭을 모두 인식한다. 대표 결과는 금융회사의 표준 적합성 진단이 아닌 MVP 참고 진단이라는 기존 고지를 유지한다.

## 5. Q1~Q6 입력값과 결과 반영 규칙

### Q1~Q3

| 문항 | 측정 내용 | 선택지 | 결과 반영 |
|---|---|---|---|
| Q1 | 손실 상황에서의 행동 | A~D | 0~3점 |
| Q2 | 위험과 기대수익 관계 | A~D | 0~3점 |
| Q3 | 환율 변동 대응 | A~D | 0~3점 |

세 문항 합계만 대표 항로형을 결정한다. 사용자가 이전 문항으로 돌아가 답을 바꾸면 합계와 결과를 다시 계산한다.

### Q4~Q6

| 문항 | 저장하는 구조화 값 | 화면 반영 | 대표 점수·항로형 변경 |
|---|---|---|---|
| Q4 | 자금 분리 정도 | 생활자금 민감형·목적자금 혼합형·목적자금 분리형 맥락 | 없음 |
| Q5 | 설명 선호 | 핵심만 쉽게·이유와 근거까지·지표와 한계까지 | 없음 |
| Q6 | 보유 경험 | 처음·몇 차례·꾸준한 경험에 맞춘 용어와 보충 안내 | 없음 |

초기 설정 1단계의 `explanationDomain`도 설명 개인화 설정일 뿐 위험성향 계산에는 사용하지 않는다.

## 6. 대표 항로형과 상세 진단 어구의 구분

- 대표 위험성향은 Q1~Q3 결과 하나다.
- Q4는 자금 상태, Q5는 설명 선호, Q6은 보유 경험으로 별도 속성에 남는다.
- `목적자금 혼합형 · 적극항로형` 같은 복합 공식 명칭을 만들지 않는다.
- 상세 답변은 같은 대표 결과를 사용자의 상황에 맞는 말로 더 구체적으로 설명한다.
- 상세 결과의 펼침 영역에서는 기본 점수, 자금 상태, 설명 방식, 보유 경험을 구조화된 항목으로 다시 확인할 수 있다.

## 7. 자연어 결과 문장 생성 방식과 실제 예시

`src/components/diagnosis/diagnosis-presenter.ts`가 입력을 받아 다음 세 부분을 결정한다.

1. 대표 항로형 문장
2. Q4 자금 상태 문장
3. Q6 경험과 Q5 설명 수준을 연결한 안내 문장

UI는 presenter가 준 semantic segment를 렌더링할 뿐 점수나 분류를 계산하지 않는다. AI API와 무작위 문장 생성은 사용하지 않으므로 같은 입력에는 항상 같은 결과가 나온다.

입력 예시:

- Q1~Q3 총점: 6점
- 대표 결과: 적극항로형
- Q4: 두 번째 선택
- Q5: 첫 번째 선택
- Q6: 두 번째 선택

실제 생성 문장:

> 변동에도 계획을 이어가는 적극항로형이에요. 외화자산은 생활비와 일부 함께 관리하고 있으며, 관련 경험이 몇 차례 있어 앞으로는 핵심부터 쉽게 안내드릴게요.

이 presenter는 향후 AI 설명을 추가하더라도 실패 시 사용할 수 있는 고정 fallback 구조다.

## 8. 상세 어구에 적용한 색상·스타일 토큰

| 의미 | 토큰·표현 |
|---|---|
| 대표 항로형 | `var(--primary)`, `font-weight: 800` |
| Q4~Q6 상세 어구 | `var(--normal)`, `font-weight: 750` |
| 상세 어구 보조 구분 | `var(--normal-border)` 밑줄 |
| 키보드 포커스 | `var(--primary-border)` outline |

Q4~Q6은 하나의 secondary/info 계열만 사용한다. 의미 구분은 색뿐 아니라 `strong`, 굵기, 밑줄과 semantic `data-segment`에도 반영했다. 새 리터럴 hex, rgb, hsl 색상은 추가하지 않았다.

## 9. 마이페이지 정보 구조 변경

회원 마이페이지의 순서는 사용자 프로필 → 의사결정 프로필 → 기본 설명 설정 → 최근 알림 → 바로가기다.

- 의사결정 프로필은 대표 항로형과 자연어 요약을 먼저 보여준다.
- 상세 완료 시 연결형 Q4~Q6 문장을 같은 흐름으로 표시한다.
- 상태 Badge는 미측정, 간편 진단 완료, 상세 진단 진행 중, 상세 진단 완료를 구분한다.
- 서버 결과만 있을 때는 `서버 결과` Badge와 출처 설명을 붙이며 현재 세션 답변으로 합성하지 않는다.
- 기본 설정의 설명 분야는 금융·경제, 개발·기술, 마케팅·브랜드, 일상적인 설명으로 표시한다.
- 설명 수준은 핵심만 쉽게, 이유와 근거까지, 지표와 한계까지로 표시한다.
- `plain`, `simple`, `API 설정`, 환전 우대율 API 값, 서버 실효 스프레드는 사용자 설정에 표시하지 않는다.

## 10. 상세 결과 보기 화면의 진입·종료 방식

- 진입 URL: `/mypage/diagnosis`
- 진입 방법: 상세 진단 완료 화면의 `상세 결과 확인하기` 또는 마이페이지의 `상세 결과 보기`
- 화면 위치: 기존 앱 Shell과 사이드바·모바일 내비게이션 안의 마이페이지 탭
- 표시 내용: 대표 항로형, 요약, 연결형 상세 문장, 펼칠 수 있는 답변 반영 기준
- 제외한 요소: 초기 설정 헤더, 초기 설정 `3/3`, `초기 설정 마치기`
- `마이페이지로 돌아가기`: `/mypage`의 의사결정 프로필로 복귀
- `설정 변경`: `/mypage`의 설명 설정으로 복귀
- `다시 진단하기`: `/diagnosis/quick`에서 Q1부터 새로 시작
- 브라우저 History와 직접 URL 재진입은 `popstate`와 진단 라우팅 resolver로 동기화한다.
- 상세 완료 상태가 없는데 결과 URL을 열면 오류 대신 마이페이지에서 시작·재개하라는 빈 결과 안내를 표시한다.

## 11. 초기 설정값과 마이페이지 설정값 동기화 규칙

설명 설정 표시 우선순위는 필드별로 다음과 같다.

1. 현재 브라우저 세션에서 사용자가 선택하거나 마이페이지에서 변경한 값
2. 진행 중 또는 완료된 상세 진단 Q5 값
3. 기존 마이페이지 API가 반환한 서버 설정

설명 분야는 초기 설정 1단계 선택을 최초 로컬 값으로 사용한다. 설명 수준은 상세 Q5 답변을 최초 로컬 값으로 사용한다. 마이페이지에서 변경하면 같은 `sessionStorage` 설정 모듈에 기록한다.

로컬 진단 상태가 있으면 의사결정 프로필에는 현재 세션 결과를 우선 표시한다. 로컬 상태가 `unmeasured`일 때만 서버 위험성향을 `서버 결과`로 구분한다. 로컬 값을 서버에 저장했다고 표시하거나 두 출처를 하나의 서버 레코드로 병합하지 않는다.

## 12. 홈 진입 후 상세 진단 유도 애니메이션 흐름

1. 사용자가 간편 결과에서 `홈 시작하기`를 누른다.
2. 초기 설정 Shell과 진행률이 종료되고 홈 콘텐츠가 먼저 렌더링된다.
3. 일반 모션 환경에서는 350ms 뒤 배경을 약하게 가린 상세 진단 안내가 나타난다.
4. 안내 안의 Curve path가 760ms 동안 한 번 그려진다.
5. 모바일에서는 하단 sheet, 900px 이상에서는 중앙 dialog 형태로 보인다.
6. `지금 맞춤 설정하기`는 중복 클릭을 막고 `/diagnosis/detail`로 이동한다.
7. `나중에 할게요`는 곧바로 닫지 않고 마이페이지 재개 경로를 먼저 보여준다.
8. Escape, 닫기 버튼, 배경 클릭으로 닫을 수 있다.
9. 열릴 때 주 CTA로 포커스가 이동하고 닫힐 때 이전 포커스로 돌아간다.
10. reduced-motion에서는 350ms 지연과 진입·Curve 애니메이션을 제거하고 최종 상태를 즉시 표시한다.

## 13. 상태별 화면 동작

### 미측정

- 마이페이지에 진단 전 안내와 `간편 진단 시작`을 표시한다.
- `/mypage/diagnosis` 직접 진입 시 상세 결과 없음 안내를 표시한다.

### 간편 진단 완료

- 대표 항로형과 한 문장 요약을 표시한다.
- `상세 진단 시작`으로 Q4부터 진입한다.
- Q4~Q6이 없으므로 임의 상세 기본값을 만들지 않는다.

### 상세 진단 진행 중

- 대표 항로형은 유지하고 `상세 진단 진행 중`과 `진행 중` Badge를 표시한다.
- `상세 진단 이어서`는 첫 미응답 문항을 연다.
- 이전에 답한 문항으로 돌아가도 선택값을 유지한다.

### 상세 진단 완료

- 대표 항로형, 기본 요약, Q4~Q6 연결형 문장을 표시한다.
- `상세 결과 보기`와 `다시 진단`을 제공한다.
- 상세 결과의 펼침 영역에서 네 구조화 항목을 확인할 수 있다.

### 상세 진단 나중에 하기

- 홈 안내에서 미루면 마이페이지 재개 경로를 먼저 보여준다.
- 상세 문항을 시작하지 않았다면 상태는 간편 진단 완료로 유지된다.
- 한 문항 이상 답한 뒤 미루면 상세 진단 진행 중으로 저장된다.
- 마이페이지에서 첫 미응답 문항부터 이어갈 수 있다.

### 서버 결과만 존재

- 브라우저 임시 진단이 없고 서버 결과가 있을 때만 서버 결과를 별도로 표시한다.
- 알려진 값은 항로형 표시명으로 변환하고, 알 수 없는 값은 `기존 진단 결과`로 안전하게 표시한다.

## 14. 변경된 파일 전체 목록과 각 파일의 역할

아래 목록은 최종 작업 트리에 나타나는 변경·추가·이동 파일 전체를 기준으로 한다.

### 문서

| 파일 | 상태 | 역할 |
|---|---|---|
| `DIVURVE_DIAGNOSIS_UX_IMPLEMENTATION_REVIEW_GUIDE.md` | 추가 | 외부 검수자용 독립 인수인계 문서 |
| `docs/DIVURVE_DIAGNOSIS_UX_REVIEW_GUIDE.md` | 추가 | 저장소 내부 화면·데이터 검수 절차 |
| `docs/tech-changelog/0031-initial-setup-diagnosis-flow.md` | 추가 | 변경 이유, 영향, API 경계, 검증 기록 |
| `docs/tech-changelog/README.md` | 수정 | 0024 인덱스 등록 및 제목 동기화 |

### 앱과 라우팅

| 파일 | 상태 | 역할 |
|---|---|---|
| `src/app/app.tsx` | 수정 | 초기 설정, 홈 안내, 상세 진단, 전용 결과와 앱 Shell 연결 |
| `src/app/app.test.tsx` | 수정 | 회원·데모 분기, 홈 안내, History, 결과 화면 통합 테스트 |
| `src/app/diagnosis-routing.ts` | 추가 | 진단 입력·결과 URL을 회원 정책에 맞게 해석 |
| `src/app/diagnosis-routing.test.ts` | 추가 | 직접 접근과 회원·데모 라우팅 테스트 |
| `src/app/diagnosis-invite-timing.ts` | 추가 | 일반·reduced-motion 환경의 안내 지연 결정 |
| `src/hooks/use-tab-navigation.ts` | 수정 | 진단 결과 경로를 마이페이지 탭과 동기화 |
| `src/hooks/use-tab-navigation.test.ts` | 수정 | 결과 경로의 탭·History 동기화 테스트 |

### API 경계, 임시 저장, fixture

| 파일 | 상태 | 역할 |
|---|---|---|
| `src/api/asset-import.ts` | 추가 | 체험용 자산 fixture를 불러오는 교체 가능한 경계 |
| `src/api/asset-import.test.ts` | 추가 | mock import 결과와 `AssetSource` 검증 |
| `src/api/diagnosis-progress-store.ts` | 추가 | 진단 진행·결과의 sessionStorage 읽기·쓰기·초기화 |
| `src/api/diagnosis-progress-store.test.ts` | 추가 | 정상·빈 값·손상 값·저장 실패 경로 테스트 |
| `src/api/profile-preferences-store.ts` | 추가 | 설명 분야·설명 수준의 sessionStorage 경계 |
| `src/api/profile-preferences-store.test.ts` | 추가 | 값 검증, 우선순위 입력, 손상 데이터 처리 테스트 |
| `src/api/fixtures/xray-dashboard.ts` | 추가 | 자산 불러오기와 X-Ray가 공유하는 체험 데이터 |
| `src/screens/xray/use-xray.ts` | 수정 | 중복 fixture 대신 공용 X-Ray fixture 사용 |

### 공통 진단 컴포넌트

| 파일 | 상태 | 역할 |
|---|---|---|
| `src/components/diagnosis/diagnosis-presenter.ts` | 추가 | 항로형 표시, 한국어 설정 라벨, 연결형 상세 문장 생성 |
| `src/components/diagnosis/diagnosis-presenter.test.ts` | 추가 | 명칭, 모든 문장 조합, raw enum 비노출 검증 |
| `src/components/diagnosis/diagnosis-narrative.tsx` | 추가 | 대표 항로형과 상세 어구를 semantic span으로 렌더링 |
| `src/components/diagnosis/diagnosis-narrative.css` | 추가 | primary·secondary 강조와 모바일 줄바꿈 스타일 |
| `src/components/diagnosis/diagnosis-narrative.test.tsx` | 추가 | 대표·상세 segment 구분 테스트 |
| `src/components/diagnosis/diagnosis-status-copy.ts` | 추가 | 진단 상태별 사용자 문구와 CTA 결정 |
| `src/components/diagnosis/diagnosis-status-card.tsx` | 추가 | 마이페이지 의사결정 프로필 상태 UI |
| `src/components/diagnosis/diagnosis-status-card.css` | 추가 | 상태 카드, 버튼, 반응형·포커스 스타일 |
| `src/components/diagnosis/diagnosis-status-card.test.tsx` | 추가 | 미측정·간편·진행·완료·서버 결과 상태 테스트 |
| `src/components/diagnosis/detailed-diagnosis-invite.tsx` | 추가 | 홈 위 상세 진단 안내, 연기 경로, 포커스·Escape 처리 |
| `src/components/diagnosis/detailed-diagnosis-invite.css` | 추가 | Curve draw, sheet/dialog, reduced-motion 스타일 |
| `src/components/diagnosis/detailed-diagnosis-invite.test.tsx` | 추가 | 시작 1회, 연기, 닫기, 키보드·포커스 테스트 |

### 초기 설정·진단 입력

| 파일 | 상태 | 역할 |
|---|---|---|
| `src/screens/initial-setup/initial-setup-screen.tsx` | 수정 | entry mode를 받는 초기 설정 container |
| `src/screens/initial-setup/initial-setup-screen.css` | 수정 | 단일 판단 레이아웃, 질문·결과·모바일·모션 스타일 |
| `src/screens/initial-setup/initial-setup-screen.test.tsx` | 수정 | 자산, Q1~Q6, 결과, 재계산, 재개, 모바일·모션 흐름 테스트 |
| `src/screens/initial-setup/use-initial-setup.ts` | 수정 | 입력 상태, 이동, 계산 호출, 저장, 연기·재개 제어 |
| `src/screens/initial-setup/use-initial-setup.test.ts` | 수정 | skip, 뒤로 이동, 무응답 연기와 상태 보존 테스트 |
| `src/screens/initial-setup/initial-setup-state.ts` | 추가 | controller 초기 상태와 순수 상태 변환 helper |
| `src/screens/initial-setup/initial-setup-state.test.ts` | 추가 | skip·완료 답변·첫 미응답·entry mode 테스트 |
| `src/screens/initial-setup/initial-setup-view.tsx` | 수정 | 상위 3단계와 별도 상세 진행률, CTA 표현 |
| `src/screens/initial-setup/initial-setup-steps.tsx` | 수정 | 목적별 하위 step 재export 및 결과 연결 |
| `src/screens/initial-setup/explanation-domain-step.tsx` | 추가 | 네 가지 설명 분야 선택 UI |
| `src/screens/initial-setup/asset-import-step.tsx` | 추가 | 자산 불러오기 상태와 체험 데이터 요약 UI |
| `src/screens/initial-setup/diagnosis-question-step.tsx` | 추가 | Q1~Q6 공용 단일 질문 UI |
| `src/screens/initial-setup/diagnosis-result-steps.tsx` | 추가 | 간편·상세 결과의 단계별 콘텐츠 |
| `src/screens/initial-setup/risk-diagnosis-questions.ts` | 추가 | 확정 Q1~Q6 문구와 선택지 fixture |
| `src/screens/initial-setup/risk-diagnosis.ts` | 추가 | Q1~Q3 점수와 항로형 판정 순수 함수 |
| `src/screens/initial-setup/risk-diagnosis.test.ts` | 추가 | 0~9점, 네 구간, 2/3·4/5·6/7 경계 테스트 |
| `src/screens/initial-setup/detailed-diagnosis.ts` | 추가 | Q4~Q6 구조화 설명 변환 adapter |
| `src/screens/initial-setup/detailed-diagnosis.test.ts` | 추가 | 상세 라벨과 대표 점수 불변 테스트 |
| `src/screens/initial-setup/initial-setup-types.ts` | 삭제·이동 | 기존 타입 모듈 경로를 순수 선언 파일로 이동 |
| `src/screens/initial-setup/initial-setup-types.d.ts` | 추가·이동 | 초기 설정 상태·action·submission 타입 선언 |

### 마이페이지

| 파일 | 상태 | 역할 |
|---|---|---|
| `src/screens/mypage/mypage-api-screen.tsx` | 수정 | 서버 조회 결과와 로컬 진단·설명 설정을 출처별 표시 |
| `src/screens/mypage/mypage-api-screen.css` | 추가 | 회원 마이페이지 설정·링크 반응형 스타일 |
| `src/screens/mypage/mypage-api-screen.test.tsx` | 수정 | 상태, 한국어 설정, 로컬 우선순위, raw enum 비노출 테스트 |
| `src/screens/mypage/mypage-profile-presenter.ts` | 추가 | 로컬·Q5·서버 설정 우선순위와 서버 결과 매핑 |
| `src/screens/mypage/mypage-profile-presenter.test.ts` | 추가 | 모든 상태·라벨·fallback 조합 테스트 |
| `src/screens/mypage/profile-explanation-settings.tsx` | 추가 | 설명 분야·수준 확인 및 세션 변경 UI |
| `src/screens/mypage/diagnosis-result-screen.tsx` | 추가 | 초기 설정 Shell과 분리된 읽기 전용 상세 결과 |
| `src/screens/mypage/diagnosis-result-screen.css` | 추가 | 결과 Curve, 정보 위계, 모바일·reduced-motion 스타일 |
| `src/screens/mypage/diagnosis-result-screen.test.tsx` | 추가 | 완료·빈 결과, 세 동작, 초기 설정 문구 부재 테스트 |
| `src/screens/mypage/mypage-screen.tsx` | 수정 | 회원용 진단 callback 연결과 데모 개발자 설정 정리 |
| `src/screens/mypage/mypage-screen.test.tsx` | 수정 | 회원·데모 분기와 항로형 명칭 회귀 테스트 |
| `src/screens/mypage/use-mypage.ts` | 수정 | 데모 위험성향 표시명을 항로형으로 통일 |

### 타입

| 파일 | 상태 | 역할 |
|---|---|---|
| `src/types/diagnosis.ts` | 추가 | Q1~Q6 답변, 결과, 진단 progress discriminated union |
| `src/types/assets.ts` | 추가 | 계정 종류와 분리된 자산 출처·요약 타입 |
| `src/types/mypage.ts` | 수정 | 마이페이지 위험성향·설정 표시 타입 정리 |

## 15. 추가·수정한 테스트 목록

- 순수 계산: 네 점수 구간, 최소·최대, 2/3·4/5·6/7 경계, 답변 근거
- 상세 불변성: Q4~Q6와 설명 분야가 Q1~Q3 점수·대표 항로형을 바꾸지 않음
- 문장 presenter: 점(`·`)이나 raw enum 단순 연결 금지, 실제 자연어 예시, 모든 선택 조합
- semantic UI: 대표 항로형과 상세 어구의 서로 다른 `data-segment`
- 자산 불러오기: 성공, 오류·재시도, 건너뛰기, 임의 기본값 없음
- 초기 설정: 한 화면 한 단계, 이전·다음, 답변 유지·변경 재계산, 간편 결과 후 홈 CTA
- 상세 진단: 별도 진행률, 즉시 시작, 나중에 하기, Q4부터 시작, 첫 미응답 재개
- 저장 모듈: 빈 값, 정상 값, 손상 JSON, 잘못된 enum, 저장소 예외
- 마이페이지: 미측정, 간편 완료, 상세 진행 중, 상세 완료, 서버 결과만 존재
- 설정 표시: 초기 설명 분야와 Q5 수준 반영, 한국어 라벨, 로컬→Q5→서버 우선순위
- 전용 결과: 초기 설정 Shell·완료 CTA 부재, 마이페이지 복귀·설정 변경·재진단
- 홈 안내: 홈 선표시, 한 번만 표시, 중복 시작 차단, 연기 경로, Escape·배경 닫기, 포커스 복원
- 라우팅: 회원 `onboarded` 전후, 데모 우회, 직접 URL, 새로고침 초기 상태, History 동기화
- 접근성·반응형: reduced-motion 최종 상태, 키보드 버튼 동작, 360px 주요 요소와 overflow 규칙
- 전체 기존 테스트: Auth, Home, Planner, X-Ray, Forecast, 공통 레이아웃·컴포넌트 회귀

## 16. 자동 검증 명령별 실제 결과

| 명령 | 종료 상태 | 실제 결과 |
|---|---:|---|
| `npx tsc --noEmit` | 0 | TypeScript 오류 없음 |
| `npm run lint` | 0 | ESLint 오류 0개, 기존 Fast Refresh 경고 9개 |
| `npm run test` | 0 | 74개 테스트 파일, 469개 테스트 통과 |
| `npm run test -- --coverage` | 0 | 74개 파일, 469개 테스트 통과, 전 지표 100% |
| `npm run build` | 0 | 740개 모듈 변환, production build 성공 |
| `git diff --check` | 0 | 공백 오류 없음, Windows LF→CRLF 안내만 출력 |
| 신규 코드 리터럴 색상 검색 | 해당 없음 | 새 hex/rgb/hsl 없음 |
| 신규 코드 명시적 `any` 검색 | 해당 없음 | 명시적 `any` 없음 |

공통으로 npm의 `Unknown env config "min-release-age"` 안내가 출력됐다. 린트의 9개 `react-refresh/only-export-components` 경고와 빌드의 500kB 초과 청크 경고는 이번 변경으로 새로 생긴 실패가 아니다. 최종 검증을 막는 오류는 없다.

## 17. 전체 테스트 개수와 커버리지

- 테스트 파일: **74개 통과 / 74개**
- 테스트 케이스: **469개 통과 / 469개**
- Statements: **100%**
- Branches: **100%**
- Functions: **100%**
- Lines: **100%**

커버리지는 생성 API와 부트스트랩 등 저장소 설정상 제외 대상을 제외한 전체 측정 대상 기준이다.

## 18. 데스크톱·모바일 화면 수동 검수 절차

### 실행

```powershell
cd C:\Users\Administrator\Desktop\git\divurve-web
npm run dev
```

Vite가 출력한 로컬 주소를 브라우저에서 연다. `node_modules`가 없는 환경에서만 먼저 `npm install`을 실행한다. 새 패키지는 추가되지 않았다.

### 데스크톱 1440px

1. `onboarded=false`인 회원 계정으로 로그인한다.
2. 설명 분야 네 항목이 한국어로 보이고 한 단계만 표시되는지 확인한다.
3. `자산 불러오기`의 로딩, 체험용 데이터 안내, 요약을 확인한다.
4. 건너뛰기를 별도 세션에서 선택해 임의 자산 기본값이 생기지 않는지 확인한다.
5. Q1~Q3을 한 문항씩 답하고 이전 이동 시 선택이 유지되는지 확인한다.
6. C/C/C 선택 시 `적극항로형` 결과와 MVP 참고 진단 고지를 확인한다.
7. `홈 시작하기` 후 홈이 먼저 표시되고 상세 안내가 한 번 나타나는지 확인한다.
8. 안내를 Escape로 닫고 다시 자동 표시되지 않는지 확인한다.
9. 다시 흐름을 준비해 `나중에 할게요` 후 마이페이지 경로 안내를 확인한다.
10. `지금 맞춤 설정하기` 후 Q4 B, Q5 A, Q6 B를 선택한다.
11. `상세 진단 1/3`~`3/3`만 보이고 초기 설정 `3/3`이 없는지 확인한다.
12. 상세 완료 결과의 자연어 문장과 대표·상세 강조 차이를 확인한다.
13. 마이페이지에서 `상세 진단 완료`, `적극항로형`, 자연어 요약과 한국어 설정값을 확인한다.
14. `상세 결과 보기`에서 앱 레이아웃은 유지되고 초기 설정 Shell은 없는지 확인한다.
15. 마이페이지 복귀, 설정 변경, 다시 진단하기를 각각 확인한다.
16. Q4만 답하고 `나중에 이어서` 후 마이페이지에서 Q5부터 재개되는지 확인한다.
17. `/mypage/diagnosis` 새로고침과 브라우저 뒤로 가기를 확인한다.
18. 데모 진입 시 `/initial-setup` 또는 `/diagnosis/detail`로 강제되지 않는지 확인한다.

### 모바일 390px과 360px

1. 개발자 도구에서 폭 390px, 이어서 360px로 바꾼다.
2. 모든 단계에서 문서 전체 가로 스크롤이 생기지 않는지 확인한다.
3. 질문 선택 카드 전체가 눌리고 이전·다음·건너뛰기 버튼이 겹치지 않는지 확인한다.
4. 홈 안내가 하단 sheet로 보이고 하단 내비게이션과 CTA를 사용할 수 있는지 확인한다.
5. 연결형 결과 문장이 자연스럽게 줄바꿈되고 강조 어구가 잘리지 않는지 확인한다.
6. 상세 결과의 답변 기준이 한 열로 바뀌고 세 동작 버튼이 세로로 보이는지 확인한다.
7. 모션 감소를 켜고 화면을 다시 열어 지연·Curve draw 없이 핵심 정보와 CTA가 즉시 보이는지 확인한다.
8. 키보드 Tab, Shift+Tab, Enter, Space, Escape 동작과 focus-visible을 확인한다.

## 19. 각 검수 단계의 기대 화면과 문구

| 검수 지점 | 기대 화면·문구 |
|---|---|
| 초기 설정 1단계 | `어떤 분야의 설명이 가장 익숙한가요?`, 네 한국어 선택지 |
| 자산 불러오기 | `보유 자산을 불러올까요?`, `자산 불러오기`, `체험용 데이터` |
| 간편 진단 | `간편 위험성향 진단`, 질문 한 개, A~D 선택지 |
| 간편 결과 | `현재 결과는 [항로형]이에요`, 근거, MVP 참고 진단 안내 |
| 초기 설정 종료 | `홈 시작하기` |
| 홈 상세 안내 | `3문항만 더 답하면`, `지금 맞춤 설정하기`, `나중에 할게요` |
| 연기 안내 | `마이페이지 → 의사결정 프로필에서 언제든 이어갈 수 있어요.` |
| 상세 입력 | `상세 진단 1 / 3`부터 `3 / 3`, Q4~Q6 한 문항씩 |
| 상세 결과 | 대표 항로형, 연결형 세 문장, `답변 반영 기준 보기` |
| 마이페이지 완료 | `상세 진단 완료`, 대표 항로형, 자연어 상세 요약 |
| 전용 결과 | `마이페이지로 돌아가기`, `설정 변경`, `다시 진단하기` |

전용 결과에서는 `초기 설정`, 초기 설정 진행률, `초기 설정 마치기`가 보여서는 안 된다. 사용자 설정에는 `simple`, `plain`, `API 설정`, `서버 실효 스프레드`가 보여서는 안 된다.

## 20. 아직 MOCK 또는 sessionStorage인 부분

- 자산 불러오기는 공용 X-Ray 체험 fixture를 사용하는 `mock_import`다.
- 진단 진행·결과는 `sessionStorage` 키 `divurve_initial_setup_diagnosis_progress`에 저장한다.
- 설명 분야·수준은 `sessionStorage` 키 `divurve.profile-explanation-preferences.v1`에 저장한다.
- 결과 문장은 실제 AI가 아닌 결정론적 템플릿 presenter가 만든다.
- 홈 상세 안내를 이미 보여줬는지는 React UI 상태로만 제어하며 영구 저장하지 않는다.

사용자 화면은 자산을 실제 금융기관에서 연결했다고 표현하지 않는다. 개발자용 `MOCK · 실제 연결 아님` 대신 `체험용 데이터`로 안내한다.

## 21. 백엔드 API가 추가되어야 하는 부분

- 초기 설정 제출과 `onboarded=true` 갱신 API
- 설명 분야와 설명 수준 조회·저장 API의 확정 계약
- Q1~Q6 답변, 점수, 대표 유형, 상세 설명 속성의 저장·조회 API
- 상세 진단 진행 중 문항별 임시 저장과 기기 간 재개 API
- 실제 마이데이터 또는 금융기관 자산 연결 API
- 자산 출처 `manual`, `mydata`를 포함한 서버 데이터 모델
- 서버 위험성향 enum과 사용자 표시명에 대한 공식 매핑 계약

이 API들이 Swagger에 추가되기 전에는 임의 endpoint를 만들거나 호출하지 않는다.

## 22. 알려진 제한사항과 남은 문제

- 브라우저 탭 세션이 끝나면 진단과 설명 설정 임시 값이 사라진다.
- 다른 브라우저·기기와 진단 진행을 동기화하지 못한다.
- 프론트 완료만으로 서버 세션의 `onboarded` 값이 바뀌지 않는다.
- 자산 요약은 실제 보유 자산이 아니다.
- 결정론적 문장은 사용자의 자유 입력 맥락을 반영하지 않는다.
- 실제 Chrome 1440px·390px·360px의 최종 육안 판정은 이번 자동 검증에 포함하지 않았으며 18장의 절차로 사용자가 확인해야 한다.
- ESLint에는 기존 Fast Refresh 경고 9개가 남아 있다.
- production build에는 기존 500kB 초과 청크 경고가 남아 있다. 최종 JS 출력은 약 786.44kB, gzip 약 223.13kB였다.
- 이번 범위에서 수정한 마이페이지와 신규 진단 스타일은 기존 CSS 색상·그림자 토큰만 사용한다.

## 23. `git diff --stat`

`git diff --stat`은 Git이 추적 중인 수정·삭제 파일만 집계하며 아직 추적되지 않은 신규 파일은 포함하지 않는다.

```text
 docs/tech-changelog/README.md                      |   3 +
 src/app/app.test.tsx                               | 244 +++++++++++-
 src/app/app.tsx                                    | 210 +++++++++-
 src/hooks/use-tab-navigation.test.ts               |   1 +
 src/hooks/use-tab-navigation.ts                    |   1 +
 src/screens/initial-setup/initial-setup-screen.css | 438 ++++++++++++++++++++-
 .../initial-setup/initial-setup-screen.test.tsx    | 261 +++++++++---
 src/screens/initial-setup/initial-setup-screen.tsx |  19 +-
 src/screens/initial-setup/initial-setup-steps.tsx  | 153 +------
 src/screens/initial-setup/initial-setup-types.ts   |  46 ---
 src/screens/initial-setup/initial-setup-view.tsx   | 243 +++++++++---
 .../initial-setup/use-initial-setup.test.ts        | 110 ++++--
 src/screens/initial-setup/use-initial-setup.ts     | 431 ++++++++++++++++----
 src/screens/mypage/mypage-api-screen.test.tsx      | 173 +++++---
 src/screens/mypage/mypage-api-screen.tsx           | 212 ++++------
 src/screens/mypage/mypage-screen.test.tsx          |  32 +-
 src/screens/mypage/mypage-screen.tsx               |  91 +----
 src/screens/mypage/use-mypage.ts                   |   9 +-
 src/screens/xray/use-xray.ts                       | 102 +----
 src/types/mypage.ts                                |  16 +-
 20 files changed, 1999 insertions(+), 796 deletions(-)
```

## 24. `git status --short --branch`

아래 상태에는 기존부터 이어온 커밋 전 구현과 이번 검수 문서가 모두 포함된다.

```text
## feat/initial-setup-diagnosis-flow
 M docs/tech-changelog/README.md
 M src/app/app.test.tsx
 M src/app/app.tsx
 M src/hooks/use-tab-navigation.test.ts
 M src/hooks/use-tab-navigation.ts
 M src/screens/initial-setup/initial-setup-screen.css
 M src/screens/initial-setup/initial-setup-screen.test.tsx
 M src/screens/initial-setup/initial-setup-screen.tsx
 M src/screens/initial-setup/initial-setup-steps.tsx
 D src/screens/initial-setup/initial-setup-types.ts
 M src/screens/initial-setup/initial-setup-view.tsx
 M src/screens/initial-setup/use-initial-setup.test.ts
 M src/screens/initial-setup/use-initial-setup.ts
 M src/screens/mypage/mypage-api-screen.test.tsx
 M src/screens/mypage/mypage-api-screen.tsx
 M src/screens/mypage/mypage-screen.test.tsx
 M src/screens/mypage/mypage-screen.tsx
 M src/screens/mypage/use-mypage.ts
 M src/screens/xray/use-xray.ts
 M src/types/mypage.ts
?? DIVURVE_DIAGNOSIS_UX_IMPLEMENTATION_REVIEW_GUIDE.md
?? docs/DIVURVE_DIAGNOSIS_UX_REVIEW_GUIDE.md
?? docs/tech-changelog/0031-initial-setup-diagnosis-flow.md
?? src/api/asset-import.test.ts
?? src/api/asset-import.ts
?? src/api/diagnosis-progress-store.test.ts
?? src/api/diagnosis-progress-store.ts
?? src/api/fixtures/xray-dashboard.ts
?? src/api/profile-preferences-store.test.ts
?? src/api/profile-preferences-store.ts
?? src/app/diagnosis-invite-timing.ts
?? src/app/diagnosis-routing.test.ts
?? src/app/diagnosis-routing.ts
?? src/components/diagnosis/
?? src/screens/initial-setup/asset-import-step.tsx
?? src/screens/initial-setup/detailed-diagnosis.test.ts
?? src/screens/initial-setup/detailed-diagnosis.ts
?? src/screens/initial-setup/diagnosis-question-step.tsx
?? src/screens/initial-setup/diagnosis-result-steps.tsx
?? src/screens/initial-setup/explanation-domain-step.tsx
?? src/screens/initial-setup/initial-setup-state.test.ts
?? src/screens/initial-setup/initial-setup-state.ts
?? src/screens/initial-setup/initial-setup-types.d.ts
?? src/screens/initial-setup/risk-diagnosis-questions.ts
?? src/screens/initial-setup/risk-diagnosis.test.ts
?? src/screens/initial-setup/risk-diagnosis.ts
?? src/screens/mypage/diagnosis-result-screen.css
?? src/screens/mypage/diagnosis-result-screen.test.tsx
?? src/screens/mypage/diagnosis-result-screen.tsx
?? src/screens/mypage/mypage-api-screen.css
?? src/screens/mypage/mypage-profile-presenter.test.ts
?? src/screens/mypage/mypage-profile-presenter.ts
?? src/screens/mypage/profile-explanation-settings.tsx
?? src/types/assets.ts
?? src/types/diagnosis.ts
```

## 25. 커밋과 push 수행 여부

이번 작업에서는 **commit, push, merge를 수행하지 않았다.** 사용자가 위 자동 결과와 수동 화면 검수를 확인한 뒤 직접 Git 작업을 진행할 수 있도록 현재 작업 트리를 그대로 유지했다.
