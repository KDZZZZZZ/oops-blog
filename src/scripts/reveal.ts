import { all, reduceMotion } from "./dom";

export function initReveal(): void {
  all<HTMLElement>("[data-enter]").forEach((node) => {
    window.requestAnimationFrame(() => node.classList.add("entered"));
  });

  const revealNodes = all<HTMLElement>(".reveal, .paper-reveal");
  if (!revealNodes.length) return;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealNodes.forEach((node) => node.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 },
  );

  revealNodes.forEach((node) => observer.observe(node));
}
