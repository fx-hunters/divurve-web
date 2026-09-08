/**
 * DOM 요소의 실제 렌더 크기를 관찰한다.
 *
 * SVG 그림은 `viewBox`가 좌표계 비율을 고정하므로, 부모가 준 높이를 다 쓰게
 * 하려면 그릴 때 실제 픽셀 크기를 알아야 한다. `preserveAspectRatio="none"`
 * 으로 늘리면 글자까지 함께 찌그러져 눈금을 읽을 수 없다.
 *
 * 값만 돌려주고 JSX를 반환하지 않는다(AGENTS.md §7.3).
 */
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

export interface ElementSize {
  readonly width: number;
  readonly height: number;
}

export interface UseElementSizeResult<T extends Element> {
  /** 관찰할 요소에 붙이는 콜백 ref. */
  readonly ref: (element: T | null) => void;
  /** 아직 잴 수 없으면 `null`. 호출부가 기본 크기로 그린다. */
  readonly size: ElementSize | null;
}

export function useElementSize<T extends Element>(): UseElementSizeResult<T> {
  // 콜백 ref로 노드를 상태에 담는다. useRef면 노드가 붙는 시점에 이펙트가
  // 다시 돌지 않아 첫 측정을 놓친다.
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState<ElementSize | null>(null);

  const ref = useCallback((node: T | null) => setElement(node), []);

  const measure = useCallback(() => {
    if (element === null) return;
    const rect = element.getBoundingClientRect();
    // 아직 배치되지 않았거나 감춰진 요소는 0을 준다. 그 값으로 그리면 그림이
    // 하한 크기로 굳으므로 잰 적 없는 상태로 남긴다.
    if (rect.width === 0 || rect.height === 0) return;
    // 소수점 픽셀은 버린다. 그대로 두면 값이 같은데도 객체가 매번 새로
    // 만들어져 렌더가 반복된다.
    const next = {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
    setSize((previous) =>
      previous?.width === next.width && previous.height === next.height
        ? previous
        : next,
    );
  }, [element]);

  /*
   * 렌더마다 다시 잰다. 형제 요소가 늘거나 줄면(예: AI 설명이 도착하면) 이
   * 요소의 높이도 바뀌는데, 그 변화는 같은 렌더에서 일어나므로 여기서 잡는
   * 편이 확실하다. 크기가 같으면 같은 객체를 유지해 다시 렌더하지 않는다.
   */
  useLayoutEffect(measure);

  // 창 크기 변경처럼 렌더 없이 일어나는 변화용.
  useEffect(() => {
    // 없는 환경(jsdom·구형 브라우저)에서는 렌더 시점 측정만 남는다.
    if (element === null || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, measure]);

  return { ref, size };
}
