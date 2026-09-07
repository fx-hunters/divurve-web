import { beforeEach, describe, expect, it } from "vitest";
import {
  PROFILE_PREFERENCES_STORAGE_KEY,
  readProfilePreferences,
  writeProfilePreferences,
} from "./profile-preferences-store";

describe("profile preferences session store", () => {
  beforeEach(() => sessionStorage.clear());

  it("설명 분야와 설명 수준만 세션에 저장한다", () => {
    writeProfilePreferences({
      explanationDomain: "dev",
      explanationLevel: "analytical",
    });

    expect(readProfilePreferences()).toEqual({
      explanationDomain: "dev",
      explanationLevel: "analytical",
    });
  });

  it("빈 설정은 저장값을 제거한다", () => {
    writeProfilePreferences({ explanationDomain: "finance" });
    writeProfilePreferences({});
    expect(sessionStorage.getItem(PROFILE_PREFERENCES_STORAGE_KEY)).toBeNull();
    expect(readProfilePreferences()).toEqual({});
  });

  it.each([
    "null",
    "[]",
    "{",
    JSON.stringify({ explanationDomain: "unknown" }),
    JSON.stringify({ explanationLevel: "unknown" }),
  ])("잘못된 저장값 %s은 빈 설정으로 복구한다", (storedValue) => {
    sessionStorage.setItem(PROFILE_PREFERENCES_STORAGE_KEY, storedValue);
    expect(readProfilePreferences()).toEqual({});
  });

  it("부분 설정을 읽고 유효하지 않은 쓰기 입력은 무시한다", () => {
    sessionStorage.setItem(
      PROFILE_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ explanationLevel: "reasoned" }),
    );
    expect(readProfilePreferences()).toEqual({ explanationLevel: "reasoned" });

    writeProfilePreferences({
      explanationDomain: "plain",
      explanationLevel: "simple",
    });
    const storedBeforeInvalidWrite = sessionStorage.getItem(
      PROFILE_PREFERENCES_STORAGE_KEY,
    );
    writeProfilePreferences({
      explanationDomain: "unsupported",
    } as never);
    expect(sessionStorage.getItem(PROFILE_PREFERENCES_STORAGE_KEY)).toBe(
      storedBeforeInvalidWrite,
    );
  });
});
