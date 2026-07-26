import { reduceMotion } from "./dom";

export function initHeroMotion(): void {
  const homeHero = document.querySelector<HTMLElement>(".home-hero");
  if (!homeHero || reduceMotion) return;
  const hero: HTMLElement = homeHero;

  let ticking = false;

  function updateHeroProgress(): void {
    const y = Math.max(0, window.scrollY);
    const progress = Math.min(1, Math.max(0, y / Math.max(360, hero.offsetHeight * 0.74)));
    hero.style.setProperty("--hero-progress", progress.toFixed(3));
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeroProgress);
        ticking = true;
      }
    },
    { passive: true },
  );

  updateHeroProgress();
}
