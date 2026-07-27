import { byId, reduceMotion } from "./dom";

const storageKey = "oops-theme";

const ring = '<path class="sketch-icon-ring" pathLength="1" d="M12 1.7C18.6 1.5 22.6 6.2 22.3 12.2C22 18.6 18 22.5 11.8 22.4C5.5 22.4 1.5 18.2 1.7 11.9C1.9 5.8 6 1.9 12 1.7Z"></path>';
const iconAnimationClass = "theme-icon-switching";
const iconAnimationDuration = 560;
let iconAnimationTimer: number | undefined;

const icons = {
  sun: `${ring}<g class="sketch-icon-glyph" transform="translate(4 4) scale(.667)"><path d="M12 7.7C15.2 7.5 17.2 9.8 17 12.5C16.8 15.5 14.6 17.4 11.9 17.3C8.9 17.3 6.8 15.1 7.1 12.2C7.2 9.6 9.4 7.8 12 7.7ZM12 4V1.7M12 22.4V20M3.7 12.3H1.4M22.5 12.3H20M6.1 6.2L4.3 4.4M19.6 19.6L17.8 17.8M6 18L4.2 19.8M17.9 6L19.7 4.2"></path><path class="sketch-icon-accent-stroke" d="M9.5 12.6C10.5 11.2 13 10.7 14.6 11.8"></path></g>`,
  moon: `${ring}<g class="sketch-icon-glyph" transform="translate(4 4) scale(.667)"><path d="M16.9 17.5C11.9 20.1 6.2 16.7 6.2 11.5C6.2 7.5 9 4.6 12.6 4C10.8 7 11.3 10.3 13.5 12.5C15.5 14.5 18.2 15.1 20.5 14.1C19.8 15.7 18.6 16.8 16.9 17.5Z"></path><circle class="sketch-icon-accent" cx="19.7" cy="5" r="1.15"></circle></g>`,
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

function animateThemeIcon(trigger: HTMLElement): void {
  if (reduceMotion) return;

  trigger.classList.remove(iconAnimationClass);
  void trigger.offsetWidth;
  trigger.classList.add(iconAnimationClass);

  window.clearTimeout(iconAnimationTimer);
  iconAnimationTimer = window.setTimeout(() => {
    trigger.classList.remove(iconAnimationClass);
  }, iconAnimationDuration);
}

export function initTheme(): void {
  const themeButton = byId<HTMLButtonElement>("theme-button");

  setTheme(getInitialTheme());

  themeButton?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    animateThemeIcon(themeButton);
    transitionTheme(next, themeButton);
    localStorage.setItem(storageKey, next);
  });
}
