# 0034. 온보딩 2단계 보유 자산을 X-Ray 응답으로 표시

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-07 |
| 작성자 | Claude (Opus 5) |
| 변경 유형 | feat |
| 영향 범위 | 화면(초기 설정 2단계) / API(`GET /api/v1/xray`) / 상태(초기 설정 훅) |
| 관련 브랜치 | feat/onboarding-asset-xray |
| 관련 커밋 | 3270f31 |
| 관련 이슈·PR | #33 · 백엔드 fx-hunters/divurve-api#110 (이슈 fx-hunters/divurve-api#108) |

## 변경 사유 (Why)
온보딩 2단계 "보유 자산" 화면이 프론트 fixture에 박아 둔 수치(외화 64,000,000원 / 원화 36,000,000원 / USD·JPY·EUR)를 보여주고 있었다. 백엔드가 계정 생성 시점에 자산을 시드하도록 바뀌면서(fx-hunters/divurve-api#110) 화면이 표시하던 값과 계정에 실제로 들어 있는 값이 어긋나게 됐다. 같은 자산을 X-Ray 화면은 API에서, 온보딩은 fixture에서 읽는 상태를 남겨 둘 수 없다.

또한 이 단계의 "자산 불러오기" 버튼은 대응하는 백엔드 액션이 없다. 자산은 가입·둘러보기 시점에 이미 채워져 있어 화면이 할 일은 조회뿐이므로, 존재하지 않는 연결 동작을 흉내 내는 UI를 걷어냈다.

## 변경 내용 (What)
- `api/fixtures/initial-setup-assets.ts`(하드코딩 fixture) 삭제. `api/asset-import.ts`는 `fetchImportedAssetSummary()`로 바뀌어 `GET /api/v1/xray`를 조회한다.
- `api/xray.ts`에 `fetchXrayOverview()`를 추가했다. 개요 단독 조회와 `fetchXrayBundle()`이 같은 호출을 공유한다.
- `types/assets.ts`의 `ImportedAssetSummary`를 포맷된 문자열 묶음에서 응답 값 그대로인 숫자·배열(`fxAssetKrw`, `krwAssetKrw`, `currencyCodes`, `asOf`)로 바꿨다. 표시 문구는 새 `screens/initial-setup/asset-import-presenter.ts`가 만든다.
- 자산 단계 진입 시 훅이 스스로 조회한다("자산 불러오기" 버튼 제거). 화면은 로딩 → 결과 / 실패(다시 시도) 상태를 렌더한다.
- "체험용 데이터" 배지는 MVP 동안 항상 표시한다(이슈 #33의 선택지 (a)).

## 영향 / 리스크
- 외화 금액은 조회 시점 환율로 계산돼 매번 달라진다. 화면·테스트 어디에도 특정 금액을 전제하지 않는다. 원화 자산만 36,000,000원으로 고정된다.
- `exposure`는 빈 배열일 수 있어(FR-CM-09) 길이를 가정하지 않는다. 비어 있으면 "보유한 외화 없음"으로 표시한다.
- 배지 판정에 `meta.is_demo`를 쓰지 않는다. 둘러보기 계정에서만 `true`라 샘플 자산을 가진 일반 가입 계정에서는 배지가 사라지기 때문이다. 실연동(fx-hunters/divurve-api#109)이 도착하면 조건부 표시로 전환한다.
- `onboarded`는 자산이 채워져 있어도 `false`다. 이번 변경은 온보딩 건너뛰기 조건을 건드리지 않는다.
- 조회에 실패하면 다음 단계로 진행할 수 없고(기존 규칙 유지) 다시 시도하거나 건너뛸 수 있다.

## 검증
- [x] 테스트 통과 + 커버리지 100% (`npm run lint`, `npm run build`, `npm run test -- --coverage`)
- [x] 자산 단계 자동 조회·중복 요청 차단·되돌아왔을 때 재조회 없음, 실패 후 재시도, 기준 시각 없음, 외화 없음 경로를 테스트로 확인

## 롤백 방법
이 변경의 커밋을 revert한다. fixture(`api/fixtures/initial-setup-assets.ts`)와 "자산 불러오기" 버튼이 함께 되살아나며, 다른 화면의 X-Ray 조회에는 영향이 없다.
