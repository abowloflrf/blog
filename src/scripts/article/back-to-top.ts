import { getScrollBehavior } from "../motion";

export function initBackToTop(signal: AbortSignal) {
  const root = document.documentElement;
  const container = document.querySelector<HTMLElement>("#btt-btn-container");
  const button = container?.querySelector<HTMLButtonElement>(
    "[data-button='back-to-top']"
  );
  const indicator = container?.querySelector<HTMLElement>(
    "#progress-indicator"
  );
  if (!container || !button || !indicator) return;

  button.addEventListener(
    "click",
    () => {
      const main = document.getElementById("main-content");
      if (main) {
        main.setAttribute("tabindex", "-1");
        main.addEventListener("blur", () => main.removeAttribute("tabindex"), {
          once: true,
          signal,
        });
        main.focus({ preventScroll: true });
      }
      window.scrollTo({ top: 0, behavior: getScrollBehavior() });
    },
    { signal }
  );

  let frame = 0;
  let lastVisible: boolean | undefined;
  const update = () => {
    frame = 0;
    const total = root.scrollHeight - root.clientHeight;
    const progress =
      total > 0 ? Math.min(1, Math.max(0, root.scrollTop / total)) : 0;
    const percent = Math.floor(progress * 100);
    indicator.style.backgroundImage = `conic-gradient(var(--accent), var(--accent) ${percent}%, transparent ${percent}%)`;

    const visible = progress > 0.3;
    if (visible === lastVisible) return;
    container.inert = !visible;
    container.classList.toggle("pointer-events-none", !visible);
    container.classList.toggle("opacity-100", visible);
    container.classList.toggle("translate-y-0", visible);
    container.classList.toggle("opacity-0", !visible);
    container.classList.toggle("translate-y-14", !visible);
    lastVisible = visible;
  };
  function scheduleUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  document.addEventListener("scroll", scheduleUpdate, {
    passive: true,
    signal,
  });
  window.addEventListener("resize", scheduleUpdate, { signal });
  const observer = new ResizeObserver(scheduleUpdate);
  observer.observe(document.body);
  signal.addEventListener(
    "abort",
    () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    },
    { once: true }
  );
  update();
}
