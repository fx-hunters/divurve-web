/**
 * 펼침/접힘 상태를 브라우저에 기억하는 토글.
 *
 * 화면을 열 때마다 접기를 다시 눌러야 한다면 접기 버튼은 없느니만 못하다.
 * 값은 이 브라우저에만 남는 표시 취향이므로 `localStorage`에 둔다 — 서버
 * 계정 설정이 아니다.
 *
 * `localStorage` 는 시크릿 창·차단 설정에서 읽기·쓰기 모두 예외를 던진다.
 * 그때는 기본값으로 동작하고 기억만 포기한다(기능이 죽는 것보다 낫다).
 *
 * 값과 핸들러만 돌려주고 JSX를 반환하지 않는다(AGENTS.md §7.3).
 */
import { useCallback, useState } from "react";

/** 저장 값. 불리언을 문자열로 굽지 않고 뜻이 보이는 리터럴을 쓴다. */
const OPEN = "open";
const CLOSED = "closed";

function readStored(storageKey: string | undefined): boolean | null {
  if (storageKey === undefined) return null;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === OPEN) return true;
    if (stored === CLOSED) return false;
    return null;
  } catch {
    // localStorage disabled fallback
    return null;
  }
}

function writeStored(storageKey: string | undefined, isOpen: boolean): void {
  if (storageKey === undefined) return;
  try {
    localStorage.setItem(storageKey, isOpen ? OPEN : CLOSED);
  } catch {
    // localStorage disabled fallback
  }
}

export interface UsePersistedToggleResult {
  readonly isOpen: boolean;
  readonly toggle: () => void;
}

export function usePersistedToggle(
  /** 없으면 기억하지 않는다. 토글 자체는 그대로 동작한다. */
  storageKey: string | undefined,
  defaultOpen: boolean,
): UsePersistedToggleResult {
  const [isOpen, setIsOpen] = useState(
    () => readStored(storageKey) ?? defaultOpen,
  );

  const toggle = useCallback(() => {
    const next = !isOpen;
    setIsOpen(next);
    writeStored(storageKey, next);
  }, [isOpen, storageKey]);

  return { isOpen, toggle };
}
