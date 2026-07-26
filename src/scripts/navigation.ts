import { all, byId, reduceMotion } from "./dom";

export function initNavigation(): void {
  const header = byId<HTMLElement>("site-header");
  const menu = byId<HTMLElement>("mobile-menu");
  const menuButton = byId<HTMLButtonElement>("menu-button");
  const menuClose = byId<HTMLButtonElement>("menu-close");
  const searchDialog = byId<HTMLDialogElement>("search-dialog");
  let ticking = false;
  let lastScrollY = window.scrollY;
  let scrollDirection = 0;
  let scrollTravel = 0;
  let keyboardNavigation = false;

  const topRevealY = 96;
  const hideAfterY = 180;
  const hideTravel = 72;
  const revealTravel = 28;

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Tab" || event.key.startsWith("Arrow")) keyboardNavigation = true;
    },
    true,
  );

  document.addEventListener(
    "pointerdown",
    () => {
      keyboardNavigation = false;
    },
    true,
  );

  function updateScrollState(): void {
    const y = Math.max(0, window.scrollY);
    const delta = y - lastScrollY;
    header?.classList.toggle("scrolled", y > 12);

    if (header && !reduceMotion) {
      if (Math.abs(delta) >= 1 && !keyboardNavigation && header.contains(document.activeElement)) {
        (document.activeElement as HTMLElement | null)?.blur();
      }

      if (Math.abs(delta) >= 1) {
        const nextDirection = delta > 0 ? 1 : -1;
        if (nextDirection !== scrollDirection) {
          scrollDirection = nextDirection;
          scrollTravel = 0;
        }
        scrollTravel += Math.abs(delta);
      }

      const interactionOpen =
        document.body.classList.contains("menu-open") ||
        Boolean(searchDialog?.open) ||
        (keyboardNavigation && header.contains(document.activeElement));

      if (y < topRevealY || interactionOpen) {
        header.classList.remove("header-hidden");
        scrollTravel = 0;
      } else if (scrollDirection < 0 && scrollTravel >= revealTravel) {
        header.classList.remove("header-hidden");
        scrollTravel = 0;
      } else if (scrollDirection > 0 && y > hideAfterY && scrollTravel >= hideTravel) {
        header.classList.add("header-hidden");
        scrollTravel = 0;
      }
    }

    lastScrollY = y;
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollState);
        ticking = true;
      }
    },
    { passive: true },
  );
  updateScrollState();

  function openMenu(): void {
    header?.classList.remove("header-hidden");
    menu?.classList.add("open");
    menu?.setAttribute("aria-hidden", "false");
    menuButton?.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
    menuClose?.focus();
  }

  function closeMenu(restoreFocus = true): void {
    menu?.classList.remove("open");
    menu?.setAttribute("aria-hidden", "true");
    menuButton?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
    if (restoreFocus) menuButton?.focus();
  }

  menuButton?.addEventListener("click", openMenu);
  menuClose?.addEventListener("click", () => closeMenu());
  menu?.addEventListener("click", (event) => {
    if (event.target === menu) closeMenu();
  });
  all<HTMLAnchorElement>("a", menu ?? document).forEach((link) => {
    link.addEventListener("click", () => closeMenu(false));
  });

  function closeNavPods(): void {
    all<HTMLElement>(".nav-pod.is-open").forEach((pod) => {
      pod.classList.remove("is-open");
      pod.querySelector<HTMLButtonElement>(".nav-trigger")?.setAttribute("aria-expanded", "false");
    });
  }

  all<HTMLElement>(".nav-pod").forEach((pod) => {
    const trigger = pod.querySelector<HTMLButtonElement>(".nav-trigger");
    if (trigger) {
      trigger.addEventListener("click", () => {
        const open = pod.classList.toggle("is-open");
        trigger.setAttribute("aria-expanded", String(open));
      });
    }
  });

  // Blur any focused nav element on click-outside so :focus-within releases the preview
  document.addEventListener("pointerdown", (event) => {
    const target = event.target as Node;
    const nav = document.querySelector<HTMLElement>(".desktop-nav");
    if (!nav) return;
    const inNav = nav.contains(target);
    if (!inNav) {
      const focused = document.activeElement as HTMLElement | null;
      if (focused && nav.contains(focused)) focused.blur();
      closeNavPods();
    }
  });

  // Blur immediately when a link inside a nav-pod is clicked (prevents focus-within lock)
  all<HTMLAnchorElement>("a", document.querySelector<HTMLElement>(".desktop-nav") ?? document).forEach((link) => {
    link.addEventListener("click", () => {
      setTimeout(() => (document.activeElement as HTMLElement | null)?.blur(), 0);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu?.classList.contains("open")) closeMenu();
    if (event.key === "Escape") closeNavPods();
  });
}
