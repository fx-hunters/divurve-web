import { useEffect, useState } from "react";

interface UseScrollSpyResult {
  /** 현재 화면에서 가장 많이 노출된 섹션 id. 노출된 섹션이 없으면 null */
  readonly activeSectionId: string | null;
}

/** 헤더 높이만큼 상단을 덜어내고, 화면 하단 60%는 판정에서 제외한다. */
const ROOT_MARGIN = "-80px 0px -60% 0px";
const THRESHOLDS = [0, 0.2, 0.4, 0.6, 0.8, 1];

/**
 * 섹션 id 배열을 받아 현재 스크롤 위치에 해당하는 섹션 id를 돌려준다.
 * IntersectionObserver가 없는 환경(jsdom 등)에서는 항상 null을 유지한다.
 */
export function useScrollSpy(sectionIds: readonly string[]): UseScrollSpyResult {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // 호출부가 배열 리터럴을 넘겨도 매 렌더마다 재구독하지 않도록 값으로 비교한다.
  const sectionKey = sectionIds.join("|");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const ids = sectionKey.split("|");
    const ratioById = new Map<string, number>(ids.map((id) => [id, 0]));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratioById.set(entry.target.id, entry.intersectionRatio);
        }

        const [topId, topRatio] = [...ratioById].reduce<[string, number]>(
          (best, current) => (current[1] > best[1] ? current : best),
          ["", 0],
        );

        setActiveSectionId(topRatio > 0 ? topId : null);
      },
      { rootMargin: ROOT_MARGIN, threshold: THRESHOLDS },
    );

    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [sectionKey]);

  return { activeSectionId };
}
