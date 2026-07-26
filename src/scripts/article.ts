import { reduceMotion } from "./dom";

/** Reading progress bar + active TOC heading tracker. */

export function initArticle(): void {
  // ── Reading progress bar ─────────────────────────────────────────────────
  const bar = document.querySelector<HTMLElement>(".reading-progress");
  if (bar) {
    const progressBar = bar;
    let progressFrame = 0;

    function updateProgress(): void {
      const docH   = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docH > 0 ? Math.min(1, window.scrollY / docH) : 0;
      progressBar.style.setProperty("--progress", progress.toFixed(4));
      progressFrame = 0;
    }

    function queueProgressUpdate(): void {
      if (!progressFrame) progressFrame = window.requestAnimationFrame(updateProgress);
    }

    window.addEventListener("scroll", queueProgressUpdate, { passive: true });
    window.addEventListener("resize", queueProgressUpdate, { passive: true });
    updateProgress();
  }

  initArticleImageReveal();

  // ── Active TOC heading ───────────────────────────────────────────────────
  const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".toc a[href^='#']"));
  if (!tocLinks.length) return;

  const headingIds = tocLinks.map((a) => a.getAttribute("href")!.slice(1));
  const headings   = headingIds
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);

  tocLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const href = link.getAttribute("href");
      const target = href ? document.getElementById(href.slice(1)) : null;
      if (!href || !target) return;

      event.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 104;
      window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
      window.history.pushState(null, "", href);
    });
  });

  function getActive(): string | null {
    const scrollY = window.scrollY + 120;
    let active: string | null = null;
    for (const el of headings) {
      if (el.offsetTop <= scrollY) active = el.id;
      else break;
    }
    return active;
  }

  function updateToc(): void {
    const activeId = getActive();
    tocLinks.forEach((a) => {
      const id = a.getAttribute("href")!.slice(1);
      a.classList.toggle("toc-active", id === activeId);
    });
  }

  window.addEventListener("scroll", updateToc, { passive: true });
  updateToc();
}

function initArticleImageReveal(): void {
  const images = Array.from(document.querySelectorAll<HTMLImageElement>(".article-body img"));

  images.forEach((image) => {
    image.dataset.imageReveal = "";

    const showImage = () => {
      window.requestAnimationFrame(() => image.classList.add("image-reveal-loaded"));
    };

    if (reduceMotion) {
      showImage();
      return;
    }

    if (image.complete) {
      if (typeof image.decode === "function") {
        void image.decode().catch(() => undefined).finally(showImage);
      } else {
        showImage();
      }
      return;
    }

    image.addEventListener("load", showImage, { once: true });
    image.addEventListener("error", showImage, { once: true });
  });
}
