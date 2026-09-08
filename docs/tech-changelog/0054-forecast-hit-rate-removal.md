# 0054. 전망 화면에서 모델 '적중률' 표시를 걷어낸다

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | Claude Opus 5 (fix/forecast-hit-rate) |
| 변경 유형 | fix |
| 영향 범위 | 화면(전망) / API 타입 |
| 관련 브랜치 | fix/forecast-hit-rate |
| 관련 커밋 | (커밋 후 기입) |
| 관련 이슈·PR | #58 / 백엔드 fx-hunters/divurve-api#90 · PR #147 |

## 변경 사유 (Why)

백엔드가 `GET /forecast/model-performance` 응답에서 `hit_rate` 를 `model`·`random_walk`
양쪽 모두 제거했다(divurve-api#90, PR #147 — 2026-09-08 05:22 UTC 머지·배포 완료).

지표를 없앤 이유는 계산 버그가 아니다. 이 모델은 드리프트가 0 이라 점예측이 언제나
기준값과 같고, 그래서 **방향 적중률이 구조적으로 항상 0** 이 된다. 지표 자체가
성립하지 않는데 화면은 사용자에게 "적중률 0%" 라는 거짓을 보여주고 있었다.

**이 변경은 대기 건이 아니라 이미 터진 사고의 수습이다.** 백엔드가 먼저 배포된
상태라 `performance.model.hitRate` 가 `undefined` 로 도착하고,
`toPercent(undefined)` 가 `NaN` 을 만들어 전망 화면에 **`NaN%` 가 실제로 렌더되고
있었다.** 백엔드는 전역 `default-property-inclusion: non_null` 이라 값이 없으면
키가 통째로 사라진다 — "필드가 없다"와 "값이 null 이다"가 같은 뜻이다.

배포본 실제 응답으로 확인:

```
GET /api/v1/forecast/model-performance?pair_code=USDKRW&horizon_days=30
{"data":{"pair_code":"USDKRW","horizon_days":30,
  "model":{"mae":0.0338...,"avg_width":0.0717...,"coverage_80":0.5833...},
  "random_walk":{"mae":0.0338...},
  "rw_improvement":0.0, ...}}
```

## 변경 내용 (What)

- `ModelPerformanceResponse` 의 `model.hitRate` · `randomWalk.hitRate` 제거. 다시
  넣지 않도록 사유를 주석으로 박았다.
- `ModelPerformanceScore.hitRatePct` 제거, `toModelScore()` 의 매핑 한 줄 제거.
- 전망 화면 성적표에서 '적중률' 행 삭제. 남는 행은 평균 오차율 · 포함률(80%) ·
  랜덤워크 대비 개선율이다.
- 픽스처·테스트에서 `hitRate` 제거. 성적표 미제공(`performance: null`) 케이스의
  "행이 안 보인다" 단언은 사라진 '적중률' 대신 **'평균 오차율'** 로 옮겼다 —
  없어진 라벨로 단언하면 언제나 통과해 검증력이 사라진다.

## 영향 / 리스크

- **`mae` · `coverage_80` · `avg_width` · `rw_improvement` 는 키도 값도 그대로다.**
  사라지는 것은 `hit_rate` 둘뿐이다.
- ⚠️ **`/v3/api-docs` 스펙이 배포본보다 낡았다.** 스펙의 `Model`·`RandomWalk` 에는
  아직 `hitRate` 가 남아 있으나 실제 응답에는 없다. 이 건에 한해 "스펙이 맞다"
  규칙이 뒤집히므로, 스펙만 보고 되돌리면 안 된다. 판단 기준은 실제 응답이다.
- 또한 스펙의 property 명이 camelCase(`hitRate`·`avgWidth`)로 찍혀 있는 것은 Java
  필드명이 그대로 노출된 것이고, 실제 직렬화는 snake_case 다(`avg_width`).
  스키마만 보고 JSON 키를 추정하지 말 것 — 변환은 `api/client.ts` 경계에서 한다(§4).

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 성적표 '적중률' 행 | `NaN%` (백엔드 배포 후) / `0%` (그 전) | 행 자체 없음 |
| 성적표 행 수 | 4 | 3 |

## 곁다리 정리 — 픽스처 점검 (§7 보이스카웃)

이 파일(`src/test/api-fixtures.ts`)의 같은 `performance` 블록을 만진 김에 실물 응답과
전수 대조했다. **서버가 보내지 않는 값 하나를 찾아 고쳤다:**

| 필드 | 픽스처(전) | 실물·스펙(후) |
|---|---|---|
| `validation.method` | `"walk-forward"` | `"rolling_walk_forward"` |

스펙의 `Validation.method` enum 은 `["rolling_walk_forward"]` 하나뿐이고 배포본 응답도
같다. 프론트가 이 필드를 어디서도 읽지 않아 화면 영향은 없었지만, 픽스처가 서버를
잘못 흉내 내면 그 위에 쌓은 테스트의 초록불이 근거가 되지 못한다.

대조했으나 **고치지 않은 것**도 남긴다. 같은 픽스처의 `direction: "BEARISH"` 는 소문자
`bullish`·`neutral` 과 섞여 있어 의심스러웠지만, `forecast-presenter.ts` 의
`directionType()` 이 `toLowerCase()` 로 받으므로 대소문자 무관성을 노린 의도적 값이다.
스펙에 `direction` enum 이 없고 배포본의 `factors` 가 현재 빈 배열이라 서버의 실제
표기를 관찰할 수 없다 — 단정할 근거가 없어 그대로 둔다.

## 검증

- [x] 테스트 통과 + 커버리지 100%
- [x] `npm run lint` 0 errors
- [x] `npm run build` (tsc --noEmit 포함) 성공
- [x] 배포 API 실제 응답으로 `hit_rate` 부재 확인

## 롤백 방법

이 커밋을 revert 하면 이전 타입·표시가 그대로 돌아온다. 다만 백엔드가 값을 보내지
않으므로 **되돌리면 `NaN%` 가 다시 화면에 뜬다.** 롤백은 백엔드가 `hit_rate` 를
복원하는 경우에만 의미가 있다.
