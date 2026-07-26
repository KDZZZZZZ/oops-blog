import { all, byId } from "./dom";

interface SearchResult {
  url?: string;
  excerpt?: string;
  meta?: {
    title?: string;
    type?: string;
    summary?: string;
  };
}

interface Pagefind {
  search(query: string): Promise<{ results: Array<{ data(): Promise<SearchResult> }> }>;
}

export interface FallbackSearchItem {
  type: string;
  title: string;
  summary: string;
  href: string;
  terms?: string;
}

declare global {
  interface Window {
    __OOPS_SEARCH_INDEX__?: FallbackSearchItem[];
  }
}

let pagefindPromise: Promise<Pagefind | null> | null = null;

function readFallbackIndex(): FallbackSearchItem[] {
  const element = byId<HTMLScriptElement>("search-fallback-json");
  if (!element?.textContent) return [];

  try {
    const value: unknown = JSON.parse(element.textContent);
    return Array.isArray(value) ? (value as FallbackSearchItem[]) : [];
  } catch {
    return [];
  }
}

async function loadPagefind(): Promise<Pagefind | null> {
  const pagefindPath = "/pagefind/pagefind.js";
  pagefindPromise ??= import(/* @vite-ignore */ pagefindPath)
    .then((module) => module as Pagefind)
    .catch(() => null);
  return pagefindPromise;
}

function renderHint(searchResults: HTMLElement, message: string): void {
  searchResults.className = "search-hint";
  searchResults.textContent = message;
}

function createResultLink(item: FallbackSearchItem): HTMLAnchorElement {
  const link = document.createElement("a");
  link.className = "search-result";
  link.href = item.href;

  const type = document.createElement("small");
  type.textContent = item.type;

  const title = document.createElement("strong");
  title.textContent = item.title;

  const summary = document.createElement("span");
  summary.textContent = item.summary;

  link.append(type, title, summary);
  return link;
}

async function renderPagefindResults(searchResults: HTMLElement, query: string): Promise<boolean> {
  const pagefind = await loadPagefind();
  if (!pagefind) return false;

  const response = await pagefind.search(query);
  const entries = await Promise.all(response.results.slice(0, 8).map((result) => result.data()));
  if (!entries.length) return false;

  searchResults.className = "";
  searchResults.replaceChildren(
    ...entries.map((entry) =>
      createResultLink({
        type: entry.meta?.type ?? "站内",
        title: entry.meta?.title ?? entry.url ?? "未命名结果",
        summary: entry.meta?.summary ?? entry.excerpt?.replace(/<[^>]+>/g, "") ?? "",
        href: entry.url ?? "#",
      }),
    ),
  );
  return true;
}

function renderFallbackResults(searchResults: HTMLElement, query: string): void {
  const term = query.trim().toLowerCase();
  const index = window.__OOPS_SEARCH_INDEX__ ?? [];
  const matches = index.filter((item) =>
    `${item.title} ${item.summary} ${item.terms ?? ""}`.toLowerCase().includes(term),
  );

  if (!matches.length) {
    renderHint(searchResults, "没有匹配内容，可以换一个更短的关键词。");
    return;
  }

  searchResults.className = "";
  searchResults.replaceChildren(...matches.slice(0, 8).map(createResultLink));
}

export function initSearch(): void {
  const header = byId<HTMLElement>("site-header");
  const searchDialog = byId<HTMLDialogElement>("search-dialog");
  const searchInput = byId<HTMLInputElement>("search-input");
  const searchResults = byId<HTMLElement>("search-results");
  window.__OOPS_SEARCH_INDEX__ ??= readFallbackIndex();

  function openSearch(): void {
    if (!searchDialog) return;
    header?.classList.remove("header-hidden");
    if (typeof searchDialog.showModal === "function") searchDialog.showModal();
    else searchDialog.setAttribute("open", "");
    window.requestAnimationFrame(() => searchInput?.focus());
  }

  function closeSearch(): void {
    if (!searchDialog) return;
    if (typeof searchDialog.close === "function") searchDialog.close();
    else searchDialog.removeAttribute("open");
  }

  async function renderResults(query: string): Promise<void> {
    if (!searchResults) return;
    const term = query.trim();
    if (!term) {
      renderHint(searchResults, "输入关键词，例如 LLVM、Agent 或推理。");
      return;
    }

    const renderedPagefind = await renderPagefindResults(searchResults, term);
    if (!renderedPagefind) renderFallbackResults(searchResults, term);
  }

  all<HTMLButtonElement>("[data-open-search]").forEach((button) => {
    button.addEventListener("click", openSearch);
  });
  byId<HTMLButtonElement>("search-close")?.addEventListener("click", closeSearch);
  searchDialog?.addEventListener("click", (event) => {
    if (event.target === searchDialog) closeSearch();
  });
  searchDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeSearch();
  });
  searchDialog?.addEventListener("close", () => {
    if (searchInput) searchInput.value = "";
    void renderResults("");
  });
  searchInput?.addEventListener("input", (event) => {
    void renderResults((event.target as HTMLInputElement).value);
  });

  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSearch();
    }
    if (event.key === "Escape" && searchDialog?.open) {
      event.preventDefault();
      closeSearch();
    }
  });
}
