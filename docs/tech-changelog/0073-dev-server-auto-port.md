# 0073. 병렬 세션이 포트 충돌 없이 dev 서버를 띄운다

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-09 |
| 작성자 | Claude (Opus 5) |
| 변경 유형 | chore |
| 영향 범위 | 빌드·CI (개발 환경 한정) |
| 관련 브랜치 | chore/dev-server-auto-port |
| 관련 커밋 | (PR 머지 시 채운다) |
| 관련 이슈·PR | #105 |

## 변경 사유 (Why)

한 레포에서 여러 세션이 git 워크트리로 동시에 작업한다. 각 세션이 `npm run dev`
를 띄우면 모두 5173을 잡으려 하고, vite 기본값이 `strictPort: false` 라 뒤에 뜬
쪽은 **아무 말 없이** 5174로 밀린다.

그런데 프리뷰 도구는 `.claude/launch.json` 이 가리키는 포트(5173)만 본다. 서버는
5174에 떠 있으므로 붙지 못한다. 밀렸다는 사실이 조용해서, 화면이 안 뜨는 이유를
"서버가 안 떴나" 부터 되짚게 된다.

실제로 관리자 대시보드 작업(#84 #85 #99~#102, PR #97 #104)을 하는 내내 프리뷰
검증을 **한 번도 하지 못했다.** 카드가 셋에서 일곱으로 늘고 첫 차트가 들어갔는데
그 배치를 아무도 브라우저에서 보지 못한 채 머지됐다. 이게 이 변경의 직접적인
계기다.

## 변경 내용 (What)

- `.claude/launch.json` 에 `autoPort: true` — 프리뷰 도구가 빈 포트를 고르고 그
  포트를 `PORT` 로 넘긴다.
- `vite.config.ts` 가 `PORT` 를 읽어 `server.port` 로 쓴다. **`PORT` 가 주어졌을
  때만** `strictPort: true` 를 함께 켠다.
- `process` 는 `vite.config.ts` 안에서만 통하는 모듈 스코프 `declare const` 로
  선언했다.

## 영향 / 리스크

`PORT` 를 지정하면 실패가 조용하지 않다. 지정된 포트가 이미 쓰이면 서버가 뜨지
않고 `Port NNNN is already in use` 로 죽는다. 이게 의도다 — 조용히 다른 포트로
옮겨가면 어느 포트가 내 서버인지 알 수 없게 되고, 그게 원래 문제였다.

`PORT` 없이 `npm run dev` 를 치는 기존 사용법은 그대로다.

`@types/node` 를 **의도적으로 넣지 않았다.** `tsconfig.json` 의 `types` 배열은
전역이라, `"node"` 를 더하면 `src` 전체에 Node 전역 타입이 실린다. `setTimeout`
반환 타입이 `number` 에서 `NodeJS.Timeout` 으로 바뀌어 브라우저 코드의 타입이
흔들린다. `process.env` 한 줄 때문에 치를 값이 아니다.

빌드 산출물(`vite build`)에는 영향이 없다. `server` 는 dev 서버 설정이다.

## 검증

- [x] 테스트 통과 + 커버리지 100%
- [x] `PORT=5199 npx vite` → 5199에 뜸, `curl localhost:5199` 가 200
- [x] 5199가 이미 쓰이는 상태에서 `PORT=5199 npx vite` → `Port 5199 is already
      in use` 로 실패 (조용히 밀리지 않음)
- [x] `PORT` 없이 `npx vite` → 기존과 동일하게 빈 포트 탐색 (5173 사용 중이라
      5174로 뜸)
- [x] `npm run build` (`tsc --noEmit` 포함) 통과, 린트 오류 0건

## 롤백 방법

`vite.config.ts` 의 `server` 상수와 `declare const process` 를 지우고
`plugins` 아래의 `server,` 한 줄을 뺀다. `.claude/launch.json` 의 `autoPort` 를
지운다. 되돌려도 개발 환경만 원상복구되고 앱 동작에는 변화가 없다.
