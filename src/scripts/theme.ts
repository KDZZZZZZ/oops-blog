import { byId, reduceMotion } from "./dom";

const storageKey = "oops-theme";

const icons = {
  sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"></path>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>',
} as const;

type Theme = "light" | "dark";

interface NativeViewTransition {
  finished: Promise<void>;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => NativeViewTransition;
};

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setTheme(theme: Theme): void {
  const themeButton = byId<HTMLButtonElement>("theme-button");
  const themeIcon = byId<SVGElement>("theme-icon");
  document.documentElement.dataset.theme = theme;

  if (themeIcon) themeIcon.innerHTML = theme === "dark" ? icons.sun : icons.moon;

  if (themeButton) {
    const label = theme === "dark" ? "切换到浅色主题" : "切换到深色主题";
    themeButton.title = label;
    themeButton.setAttribute("aria-label", label);
  }

  const color = theme === "dark" ? "#1d1b18" : "#f3f1ec";
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", color);
}

function transitionTheme(theme: Theme, trigger: HTMLElement): void {
  const viewTransitionDocument = document as ViewTransitionDocument;
  if (reduceMotion || !viewTransitionDocument.startViewTransition) {
    setTheme(theme);
    return;
  }

  const root = document.documentElement;
  const triggerRect = trigger.getBoundingClientRect();
  const originX = triggerRect.left + triggerRect.width / 2;
  const originY = triggerRect.top + triggerRect.height / 2;
  const radius = Math.hypot(
    Math.max(originX, window.innerWidth - originX),
    Math.max(originY, window.innerHeight - originY),
  );

  root.style.setProperty("--theme-origin-x", `${originX.toFixed(1)}px`);
  root.style.setProperty("--theme-origin-y", `${originY.toFixed(1)}px`);
  root.style.setProperty("--theme-radius", `${Math.ceil(radius + 24)}px`);
  root.classList.add("theme-transitioning");

  const transition = viewTransitionDocument.startViewTransition(() => setTheme(theme));
  void transition.finished.finally(() => root.classList.remove("theme-transitioning"));
}

export function initTheme(): void {
  const themeButton = byId<HTMLButtonElement>("theme-button");

  setTheme(getInitialTheme());

  themeButton?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    transitionTheme(next, themeButton);
    localStorage.setItem(storageKey, next);
  });
}
