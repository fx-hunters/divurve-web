import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";

// api/client.ts의 resolveApiBaseUrl()은 VITE_API_URL이 없으면 예외를 던진다.
// CI에는 이 값이 주입되지 않으므로 테스트 전역에 더미 오리진을 세워 둔다.
vi.stubEnv("VITE_API_URL", "https://api.test");

// 화면이 의존성 주입 없이 마운트되면 실제 fetch가 나간다. jsdom에서는 DNS 조회가
// 수십 초 매달린 뒤 실패해 테스트가 느려지고 간헐적으로 깨진다. 전역 fetch를
// 즉시 거절시켜 테스트를 네트워크로부터 격리한다.
beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new Error("network disabled in tests"),
  );
});
