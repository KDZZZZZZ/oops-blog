import { initArchiveViews } from "./archive-views";
import { initArticle } from "./article";
import { onReady } from "./dom";
import { initHeroMotion } from "./hero-motion";
import { initNavigation } from "./navigation";
import { initReveal } from "./reveal";
import { initSearch } from "./search";
import { initTheme } from "./theme";

document.documentElement.classList.add("js");

onReady(() => {
  initTheme();
  initNavigation();
  initArchiveViews();
  initSearch();
  initReveal();
  initHeroMotion();
  initArticle();
});
