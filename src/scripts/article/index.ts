import { initReadingWidth } from "./reading-width";
import { addHeadingLinks } from "./heading-links";
import { attachCopyButtons } from "./copy-code";
import { initLightbox } from "./lightbox";
import { initTableOfContents } from "./table-of-contents";
import { initBackToTop } from "./back-to-top";

let controller: AbortController | undefined;

function cleanup() {
  controller?.abort();
  controller = undefined;
}

function initArticle() {
  cleanup();
  if (!document.getElementById("article")) return;

  controller = new AbortController();
  const { signal } = controller;
  // Set the initial width before the TOC starts handling user width changes.
  initReadingWidth(signal);
  addHeadingLinks();
  attachCopyButtons(signal);
  initLightbox(signal);
  initTableOfContents(signal);
  initBackToTop(signal);
}

document.addEventListener("astro:page-load", initArticle);
document.addEventListener("astro:before-swap", cleanup);
