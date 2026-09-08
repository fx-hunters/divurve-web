import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestWithMeta } from "./client";
import { fetchHomeMarketSnapshot, HOME_MARKET_PAIR_CODES } from "./home";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return { ...actual, requestWithMeta: vi.fn() };
});

beforeEach(() => vi.clearAllMocks());

describe("fetchHomeMarketSnapshot", () => {
  it("선택한 통화쌍을 snake_case 쿼리로 붙여 forecast를 조회한다", async () => {
    const result = { data: { pairCode: "USDJPY" }, meta: { asOf: "t" } };
    vi.mocked(requestWithMeta).mockResolvedValue(result);

    await expect(fetchHomeMarketSnapshot("USDJPY")).resolves.toEqual(result);
    expect(requestWithMeta).toHaveBeenCalledWith(
      "/api/v1/forecast?pair_code=USDJPY",
    );
  });

  it("백엔드가 지원하는 통화쌍 셋만 선택지로 노출한다", () => {
    expect(HOME_MARKET_PAIR_CODES).toEqual(["USDKRW", "USDJPY", "EURUSD"]);
  });
});
