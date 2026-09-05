const THEME_KEY = "theme";
const LIGHT = "light";
const DARK = "dark";
const GISCUS_ORIGIN = "https://giscus.app";

function getPreferredTheme(): string {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) return stored;
  return LIGHT;
}

// Reuse the value already set by the inline FOUC-prevention script if available.
let themeValue: string =
  (window as unknown as { __theme?: { value: string } }).__theme?.value ??
  getPreferredTheme();

function persist(): void {
  localStorage.setItem(THEME_KEY, themeValue);
  reflect();
}

function syncGiscusTheme(): boolean {
  const iframe = document.querySelector<HTMLIFrameElement>(
    "iframe.giscus-frame"
  );
  if (!iframe?.contentWindow) return false;

  const theme = themeValue === DARK ? "noborder_dark" : "noborder_light";
  iframe.contentWindow.postMessage(
    { giscus: { setConfig: { theme } } },
    GISCUS_ORIGIN
  );
  return true;
}

function watchGiscusTheme(): void {
  const container = document.querySelector(".giscus");
  if (!container) return;

  const bindFrame = (): boolean => {
    const iframe = container.querySelector<HTMLIFrameElement>(
      "iframe.giscus-frame"
    );
    if (!iframe) return false;

    iframe.addEventListener("load", syncGiscusTheme, { once: true });
    syncGiscusTheme();
    return true;
  };

  if (bindFrame()) return;

  const observer = new MutationObserver(() => {
    if (bindFrame()) observer.disconnect();
  });
  observer.observe(container, { childList: true, subtree: true });
}

function reflect(): void {
  const root = document.firstElementChild;
  root?.setAttribute("data-theme", themeValue);
  root?.classList.toggle("dark", themeValue === DARK);
  document
    .querySelector("#theme-btn")
    ?.setAttribute("aria-pressed", String(themeValue === DARK));

  // Fill <meta name="theme-color"> with the computed background colour so
  // Android's browser chrome matches the page background.
  const bg = window.getComputedStyle(document.body).backgroundColor;
  document
    .querySelector("meta[name='theme-color']")
    ?.setAttribute("content", bg);

  syncGiscusTheme();
}

function setup(): void {
  reflect();
  watchGiscusTheme();
  document.querySelector("#theme-btn")?.addEventListener("click", () => {
    themeValue = themeValue === LIGHT ? DARK : LIGHT;
    persist();
  });
}

setup();

// Re-run after View Transitions navigation.
document.addEventListener("astro:after-swap", setup);

// Carry the theme-color value across View Transitions to prevent the
// Android navigation bar from flashing during page transitions.
document.addEventListener("astro:before-swap", event => {
  const color = document
    .querySelector("meta[name='theme-color']")
    ?.getAttribute("content");
  if (color) {
    (event as { newDocument: Document }).newDocument
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", color);
  }
});
