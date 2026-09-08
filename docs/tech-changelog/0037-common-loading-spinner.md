# 0037. 공용 원형 로딩 스피너 도입 — API 대기 구간의 로딩 표시 통일

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | AI Agent (Claude) |
| 변경 유형 | feat / ui |
| 영향 범위 | 화면(ApiStateView를 쓰는 전 화면), 공용 컴포넌트, 디자인 토큰 |
| 관련 브랜치 | feat/loading-spinner |
| 관련 커밋 | (커밋 후 기입) |
| 관련 이슈·PR | #39 |

## 변경 사유 (Why)
공통 UI 요구사항은 "API 요청과 응답 사이에는 원형 로딩 바(회전 애니메이션)로 로딩을 표시"한다고 정한다.
그러나 기존 `ApiStateView`는 로딩 상태에서 `sparkles` 아이콘을 **정지 상태로** 렌더할 뿐이어서,
사용자가 "요청이 진행 중"인지 "화면이 멈췄는지" 구분할 단서가 없었다.

대부분의 화면이 `ApiStateView`를 공유하므로, 공용 스피너를 만들고 이 컴포넌트의 로딩 분기 한 곳만
교체하면 소비처(홈/플래너/전망/X-ray 등) 파일을 전혀 건드리지 않고 전 화면에 동일한 로딩 표현이 적용된다.
후속 화면 이슈들은 이 산출물을 **소비만** 하도록 경계를 잡았다.

## 변경 내용 (What)
- `src/components/common/spinner.tsx` 신규. props는 `size`(기본 28)·`label`(기본 "불러오는 중")뿐이며,
  `role="status"` + `aria-label`로 상태를 알리고 SVG 자체는 `aria-hidden`으로 감춘다.
  색상은 리터럴 없이 트랙 `var(--border)`, 진행 호 `var(--primary)` 토큰만 사용한다(AGENTS.md §6).
- `src/styles/tokens.css`에 `@keyframes divurve-spin`과 `.divurve-spinner__icon` 회전 규칙,
  `@media (prefers-reduced-motion: reduce)` 정지 규칙 추가. 회전 로직을 JS가 아닌 CSS에 두어
  컴포넌트는 순수 표현만 담당한다(§7.2).
- `src/components/common/api-state-view.tsx`의 `status === "loading"` 분기만 `Icon` → `Spinner`로 교체.
  `error`/`empty` 분기와 재시도 버튼 동작은 그대로다. 로딩에서만 쓰이던 `sparkles` 분기가 사라져
  아이콘 선택식이 3항 중첩에서 단일 삼항으로 단순해졌다.
- 스피너는 이미 `role="status"`인 바깥 컨테이너 안에서 `aria-hidden` 래퍼로 감싼다.
  중복 라이브 리전 안내를 막기 위함이다.

## 영향 / 리스크
- `ApiStateView`를 쓰는 모든 화면의 로딩 표현이 동시에 바뀐다. 레이아웃(28px 아이콘 자리)은 동일하므로
  높이·정렬 변화는 없다.
- 접근성 트리에서 로딩 아이콘 위치의 노드가 `sparkles` 아이콘에서 숨겨진 스피너로 바뀌지만,
  바깥 `role="status"`가 읽어주는 제목·본문 문구는 변하지 않는다.
- 수치·계산에 영향 없음(표시 전용 변경).
- `.divurve-spinner*` 클래스는 전역 스타일이므로, 다른 컴포넌트에서 같은 이름을 재정의하지 않도록 주의.

## 검증
- [x] 테스트 통과 + 커버리지 100% (`npm run lint`, `npm run build`, `npm run test -- --coverage`)
- [x] `spinner.test.tsx` 신규 — 기본값 렌더·`size`/`label` 전달 분기·토큰 색상 사용 확인
- [x] `api-state-view.test.tsx` 갱신 — 로딩에서 스피너 렌더, `empty`/`error`에서는 미렌더 확인
- [x] (수치 변경 없음)

## 롤백 방법
- `api-state-view.tsx`의 로딩 분기를 `<Icon name="sparkles" size={28} />`로 되돌리고
  `spinner.tsx`·`spinner.test.tsx`와 `tokens.css`의 스피너 블록을 제거하면 원복된다.
  소비처 화면 파일은 손대지 않았으므로 되돌림 범위는 이 세 파일로 한정된다.
