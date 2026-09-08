# 0043. 환율 전망 컨트롤 정리 — 통화쌍 드롭다운·전망 기간 라벨 명확화·AI 자연어 설명 연결

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | Claude (AI Agent) |
| 변경 유형 | feat / fix / ui |
| 영향 범위 | 화면(환율 전망), API 요청 파라미터, 화면 상태 |
| 관련 브랜치 | feat/forecast-controls (베이스: chore/ui-overhaul-integration) |
| 관련 커밋 | (커밋 후 기입) |
| 관련 이슈·PR | #45 / 후속 선행조건: fx-hunters/divurve-api#121 |

## 변경 사유 (Why)

세 가지 요구가 한 화면에 모여 있었다.

1. **통화 선택이 목록이 아니었다.** 통화 3종이 토글 버튼으로 나열돼 있어 선택지가 늘어나면 컨트롤 바가 그대로 밀린다. 게다가 버튼이 내보내는 값은 통화 코드(`USD`)였고 화면이 임의로 `USD_KRW`를 조립하고 있었다 — 백엔드
   `ForecastController`가 광고하는 통화쌍은 `USDKRW` · `USDJPY` · `EURUSD` 세 쌍이고,
   `JPY_KRW` · `EUR_KRW`는 스펙에 없는 쌍이다. 즉 UI 형태만이 아니라 **보내던 값 자체가 계약과 어긋나 있었다.**

2. **기간 선택이 무엇에 대한 기간인지 알 수 없었다.** `30D` · `90D` 라는 토글만 있어, 과거 조회 구간인지 앞으로의 구간인지 화면이 말해 주지 않았다. 사용자 피드백의 핵심이 이 지점이다.

3. **팬 차트에 자연어 설명이 없었다.** 범위·변동성 수치는 있는데 그 수치가 무엇을 뜻하는지는 화면 밖에 있었다. 공통 이슈 I3의 `useAiExplanation` · `AiExplanation` 이 머지돼 붙일 수 있게 됐다.

또한 국면(`regime`) 어휘가 백엔드와 갈라져 있었다. 프론트는 `high` · `extreme` 을 경고 조건으로 보고 있었지만 백엔드 `Regime.code()`가 내보내는 값은 `calm` · `normal` · `elevated` · `stress` 네 가지다. 즉 **어떤 국면에서도 경고 톤이 켜지지 않는 상태**였다. AI 설명 응답 `meta.regime`으로 국면 배지를 새로 그리는 김에 어휘를 백엔드 기준으로 통일했다.

## 변경 내용 (What)

- **통화쌍 드롭다운** — 토글 버튼 3개를 `<label>` + 네이티브 `<select>` 로 교체. 선택지는 `USDKRW` · `USDJPY` · `EURUSD`(표시는 `USD/KRW` 형태), 요청에는 명세 표기 코드를 그대로 싣는다. 선택 상태는 화면 로컬 상태로 둔다(§7.5).
- **전망 기간 라벨** — 컨트롤을 `role="group" aria-label="전망 기간"` 으로 묶고, 선택지 문구를 `30D` → **"향후 30일"**, `90D` → **"향후 90일"** 로 바꿨다. 그 아래 보조 설명 한 줄을 `aria-describedby` 로 연결한다: *"선택한 기간만큼 앞으로의 환율 범위를 팬 차트와 요약 카드에 표시합니다."* 요약 카드 제목도 `80% 범위 (향후 30일)` 로 따라간다.
- **선택지 확장 대비** — 통화쌍·지평 목록을 `types/forecast.ts` 의 `as const` 배열 두 개(`FORECAST_PAIRS`, `FORECAST_HORIZON_DAYS`)로 모으고 타입을 거기서 파생시켰다. `ForecastPeriod` 는 `"30D" | "90D"` 문자열에서 **서버에 그대로 보내는 일수 유니온(`30 | 90`)** 으로 바뀌었다. 선택지 확장은 배열에 값 한 줄을 더하는 것으로 끝나며, 별도의 문자열↔일수 변환 함수(`horizonDaysOf`)는 필요가 없어져 삭제했다.
- **AI 자연어 설명** — 팬 차트 아래에 `surface: "forecast_summary"` 설명 영역을 붙였다. 로딩 표시는 공용 `Spinner`(이슈 I2), 실패 시 재시도는 훅의 `reload`. `facts` 는 서버가 준 값을 가공 없이 백엔드 계약 표기로 싣는다: `pair_code` · `horizon_days` · `band_lower` · `band_upper` · `vol_30d` · `vol_percentile_5y` · `regime`.
- **국면 배지** — 응답 `meta.regime` 을 명세 §2 고정 매핑표(`calm`·`normal`→정상, `elevated`→주의, `stress`→급변)로 옮겨 배지로 표시한다. 모르는 코드는 배지를 그리지 않는다.
- **통화 색** — 기준통화에 고정 배정된 색 토큰(`--usd` · `--jpy` · `--eur`, 배정 없으면 `--text-muted`)을 드롭다운 표식과 팬 차트 선·툴팁에 적용했다. 리터럴 색은 쓰지 않는다.

## 영향 / 리스크

- **요청 파라미터가 바뀐다.** 기존에는 스펙에 없는 쌍까지 보내고 있었다.

  | 화면 선택 | 변경 전 `pair_code` | 변경 후 `pair_code` |
  |---|---|---|
  | 첫 화면(기본) | `USD_KRW` | `USDKRW` |
  | 두 번째 선택지 | `JPY_KRW` (스펙에 없음) | `USDJPY` |
  | 세 번째 선택지 | `EUR_KRW` (스펙에 없음) | `EURUSD` |

  백엔드 `PairCode.parse` 는 `USD_KRW` 표기도 받아 주므로 기존 호출이 400 이었던 것은 아니지만, 응답으로 오는 통화쌍이 명세와 달랐다. 이제 세 쌍 모두 명세 표기로 나간다.

- **경고 톤 조건이 실제로 동작한다.** `isPercentileWarn` 판정 근거가 바뀐다.

  | `volatility.regime` | 변경 전 | 변경 후 |
  |---|---|---|
  | `calm` · `normal` | 평상 | 평상 |
  | `elevated` | 평상 (오판) | **경고** |
  | `stress` | 평상 (오판) | **경고** |
  | `high` · `extreme` (백엔드가 내보내지 않는 값) | 경고 | 평상 |

- **일정 필터 범위가 넓어진다.** 기존에는 선택 통화 하나의 일정만 남겼는데, 이제 통화쌍을 이루는 두 통화의 일정을 함께 보여 준다(`USDJPY` → USD·JPY).
- **기간 선택지는 이번 PR에서 넓히지 않았다.** 백엔드 `ForecastService.ALLOWED_HORIZON_DAYS = List.of(30, 90)` 이라 그 밖의 값은 400 이다. **기간 선택지 확장은 BE 이슈 divurve-api#121 선행** — 배포 확인 후 `FORECAST_HORIZON_DAYS` 에 값을 더하는 후속 PR 로 처리한다.
- 통화쌍·기간을 바꾸면 화면이 전체 로딩 상태로 돌아갔다 다시 그려진다(기존 동작 그대로). 부분 로딩으로 다듬는 것은 이 변경 범위 밖이다.
- `components/common/**` · `components/ai/**` · `app/app.tsx` · `vite.config.ts` 는 손대지 않았다.

## 검증

- [x] 테스트 통과 + 커버리지 100% — `npm run lint`(0 errors), `npm run build`, `npx vitest run --coverage` (97 files / 747 tests, lines·branches·functions·statements 100%)
- [x] 통화쌍 3종 전환 시 팬 차트 제목·80% 범위·전망 동인·모델 성적표가 모두 새 응답으로 갱신되는지 테스트로 확인 (`forecast-screen.test.tsx`)
- [x] AI 설명 요청 `facts` 구성과 `meta.regime` 배지 반영을 테스트로 확인
- [ ] 화면 시각 확인(반응형 3개 폭) — 통합 세션에서 수행

## 롤백 방법

이 브랜치의 커밋을 되돌리면 된다(`git revert`). 화면·타입·프리젠터가 함께 움직이므로 부분 롤백은 하지 않는다. 되돌리면 `pair_code` 표기와 국면 어휘도 함께 이전 상태로 돌아간다는 점만 유의한다.
