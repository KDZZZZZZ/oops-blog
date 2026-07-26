import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = ["/", "/posts/", "/essays/", "/projects/", "/about/"];
const widths = [360, 390, 430, 600, 768, 1024, 1366, 1440, 1920];

for (const route of routes) {
  test(`${route} renders without serious accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("main#content")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

for (const width of widths) {
  test(`homepage has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 780 : 900 });
    await page.goto("/");
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });
}

test("theme, search, mobile navigation and archive tabs work", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.locator("#theme-button").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.locator("#menu-button").click();
  await expect(page.locator("#mobile-menu")).toHaveAttribute("aria-hidden", "false");
  await page.locator("#menu-close").click();
  await expect(page.locator("#mobile-menu")).toHaveAttribute("aria-hidden", "true");

  await expect(page.locator("#site-header [data-open-search]")).toHaveCount(0);
  await page.keyboard.press("Control+K");
  await expect(page.locator("#search-dialog")).toBeVisible();
  await page.locator("#search-input").fill("TVM");
  await expect(page.locator("#search-results a").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#search-dialog")).not.toBeVisible();

  await page.goto("/posts/");
  await page.locator('[data-manuscript-tab="category"]').click();
  await expect(page.locator('[data-manuscript-panel="category"]')).toBeVisible();
  await page.locator('[data-manuscript-tab="overview"]').focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator('[data-manuscript-tab="category"]')).toBeFocused();
});

test("home preview omits redundant page shortcuts while preserving email contact", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".home-link-grid")).toHaveCount(0);
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(2);

  await page.goto("/about/");
  await expect(page.locator("#opensource")).toHaveCount(0);
  // The nav home popover now carries its own mailto on every page, so scope
  // the contact check to the page body.
  await expect(page.locator('main#content a[href^="mailto:"]')).toHaveCount(1);
  await expect(page.locator("main#content")).not.toContainText("开源与参考边界");
  await expect(page.locator("main#content")).toContainText("联系");
});

test("browser feedback keeps the archive chrome aligned and consistent", async ({ page }) => {
  for (const route of ["/", "/posts/", "/essays/"]) {
    await page.goto(route);
    await expect(page.locator("#site-header [data-open-search]")).toHaveCount(0);
    const footerLinkTops = await page.locator(".footer-links a").evaluateAll((links) =>
      links.map((link) => Math.round(link.getBoundingClientRect().top)),
    );
    expect(new Set(footerLinkTops).size).toBeLessThanOrEqual(1);
    await expect(page.locator(".site-footer.home-footer")).toHaveCount(0);
  }

  await page.goto("/posts/");
  await expect(page.locator(".recent-posts small")).toHaveCount(0);
  const previewHeights = await page.locator(".recent-posts.is-active a").evaluateAll((links) =>
    links.map((link) => Math.round(link.getBoundingClientRect().height)),
  );
  expect(new Set(previewHeights).size).toBeLessThanOrEqual(1);

  const alignment = await page.evaluate(() => {
    const heroElement = document.querySelector(".manuscript-hero");
    const shellElement = document.querySelector(".manuscript-shell");
    const title = document.querySelector(".manuscript-hero .page-title-sm");
    const toolbar = document.querySelector(".manuscript-toolbar");
    if (!heroElement || !shellElement || !title || !toolbar) return null;
    const hero = heroElement.getBoundingClientRect();
    const shell = shellElement.getBoundingClientRect();
    return {
      heroLeft: Math.round(hero.left),
      shellLeft: Math.round(shell.left),
      heroWidth: Math.round(hero.width),
      shellWidth: Math.round(shell.width),
      titleSize: getComputedStyle(title).fontSize,
      shellBorderTop: getComputedStyle(shellElement).borderTopWidth,
      toolbarRadius: getComputedStyle(toolbar).borderRadius,
    };
  });

  expect(alignment).not.toBeNull();
  expect(alignment?.heroLeft).toBe(alignment?.shellLeft);
  expect(alignment?.heroWidth).toBe(alignment?.shellWidth);
  expect(alignment?.titleSize).toBe("30px");
  expect(alignment?.shellBorderTop).toBe("0px");
  // The toolbar is a flush masthead, not a floating card: no corner radius.
  expect(alignment?.toolbarRadius).toBe("0px");

  // The active tab's ink mark has to settle onto the toolbar's baseline rule,
  // spanning exactly the active label. Width is animated, so poll for the
  // resting value rather than catching it mid-transition.
  const measureInk = () => page.evaluate(() => {
    const toolbar = document.querySelector(".manuscript-toolbar");
    const indicator = document.querySelector(".manuscript-tab-indicator");
    const active = document.querySelector('[data-manuscript-tab][aria-selected="true"]');
    if (!toolbar || !indicator || !active) return null;
    const ink = indicator.getBoundingClientRect();
    const tab = active.getBoundingClientRect();
    return {
      fromBaseline: Math.round(toolbar.getBoundingClientRect().bottom - ink.bottom),
      widthDelta: Math.abs(tab.width - ink.width),
      leftDelta: Math.abs(tab.left - ink.left),
    };
  });

  await expect.poll(async () => (await measureInk())?.widthDelta ?? Infinity).toBeLessThanOrEqual(1);
  const ink = await measureInk();
  expect(ink?.fromBaseline).toBe(0);
  expect(ink?.leftDelta).toBeLessThanOrEqual(1);

  await expect(page.locator(".manuscript-toolbar-intro")).toContainText("顺时间读，按门类找，或看全貌。");
  await expect(page.locator(".manuscript-tabs")).toContainText("编年");
  await expect(page.locator(".manuscript-tabs")).toContainText("门类");
  await expect(page.locator(".manuscript-tabs")).toContainText("全览");
  await expect(page.locator(".manuscript-search")).toContainText("寻一篇");

  // The section is called 文稿 throughout, so the copy must not slip to 文章.
  const archiveCopy = await page.locator(".manuscript-shell").innerText();
  expect(archiveCopy).not.toMatch(/文章/);
});

test("home publication trace groups posts into weekly area-scaled circles", async ({ page }) => {
  await page.goto("/");

  const traceNodes = page.locator(".trace-node");
  await expect(traceNodes).toHaveCount(3);
  await expect(page.locator(".home-hero > .home-trace-hero")).toHaveCount(1);
  await expect(page.locator("main > .home-trace")).toHaveCount(0);
  await expect(page.locator(".trace-foot")).toHaveCount(0);
  await expect(page.locator("[data-writing-trace-axis] time")).toHaveCount(0);
  await expect(page.locator(".trace-moon-last-quarter")).toHaveCount(1);
  await expect(page.locator(".trace-moon-new")).toHaveCount(1);
  await expect(page.locator(".trace-moon-full")).toHaveCount(1);

  const bubbles = await traceNodes.evaluateAll((nodes) =>
    nodes.map((node) => {
      const mark = node.querySelector<HTMLElement>(".trace-node-mark");
      const box = mark?.getBoundingClientRect();
      return {
        count: Number(node.getAttribute("data-count")),
        width: box?.width ?? 0,
        height: box?.height ?? 0,
        radius: mark ? getComputedStyle(mark).borderRadius : "",
      };
    }),
  );
  expect(bubbles.map((bubble) => bubble.count)).toEqual([2, 1, 3]);
  expect(bubbles.every((bubble) => bubble.width === bubble.height && bubble.radius === "50%")).toBe(true);
  const onePost = bubbles.find((bubble) => bubble.count === 1);
  const threePosts = bubbles.find((bubble) => bubble.count === 3);
  expect(onePost).toBeDefined();
  expect(threePosts).toBeDefined();
  const areaRatio = ((threePosts?.width ?? 0) ** 2) / ((onePost?.width ?? 1) ** 2);
  expect(areaRatio).toBeGreaterThan(2.8);
  expect(areaRatio).toBeLessThan(3.2);
  const centers = await traceNodes.evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return box.left + box.width / 2;
    }),
  );
  expect(centers[1] - centers[0]).toBeGreaterThanOrEqual(24);

  const lightMoons = await page.evaluate(() => ({
    full: getComputedStyle(document.querySelector(".trace-moon-full")!).backgroundColor,
    newMoon: getComputedStyle(document.querySelector(".trace-moon-new")!).backgroundColor,
    fullBorder: getComputedStyle(document.querySelector(".trace-moon-full")!).borderColor,
    newBorder: getComputedStyle(document.querySelector(".trace-moon-new")!).borderColor,
  }));
  await page.locator("#theme-button").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const darkMoons = await page.evaluate(() => ({
    full: getComputedStyle(document.querySelector(".trace-moon-full")!).backgroundColor,
    newMoon: getComputedStyle(document.querySelector(".trace-moon-new")!).backgroundColor,
    fullBorder: getComputedStyle(document.querySelector(".trace-moon-full")!).borderColor,
    newBorder: getComputedStyle(document.querySelector(".trace-moon-new")!).borderColor,
  }));
  expect(lightMoons.full).toBe("rgba(0, 0, 0, 0)");
  expect(darkMoons.newMoon).toBe("rgba(0, 0, 0, 0)");
  expect(lightMoons.newMoon).not.toBe(lightMoons.full);
  expect(darkMoons.full).not.toBe(darkMoons.newMoon);
  expect(lightMoons.fullBorder).not.toBe(darkMoons.fullBorder);
  expect(lightMoons.newBorder).not.toBe(darkMoons.newBorder);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const traceAxis = page.locator("[data-writing-trace-axis]");
  await expect.poll(() => traceAxis.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  const latestVisibility = await page.evaluate(() => {
    const axis = document.querySelector("[data-writing-trace-axis]");
    const latest = document.querySelector(".trace-node-current");
    if (!axis || !latest) return null;
    const axisBox = axis.getBoundingClientRect();
    const latestBox = latest.getBoundingClientRect();
    return latestBox.left >= axisBox.left && latestBox.right <= axisBox.right;
  });
  expect(latestVisibility).toBe(true);
});

test("motion enhancements are stateful and progressively enhanced", async ({ page }) => {
  await page.route("**/essays/", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      '<section class="essay-stream shell">',
      '<section class="essay-stream shell"><article class="essay-note paper-reveal">Motion fixture</article>',
    );
    await route.fulfill({ response, body });
  });
  await page.route("**/posts/**", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      '<article class="article-column article-body">',
      `<article class="article-column article-body"><img alt="Motion fixture" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='18'%3E%3Crect width='32' height='18' fill='%23d66b77'/%3E%3C/svg%3E">`,
    );
    await route.fulfill({ response, body });
  });
  await page.addInitScript(() => {
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: (update: () => void) => {
        const state = window as typeof window & { __themeTransitionCalls?: number };
        state.__themeTransitionCalls = (state.__themeTransitionCalls ?? 0) + 1;
        update();
        return {
          finished: Promise.resolve(),
          ready: Promise.resolve(),
          updateCallbackDone: Promise.resolve(),
          skipTransition: () => undefined,
        };
      },
    });

  });

  await page.goto("/");
  await page.locator("#theme-button").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(() => page.evaluate(() => (
    (window as typeof window & { __themeTransitionCalls?: number }).__themeTransitionCalls ?? 0
  ))).toBe(1);
  await expect.poll(() => page.locator("html").evaluate((element) => (
    element.style.getPropertyValue("--theme-radius")
  ))).toMatch(/px$/);

  await page.goto("/posts/");
  const tabList = page.locator(".manuscript-tabs");
  await expect(tabList).toHaveClass(/indicator-ready/);
  const initialIndicatorX = await tabList.evaluate((element) => (
    element.style.getPropertyValue("--tab-indicator-x")
  ));
  await page.locator('[data-manuscript-tab="category"]').click();
  await expect.poll(() => tabList.evaluate((element) => (
    element.style.getPropertyValue("--tab-indicator-x")
  ))).not.toBe(initialIndicatorX);
  const articleHref = await page.locator('a.timeline-item[href^="/posts/"]').first().getAttribute("href")
    ?? "/posts/tvm-function-objects-and-registration/";

  await page.goto("/essays/");
  const paper = page.locator(".paper-reveal").first();
  await expect(paper).toHaveClass(/visible/);
  await expect(paper).toHaveCSS("opacity", "1");

  await page.goto(articleHref);
  const revealedImage = page.locator(".article-body img").first();
  await expect(revealedImage).toHaveAttribute("data-image-reveal", "");
  await expect(revealedImage).toHaveClass(/image-reveal-loaded/);

  await page.evaluate(() => window.scrollTo(0, Math.min(900, document.documentElement.scrollHeight / 2)));
  await expect.poll(() => page.locator(".reading-progress").evaluate((element) => (
    Number.parseFloat(element.style.getPropertyValue("--progress"))
  ))).toBeGreaterThan(0);

  const tocLink = page.locator(".toc a").first();
  if (await tocLink.count()) {
    const targetHash = await tocLink.getAttribute("href");
    await tocLink.click();
    await expect.poll(() => page.evaluate(() => decodeURIComponent(window.location.hash))).toBe(targetHash);
  }
});

test("enhanced motion respects reduced-motion preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/essays/", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      '<section class="essay-stream shell">',
      '<section class="essay-stream shell"><article class="essay-note paper-reveal">Reduced motion fixture</article>',
    );
    await route.fulfill({ response, body });
  });

  await page.goto("/essays/");
  const paper = page.locator(".paper-reveal").first();
  await expect(paper).toHaveCSS("opacity", "1");
  await expect(paper).toHaveCSS("transform", "none");
});

test("every published post has an article page and structured data", async ({ page }) => {
  await page.goto("/posts/");
  const articleLinks = await page.locator('a.timeline-item[href^="/posts/"]').evaluateAll((links) =>
    [...new Set(links.map((link) => (link as HTMLAnchorElement).pathname))],
  );
  expect(articleLinks.length).toBeGreaterThan(0);

  for (const href of articleLinks) {
    await page.goto(href);
    await expect(page.locator("article")).toBeVisible();
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  }
});

test("article table of contents encodes heading hierarchy", async ({ page }) => {
  await page.goto("/posts/mlsys-knowledge-distillation/");

  const toc = page.locator(".toc");
  const sectionLink = toc.getByRole("link", { name: "知识蒸馏简介", exact: true });
  const subsectionLink = toc.getByRole("link", { name: "背景与挑战", exact: true });

  // The page header already prints the title, so the H1 must not repeat in the TOC.
  await expect(toc.getByRole("link", { name: "知识蒸馏 (Knowledge Distillation)", exact: true })).toHaveCount(0);
  await expect(sectionLink).toHaveAttribute("data-toc-depth", "0");
  await expect(subsectionLink).toHaveAttribute("data-toc-depth", "1");

  // Depth is shown by the leading rule getting shorter, not by indentation.
  const ruleWidths = await Promise.all([
    sectionLink.locator(".toc-rule").evaluate((element) => element.getBoundingClientRect().width),
    subsectionLink.locator(".toc-rule").evaluate((element) => element.getBoundingClientRect().width),
  ]);
  expect(ruleWidths[0]).toBeGreaterThan(ruleWidths[1]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobileToc = page.locator(".toc-list");
  const mobileOverflow = await mobileToc.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  expect(mobileOverflow.clientHeight).toBeLessThanOrEqual(280);
  expect(mobileOverflow.scrollHeight).toBeGreaterThan(mobileOverflow.clientHeight);
  expect(mobileOverflow.overflowY).toBe("auto");
});

test("long article bodies are readable immediately without waiting for a scroll reveal", async ({ page }) => {
  await page.goto("/posts/tvm-relay-ir-optimization-methods/", { waitUntil: "domcontentloaded" });

  const articleBody = page.locator(".article-body");
  await expect(articleBody).toHaveCSS("opacity", "1");
  await expect(articleBody).not.toHaveClass(/\breveal\b/);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("KaTeX keeps its accessible MathML layer from duplicating formulas visually", async ({ page }) => {
  await page.goto("/posts/mlsys-quantization/");

  const mathmlLayer = page.locator(".katex-mathml").first();
  const visualLayer = page.locator(".katex-html").first();
  await expect(mathmlLayer).toHaveCount(1);
  await expect(visualLayer).toHaveCount(1);

  const layers = await page.evaluate(() => {
    const mathml = document.querySelector<HTMLElement>(".katex-mathml");
    const visual = document.querySelector<HTMLElement>(".katex-html");
    if (!mathml || !visual) return null;

    const mathmlStyle = getComputedStyle(mathml);
    const mathmlBox = mathml.getBoundingClientRect();
    const visualBox = visual.getBoundingClientRect();
    return {
      mathmlPosition: mathmlStyle.position,
      mathmlOverflow: mathmlStyle.overflow,
      mathmlWidth: Math.round(mathmlBox.width),
      mathmlHeight: Math.round(mathmlBox.height),
      visualWidth: Math.round(visualBox.width),
      visualHeight: Math.round(visualBox.height),
    };
  });

  expect(layers).not.toBeNull();
  expect(layers?.mathmlPosition).toBe("absolute");
  expect(layers?.mathmlOverflow).toBe("hidden");
  expect(layers?.mathmlWidth).toBeLessThanOrEqual(1);
  expect(layers?.mathmlHeight).toBeLessThanOrEqual(1);
  expect(layers?.visualWidth).toBeGreaterThan(1);
  expect(layers?.visualHeight).toBeGreaterThan(1);
});
