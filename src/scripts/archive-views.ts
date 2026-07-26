import { all } from "./dom";

export function initArchiveViews(): void {
  all<HTMLButtonElement>(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.filter;
      all<HTMLButtonElement>(".filter-button").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      all<HTMLElement>("[data-category]").forEach((row) => {
        row.hidden = category !== "all" && row.dataset.category !== category;
      });
    });
  });

  const manuscriptTabs = all<HTMLButtonElement>("[data-manuscript-tab]");
  const manuscriptPanels = all<HTMLElement>("[data-manuscript-panel]");
  const manuscriptTabList = document.querySelector<HTMLElement>(".manuscript-tabs");

  function updateManuscriptIndicator(): void {
    const selectedTab = manuscriptTabs.find((tab) => tab.getAttribute("aria-selected") === "true");
    if (!selectedTab || !manuscriptTabList) return;

    manuscriptTabList.style.setProperty("--tab-indicator-x", `${selectedTab.offsetLeft}px`);
    manuscriptTabList.style.setProperty("--tab-indicator-width", `${selectedTab.offsetWidth}px`);
    manuscriptTabList.classList.add("indicator-ready");
  }

  function queueManuscriptIndicatorUpdate(): void {
    window.requestAnimationFrame(updateManuscriptIndicator);
  }

  function selectManuscriptTab(name: string | undefined, focus = false): void {
    if (!name) return;

    manuscriptTabs.forEach((tab) => {
      const selected = tab.dataset.manuscriptTab === name;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });

    manuscriptPanels.forEach((panel) => {
      panel.hidden = panel.dataset.manuscriptPanel !== name;
    });

    queueManuscriptIndicatorUpdate();
  }

  manuscriptTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectManuscriptTab(tab.dataset.manuscriptTab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + manuscriptTabs.length) % manuscriptTabs.length;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % manuscriptTabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = manuscriptTabs.length - 1;
      selectManuscriptTab(manuscriptTabs[nextIndex]?.dataset.manuscriptTab, true);
    });
  });
  selectManuscriptTab(manuscriptTabs[0]?.dataset.manuscriptTab);
  window.addEventListener("resize", queueManuscriptIndicatorUpdate, { passive: true });

  const postPreview = document.querySelector<HTMLElement>(".nav-preview-posts");
  const postCategoryTabs = all<HTMLButtonElement>("[data-post-category]", postPreview ?? document);
  const postCategoryPanels = all<HTMLElement>("[data-post-panel]", postPreview ?? document);
  const postPreviewCount = postPreview?.querySelector<HTMLElement>("[data-post-preview-count]");

  function selectPostCategory(name: string | undefined, focus = false): void {
    if (!name) return;

    postCategoryTabs.forEach((tab) => {
      const selected = tab.dataset.postCategory === name;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });

    postCategoryPanels.forEach((panel) => {
      panel.hidden = panel.dataset.postPanel !== name;
    });

    const selectedTab = postCategoryTabs.find((tab) => tab.dataset.postCategory === name);
    if (postPreviewCount && selectedTab) {
      const label = selectedTab.querySelector("b")?.textContent?.trim() ?? "";
      const count = selectedTab.querySelector("small")?.textContent?.trim() ?? "0";
      postPreviewCount.textContent = `${label} / ${count} 篇`;
    }
  }

  postCategoryTabs.forEach((tab, index) => {
    const select = () => selectPostCategory(tab.dataset.postCategory);
    tab.addEventListener("pointerenter", select);
    tab.addEventListener("focus", select);
    tab.addEventListener("click", select);
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowUp") nextIndex = (index - 1 + postCategoryTabs.length) % postCategoryTabs.length;
      if (event.key === "ArrowDown") nextIndex = (index + 1) % postCategoryTabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = postCategoryTabs.length - 1;
      selectPostCategory(postCategoryTabs[nextIndex]?.dataset.postCategory, true);
    });
  });
}
