export const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function byId<T extends Element>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function all<T extends Element>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

export function onReady(callback: () => void): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback, { once: true });
    return;
  }

  callback();
}
