import { getScrollBehavior } from "../motion";

export function initTableOfContents(signal: AbortSignal) {
  const toc = document.querySelector<HTMLElement>("[data-toc]");
  const main = document.querySelector<HTMLElement>(".post-main");
  const peek = document.querySelector<HTMLElement>("[data-toc-peek]");
  const trigger =
    document.querySelector<HTMLButtonElement>("[data-toc-trigger]");
  const backToTopButton = toc?.querySelector<HTMLButtonElement>(
    "[data-toc-back-to-top]"
  );
  const tocLinks = toc
    ? Array.from(toc.querySelectorAll<HTMLAnchorElement>("[data-toc-link]"))
    : [];
  const tocMarkers = peek
    ? Array.from(peek.querySelectorAll<HTMLElement>("[data-toc-marker]"))
    : [];
  const tocHeadings = tocLinks
    .map(link => document.getElementById(link.dataset.headingId ?? ""))
    .filter((heading): heading is HTMLElement => heading !== null);
  let previewHeadingId: string | null = null;
  let lastTriggerPointerType = "";
  let lastTriggerTouchAt = 0;
  let restoringTriggerFocus = false;

  function setActiveTocHeading(id: string | undefined) {
    for (const link of tocLinks) {
      const isActive = link.dataset.headingId === id;
      if (isActive) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    }

    for (const marker of tocMarkers) {
      const isActive = marker.dataset.headingId === id;
      if (isActive) {
        marker.setAttribute("aria-current", "location");
      } else {
        marker.removeAttribute("aria-current");
      }
    }
  }

  function updateActiveTocHeading() {
    if (tocHeadings.length === 0) return;

    const activationLine = window.innerHeight * 0.25;
    let activeHeading = tocHeadings[0];

    for (const heading of tocHeadings) {
      if (heading.getBoundingClientRect().top > activationLine) break;
      activeHeading = heading;
    }

    setActiveTocHeading(activeHeading.id);
  }

  function findClosestTocMarker(clientY: number) {
    if (tocMarkers.length === 0) return null;

    let closestMarker = tocMarkers[0];
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const marker of tocMarkers) {
      const rect = marker.getBoundingClientRect();
      const distance = Math.abs(clientY - (rect.top + rect.height / 2));
      if (distance >= closestDistance) continue;
      closestMarker = marker;
      closestDistance = distance;
    }

    return closestMarker;
  }

  function setPreviewTocHeading(id: string | undefined) {
    if (!id || previewHeadingId === id) return;
    previewHeadingId = id;
    peek?.classList.add("is-previewing");

    for (const marker of tocMarkers) {
      marker.toggleAttribute(
        "data-preview-current",
        marker.dataset.headingId === id
      );
    }

    let previewLink: HTMLAnchorElement | null = null;
    for (const link of tocLinks) {
      const isPreviewed = link.dataset.headingId === id;
      link.toggleAttribute("data-preview-current", isPreviewed);
      if (isPreviewed) previewLink = link;
    }

    if (toc && previewLink) {
      const tocRect = toc.getBoundingClientRect();
      const linkRect = previewLink.getBoundingClientRect();
      const safeTop = tocRect.top + 3.5 * 16;
      const safeBottom = tocRect.bottom - 16;

      if (linkRect.top < safeTop || linkRect.bottom > safeBottom) {
        toc.scrollTop +=
          linkRect.top - tocRect.top - tocRect.height / 2 + linkRect.height / 2;
      }
    }
  }

  function clearPreviewTocHeading() {
    previewHeadingId = null;
    peek?.classList.remove("is-previewing");
    for (const marker of tocMarkers) {
      marker.removeAttribute("data-preview-current");
    }
    for (const link of tocLinks) {
      link.removeAttribute("data-preview-current");
    }
  }

  if (tocHeadings.length > 0) {
    updateActiveTocHeading();

    const tocObserver = new IntersectionObserver(updateActiveTocHeading, {
      rootMargin: "0px 0px -75% 0px",
    });

    for (const heading of tocHeadings) tocObserver.observe(heading);
    signal.addEventListener("abort", () => tocObserver.disconnect(), {
      once: true,
    });

    for (const link of tocLinks) {
      link.addEventListener(
        "pointerenter",
        event => {
          if (
            event.pointerType !== "touch" &&
            main?.dataset.readingWidth === "wide"
          ) {
            setPreviewTocHeading(link.dataset.headingId);
          }
        },
        { signal }
      );
      link.addEventListener(
        "click",
        () => {
          setActiveTocHeading(link.dataset.headingId);
          closePopover();
        },
        { signal }
      );
    }
  }

  function openPopover(moveFocus = false) {
    if (
      main?.dataset.readingWidth !== "wide" ||
      !window.matchMedia("(min-width: 48rem)").matches
    ) {
      return;
    }

    peek?.classList.add("is-open");
    trigger?.setAttribute("aria-expanded", "true");
    trigger?.setAttribute(
      "aria-label",
      trigger.dataset.closeLabel ?? "Close table of contents"
    );

    if (moveFocus) {
      requestAnimationFrame(() => {
        if (signal.aborted) return;
        const currentLink = toc?.querySelector<HTMLAnchorElement>(
          '[data-toc-link][aria-current="location"]'
        );
        (currentLink ?? tocLinks[0])?.focus();
      });
    }
  }

  function closePopover() {
    clearPreviewTocHeading();
    peek?.classList.remove("is-open");
    trigger?.setAttribute("aria-expanded", "false");
    trigger?.setAttribute(
      "aria-label",
      trigger.dataset.openLabel ?? "Open table of contents"
    );
  }

  trigger?.addEventListener(
    "focus",
    () => {
      if (restoringTriggerFocus) {
        restoringTriggerFocus = false;
        return;
      }
      requestAnimationFrame(() => {
        if (signal.aborted) return;
        if (trigger.matches(":focus-visible")) openPopover();
      });
    },
    { signal }
  );
  trigger?.addEventListener(
    "pointerdown",
    event => {
      lastTriggerPointerType = event.pointerType;
    },
    { signal }
  );
  trigger?.addEventListener(
    "touchstart",
    () => {
      lastTriggerTouchAt = performance.now();
    },
    { signal, passive: true }
  );
  trigger?.addEventListener(
    "click",
    event => {
      if (event.detail === 0) {
        openPopover(true);
        return;
      }

      const pointerType = event.pointerType || lastTriggerPointerType;
      const isTouchInteraction =
        pointerType === "touch" ||
        performance.now() - lastTriggerTouchAt < 1000;

      if (isTouchInteraction) {
        lastTriggerTouchAt = 0;
        if (peek?.classList.contains("is-open")) {
          closePopover();
          trigger.blur();
        } else {
          const marker = findClosestTocMarker(event.clientY);
          setPreviewTocHeading(marker?.dataset.headingId);
          openPopover();
        }
        return;
      }

      if (pointerType !== "touch") {
        const marker = findClosestTocMarker(event.clientY);
        const link = tocLinks.find(
          item => item.dataset.headingId === marker?.dataset.headingId
        );

        if (link) {
          link.click();
          trigger.blur();
          return;
        }
      }

      if (peek?.classList.contains("is-open")) {
        closePopover();
        trigger.blur();
      } else {
        openPopover();
      }
    },
    { signal }
  );
  trigger?.addEventListener(
    "pointermove",
    event => {
      if (event.pointerType === "touch") return;

      const marker = findClosestTocMarker(event.clientY);
      setPreviewTocHeading(marker?.dataset.headingId);
    },
    { signal }
  );
  peek?.addEventListener(
    "pointerleave",
    event => {
      if (event.pointerType !== "touch") clearPreviewTocHeading();
    },
    { signal }
  );
  peek?.addEventListener(
    "focusout",
    () => {
      requestAnimationFrame(() => {
        if (signal.aborted) return;
        if (!peek.contains(document.activeElement)) closePopover();
      });
    },
    { signal }
  );
  document.addEventListener(
    "pointerdown",
    event => {
      if (!peek?.contains(event.target as Node | null)) closePopover();
    },
    { signal }
  );
  main?.addEventListener(
    "reading-width-change",
    () => {
      if (main?.dataset.readingWidth === "wide") return;
      const focused = document.activeElement;
      const focusWasInToc = peek?.contains(focused);
      closePopover();
      if (!focusWasInToc) return;
      requestAnimationFrame(() => {
        if (signal.aborted || document.activeElement !== focused) return;
        if (window.matchMedia("(min-width: 80rem)").matches) {
          backToTopButton?.focus({ preventScroll: true });
        } else {
          document
            .querySelector<HTMLButtonElement>(
              '[data-reading-width-variant="toolbar"]'
            )
            ?.focus({ preventScroll: true });
        }
      });
    },
    { signal }
  );
  peek?.addEventListener(
    "keydown",
    event => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closePopover();
      if (trigger && document.activeElement !== trigger) {
        restoringTriggerFocus = true;
        trigger.focus({ preventScroll: true });
      }
    },
    { signal }
  );

  backToTopButton?.addEventListener(
    "click",
    () => {
      closePopover();
      window.scrollTo({ top: 0, behavior: getScrollBehavior() });
    },
    { signal }
  );
}
