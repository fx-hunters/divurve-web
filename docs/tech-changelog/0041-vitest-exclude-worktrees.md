# 0041. vitest 스캔 대상에서 `.claude` 워크트리 디렉터리 제외

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | Claude (AI Agent) |
| 변경 유형 | chore |
| 영향 범위 | 빌드·CI (테스트 실행/커버리지 설정, git 무시 규칙) |
| 관련 브랜치 | chore/vitest-exclude-worktrees |
| 관련 커밋 | (이 커밋) |
| 관련 이슈·PR | #48 |

## 변경 사유 (Why)

이 레포는 `.claude/worktrees/<브랜치명>` 아래에 git 워크트리를 만들어 병렬 작업을 한다. 각 워크트리에는 `src/` 전체 사본이 들어 있고, vitest는 git 추적 여부와 무관하게 파일시스템을 직접 스캔하므로 루트에서 `npm run test`를 돌리면 이 사본들의 테스트까지 함께 수집한다. `.claude/worktrees/`가 untracked라는 사실은 아무 도움이 되지 않는다.

그 결과 (1) 같은 테스트가 워크트리 수 + 1 배로 중복 실행되어 실행 시간이 배로 늘고, (2) 커버리지 수치가 워크트리 사본이 섞인 값이 되어 100% 게이트(§8)가 실제 소스를 검증한다는 보장이 사라진다.

## 변경 내용 (What)

- `vite.config.ts`의 `test.exclude`에 `**/.claude/**`를 추가. vitest는 `exclude`를 지정하면 기본값을 덮어쓰므로 `configDefaults.exclude`(`**/node_modules/**`, `**/dist/**` 등)를 스프레드로 함께 유지했다.
- `test.coverage.exclude`에도 동일 글롭 추가(기존 제외 목록 유지).
- 글롭은 `WORKTREE_GLOB` 상수로 한 번만 정의하고 두 곳에서 참조.
- `.gitignore`에 `.claude/worktrees/` 추가. `.claude/`가 무시 목록에 없어서 워크트리를 만들면 메인 체크아웃의 `git status`에 계속 untracked로 떴다. `.claude/launch.json`은 추적 중이므로 `.claude/` 전체가 아니라 `worktrees/`만 제외한다.
- `configDefaults`를 `vitest/config`에서 import하면서 같은 모듈에 대한 triple-slash reference가 `@typescript-eslint/triple-slash-reference` 린트 에러가 됐다. `defineConfig`도 `vitest/config`에서 가져오도록 바꿔(해당 버전이 vite의 `defineConfig`에 `test` 옵션 타입을 더해준다) reference 라인을 제거했다.

## 영향 / 리스크

- 런타임 코드 변경 없음. 빌드 산출물 동일.
- `.claude/` 아래에 실제로 실행하고 싶은 테스트를 두면 더 이상 수집되지 않는다. 해당 디렉터리는 워크트리·에이전트 설정 전용이므로 실사용 영향 없음.
- 워크트리가 없는 환경(CI 포함)에서는 수집 결과가 변경 전과 동일하다.
- `.gitignore` 규칙은 `.claude/worktrees/` 하위만 대상이라 `.claude/launch.json` 추적에는 영향이 없다(`git check-ignore`로 확인).

측정값(워크트리 사본 1개를 `.claude/worktrees/` 아래에 둔 상태, 로컬):

| 상태 | Test Files | Tests |
|---|---|---|
| 워크트리 없음 (기준) | 94 | 708 |
| 변경 전 + 워크트리 사본 1개 | 188 | 1416 |
| 변경 후 + 워크트리 사본 1개 | 94 | 708 |

## 검증

- [x] 테스트 통과 + 커버리지 100% — `npx vitest run --coverage` → 94 files / 708 tests, All files 100%(lines·branches·functions·statements)
- [x] 워크트리 사본이 있는 상태에서 수집 파일 수가 기준값(94)으로 유지됨
- [x] `npm run lint` 에러 0건(경고 17건은 기존과 동일), `npm run build` 성공
- [x] `.claude/worktrees/` 하위 파일이 `git status`에 뜨지 않고, `.claude/launch.json`은 여전히 추적됨
- [x] (수치 변경 시) 변경 전후 값 확인 — 위 표

## 롤백 방법

`.gitignore`의 `.claude/worktrees/` 줄을 지우고, `vite.config.ts`의 `exclude` 두 곳에서 `WORKTREE_GLOB` 참조와 상수 선언을 제거하고, import를 `vite`의 `defineConfig` + `/// <reference types="vitest/config" />` 조합으로 되돌린다.
