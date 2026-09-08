import { describe, expect, it } from "vitest";
import {
  ADMIN_AI_TEMPLATE_MODEL_LABEL,
  toAdminAiModelLabel,
  toAdminAiOutcomeLabel,
  toAdminAiOutcomeTone,
  toAdminAiPurposeLabel,
} from "./admin-ai-call-vocabulary";

describe("toAdminAiPurposeLabel", () => {
  it("어휘 2종에 표기를 갖는다", () => {
    expect(toAdminAiPurposeLabel("narrate")).toContain("narrate");
    expect(toAdminAiPurposeLabel("extract")).toContain("extract");
  });

  it("모르는 값은 원문을 그대로 보여준다", () => {
    expect(toAdminAiPurposeLabel("summarize")).toBe("summarize");
    expect(toAdminAiPurposeLabel(null)).toBe("-");
  });
});

describe("toAdminAiOutcomeLabel", () => {
  it("아직 0건인 cache_hit·quota_blocked도 표기를 갖는다", () => {
    expect(toAdminAiOutcomeLabel("success")).toContain("success");
    expect(toAdminAiOutcomeLabel("fallback")).toContain("fallback");
    expect(toAdminAiOutcomeLabel("cache_hit")).toContain("cache_hit");
    expect(toAdminAiOutcomeLabel("quota_blocked")).toContain("quota_blocked");
    expect(toAdminAiOutcomeLabel("error")).toContain("error");
  });

  it("모르는 값과 null을 구분해 보여준다", () => {
    expect(toAdminAiOutcomeLabel("throttled")).toBe("throttled");
    expect(toAdminAiOutcomeLabel(null)).toBe("-");
  });
});

describe("toAdminAiOutcomeTone", () => {
  it("템플릿으로 대체된 fallback을 실패로 칠하지 않는다", () => {
    expect(toAdminAiOutcomeTone("fallback")).toBe("warn");
    expect(toAdminAiOutcomeTone("error")).toBe("off");
  });

  it("성공과 캐시 응답은 같은 색조다", () => {
    expect(toAdminAiOutcomeTone("success")).toBe("ok");
    expect(toAdminAiOutcomeTone("cache_hit")).toBe("ok");
    expect(toAdminAiOutcomeTone("quota_blocked")).toBe("warn");
  });

  it("모르는 값과 null은 색을 입히지 않는다", () => {
    expect(toAdminAiOutcomeTone("throttled")).toBe("unknown");
    expect(toAdminAiOutcomeTone(null)).toBe("unknown");
  });
});

describe("toAdminAiModelLabel", () => {
  it("null은 빈 칸이 아니라 LLM 미호출로 읽히게 한다", () => {
    expect(toAdminAiModelLabel(null)).toBe(ADMIN_AI_TEMPLATE_MODEL_LABEL);
    expect(toAdminAiModelLabel(null)).not.toBe("-");
    expect(toAdminAiModelLabel("claude-opus-5")).toBe("claude-opus-5");
  });
});
