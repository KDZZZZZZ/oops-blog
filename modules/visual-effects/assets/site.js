(() => {
  const root = document.documentElement;
  const header = document.getElementById('site-header');
  const hero = document.querySelector('.home-hero');
  const themeButton = document.getElementById('theme-button');
  const themeIcon = document.getElementById('theme-icon');
  const menu = document.getElementById('mobile-menu');
  const menuButton = document.getElementById('menu-button');
  const menuClose = document.getElementById('menu-close');
  const searchDialog = document.getElementById('search-dialog');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const searchIndex = [
    { type: '文稿', title: '两级 IR 之间，Lowering 到底负责什么', summary: '从高层算子语义到循环与内存访问，梳理一条可追踪的降级路径。', href: 'article-lowering.html', terms: 'Relay TIR Lowering AI 编译器' },
    { type: '文稿', title: 'WebSocket 不是状态机', summary: '连接只负责传输，可靠恢复需要独立的事件语义与状态投影。', href: 'posts.html#websocket', terms: 'Agent WebSocket session resume 事件' },
    { type: '文稿', title: '为什么远离 frontier 的 token 不该被过早相信', summary: '记录 Dist Penalty 的问题定位、启发式设计与实验观察。', href: 'posts.html#dist-penalty', terms: 'DLLM inference Dist Penalty token' },
    { type: '随笔', title: '先把运行时边界做清楚', summary: '模块加载、张量生命周期和设备调度不该在同一个接口里互相猜测。', href: 'essays.html#runtime-boundary', terms: 'RuntimeSession runtime 编译器 边界' },
    { type: '随笔', title: '一次精度回落的复盘', summary: '先确认观测方式，再解释模型行为。', href: 'essays.html#profiling', terms: 'profiling Dist Penalty 实验 推理' },
    { type: '随笔', title: '连接不是状态', summary: '真正需要恢复的是事件序列和业务投影。', href: 'essays.html#connection-state', terms: 'Agent WebSocket 状态 连接' }
  ];

  const icons = {
    sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"></path>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>'
  };

  function setTheme(theme) {
    root.dataset.theme = theme;
    if (themeIcon) themeIcon.innerHTML = theme === 'dark' ? icons.sun : icons.moon;
    if (themeButton) {
      themeButton.title = theme === 'dark' ? '切换到浅色主题' : '切换到深色主题';
      themeButton.setAttribute('aria-label', themeButton.title);
    }
    const color = theme === 'dark' ? '#1d1b18' : '#f9f8f5';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  }

  const preferred = localStorage.getItem('oops-theme');
  setTheme(preferred || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  themeButton?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('oops-theme', next);
  });

  document.querySelectorAll('[data-enter]').forEach((node) => requestAnimationFrame(() => node.classList.add('entered')));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach((node) => observer.observe(node));

  let ticking = false;
  let lastScrollY = window.scrollY;
  let scrollDirection = 0;
  let scrollTravel = 0;
  let keyboardNavigation = false;
  const TOP_REVEAL_Y = 96;
  const HIDE_AFTER_Y = 180;
  const HIDE_TRAVEL = 72;
  const REVEAL_TRAVEL = 28;

  addEventListener('keydown', (event) => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow')) keyboardNavigation = true;
  }, true);
  addEventListener('pointerdown', () => {
    keyboardNavigation = false;
  }, true);

  function updateScrollState() {
    const y = Math.max(0, window.scrollY);
    const delta = y - lastScrollY;
    header?.classList.toggle('scrolled', y > 12);
    if (header && !reduceMotion) {
      if (Math.abs(delta) >= 1 && !keyboardNavigation && header.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      if (Math.abs(delta) >= 1) {
        const nextDirection = delta > 0 ? 1 : -1;
        if (nextDirection !== scrollDirection) {
          scrollDirection = nextDirection;
          scrollTravel = 0;
        }
        scrollTravel += Math.abs(delta);
      }

      const interactionOpen = document.body.classList.contains('menu-open')
        || searchDialog?.open
        || (keyboardNavigation && header.contains(document.activeElement));

      if (y < TOP_REVEAL_Y || interactionOpen) {
        header.classList.remove('header-hidden');
        scrollTravel = 0;
      } else if (scrollDirection < 0 && scrollTravel >= REVEAL_TRAVEL) {
        header.classList.remove('header-hidden');
        scrollTravel = 0;
      } else if (scrollDirection > 0 && y > HIDE_AFTER_Y && scrollTravel >= HIDE_TRAVEL) {
        header.classList.add('header-hidden');
        scrollTravel = 0;
      }
    }
    if (hero && !reduceMotion) {
      const progress = Math.min(1, Math.max(0, y / Math.max(360, hero.offsetHeight * .74)));
      hero.style.setProperty('--hero-progress', progress.toFixed(3));
    }
    lastScrollY = y;
    ticking = false;
  }
  addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateScrollState);
      ticking = true;
    }
  }, { passive: true });
  updateScrollState();

  function openMenu() {
    header?.classList.remove('header-hidden');
    menu?.classList.add('open');
    menu?.setAttribute('aria-hidden', 'false');
    menuButton?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    menuClose?.focus();
  }
  function closeMenu() {
    menu?.classList.remove('open');
    menu?.setAttribute('aria-hidden', 'true');
    menuButton?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    menuButton?.focus();
  }
  menuButton?.addEventListener('click', openMenu);
  menuClose?.addEventListener('click', closeMenu);
  menu?.addEventListener('click', (event) => { if (event.target === menu) closeMenu(); });
  menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  document.querySelectorAll('.filter-button').forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.filter;
      document.querySelectorAll('.filter-button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      document.querySelectorAll('[data-category]').forEach((row) => {
        row.hidden = category !== 'all' && row.dataset.category !== category;
      });
    });
  });

  const manuscriptTabs = Array.from(document.querySelectorAll('[data-manuscript-tab]'));
  const manuscriptPanels = Array.from(document.querySelectorAll('[data-manuscript-panel]'));

  function selectManuscriptTab(name, focus = false) {
    manuscriptTabs.forEach((tab) => {
      const selected = tab.dataset.manuscriptTab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    manuscriptPanels.forEach((panel) => {
      panel.hidden = panel.dataset.manuscriptPanel !== name;
    });
  }

  manuscriptTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectManuscriptTab(tab.dataset.manuscriptTab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + manuscriptTabs.length) % manuscriptTabs.length;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % manuscriptTabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = manuscriptTabs.length - 1;
      selectManuscriptTab(manuscriptTabs[nextIndex].dataset.manuscriptTab, true);
    });
  });

  const postPreview = document.querySelector('.nav-preview-posts');
  const postCategoryTabs = Array.from(postPreview?.querySelectorAll('[data-post-category]') || []);
  const postCategoryPanels = Array.from(postPreview?.querySelectorAll('[data-post-panel]') || []);
  const postPreviewCount = postPreview?.querySelector('[data-post-preview-count]');

  function selectPostCategory(name, focus = false) {
    postCategoryTabs.forEach((tab) => {
      const selected = tab.dataset.postCategory === name;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    postCategoryPanels.forEach((panel) => {
      panel.hidden = panel.dataset.postPanel !== name;
    });
    const selectedTab = postCategoryTabs.find((tab) => tab.dataset.postCategory === name);
    if (postPreviewCount && selectedTab) {
      postPreviewCount.textContent = `${selectedTab.querySelector('b')?.textContent || ''} · ${selectedTab.querySelector('small')?.textContent || '0'} 篇`;
    }
  }

  postCategoryTabs.forEach((tab, index) => {
    const select = () => selectPostCategory(tab.dataset.postCategory);
    tab.addEventListener('pointerenter', select);
    tab.addEventListener('focus', select);
    tab.addEventListener('click', select);
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === 'ArrowUp') nextIndex = (index - 1 + postCategoryTabs.length) % postCategoryTabs.length;
      if (event.key === 'ArrowDown') nextIndex = (index + 1) % postCategoryTabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = postCategoryTabs.length - 1;
      selectPostCategory(postCategoryTabs[nextIndex].dataset.postCategory, true);
    });
  });

  function openSearch() {
    if (!searchDialog) return;
    header?.classList.remove('header-hidden');
    if (typeof searchDialog.showModal === 'function') searchDialog.showModal();
    else searchDialog.setAttribute('open', '');
    requestAnimationFrame(() => searchInput?.focus());
  }
  function closeSearch() {
    if (!searchDialog) return;
    if (typeof searchDialog.close === 'function') searchDialog.close();
    else searchDialog.removeAttribute('open');
  }
  document.querySelectorAll('[data-open-search]').forEach((button) => button.addEventListener('click', openSearch));
  document.getElementById('search-close')?.addEventListener('click', closeSearch);
  searchDialog?.addEventListener('click', (event) => { if (event.target === searchDialog) closeSearch(); });
  searchDialog?.addEventListener('close', () => {
    if (searchInput) searchInput.value = '';
    renderResults('');
  });

  function renderResults(query) {
    if (!searchResults) return;
    const term = query.trim().toLowerCase();
    if (!term) {
      searchResults.className = 'search-hint';
      searchResults.textContent = '输入关键词，例如“LLVM”“Agent”或“推理”。';
      return;
    }
    const matches = searchIndex.filter((item) => `${item.title} ${item.summary} ${item.terms}`.toLowerCase().includes(term));
    if (!matches.length) {
      searchResults.className = 'search-hint';
      searchResults.textContent = '没有匹配内容，可以换一个更短的关键词。';
      return;
    }
    searchResults.className = '';
    searchResults.replaceChildren(...matches.map((item) => {
      const link = document.createElement('a');
      link.className = 'search-result';
      link.href = item.href;
      const type = document.createElement('small');
      type.textContent = item.type;
      const title = document.createElement('strong');
      title.textContent = item.title;
      const summary = document.createElement('span');
      summary.textContent = item.summary;
      link.append(type, title, summary);
      return link;
    }));
  }
  searchInput?.addEventListener('input', (event) => renderResults(event.target.value));

  addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearch();
    }
    if (event.key === 'Escape' && menu?.classList.contains('open')) closeMenu();
  });
})();
