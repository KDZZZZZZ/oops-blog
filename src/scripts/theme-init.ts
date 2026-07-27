export const themeInitScript = `(() => {
  const root = document.documentElement;
  root.classList.add("js");
  try {
    const stored = localStorage.getItem("oops-theme");
    const theme = stored === "light" || stored === "dark"
      ? stored
      : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#1d1b18" : "#f3f1ec");
  } catch {
    root.dataset.theme = root.dataset.theme || "light";
  }
})();`;
