export function initReadingWidth(signal: AbortSignal) {
  const main = document.querySelector<HTMLElement>(".post-main");
  const toolbar = document.querySelector<HTMLElement>("[data-post-toolbar]");
  const toggles = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-reading-width-toggle]")
  );
  if (!main || toggles.length === 0) return;

  const setWideLayout = (wide: boolean) => {
    main.dataset.readingWidth = wide ? "wide" : "default";
    if (toolbar) {
      toolbar.dataset.readingWidth = wide ? "wide" : "default";
    }

    for (const toggle of toggles) {
      const label = wide
        ? toggle.dataset.defaultLabel
        : toggle.dataset.wideLabel;
      toggle.setAttribute("aria-pressed", String(wide));
      toggle.setAttribute("aria-label", label ?? "Change reading width");
      toggle.setAttribute("title", label ?? "Change reading width");
      toggle
        .querySelector("[data-reading-width-expand-icon]")
        ?.classList.toggle("hidden", wide);
      toggle
        .querySelector("[data-reading-width-collapse-icon]")
        ?.classList.toggle("hidden", !wide);
    }

    main.dispatchEvent(
      new CustomEvent("reading-width-change", { detail: { wide } })
    );
  };

  for (const toggle of toggles) {
    toggle.addEventListener(
      "click",
      () => setWideLayout(main.dataset.readingWidth !== "wide"),
      { signal }
    );
  }

  const shouldStartWide = window.matchMedia(
    "(min-width: 48rem) and (orientation: portrait) and (hover: none) and (pointer: coarse)"
  ).matches;
  setWideLayout(shouldStartWide);
}
