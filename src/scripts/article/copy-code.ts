export function attachCopyButtons(signal: AbortSignal) {
  const blocks = document.querySelectorAll<HTMLPreElement>("#article pre");
  const timers = new Map<HTMLButtonElement, number>();
  signal.addEventListener(
    "abort",
    () => {
      for (const timer of timers.values()) window.clearTimeout(timer);
    },
    { once: true }
  );

  for (const block of blocks) {
    let button = block.querySelector<HTMLButtonElement>(".copy-code");
    if (!button) {
      const hasFileName =
        getComputedStyle(block)
          .getPropertyValue("--file-name-offset")
          .trim() !== "";
      const controls = document.createElement("div");
      controls.className = `absolute end-3 ${hasFileName ? "top-(--file-name-offset)" : "-top-3"} flex items-center gap-2`;
      controls.setAttribute("data-pagefind-ignore", "");

      if (block.dataset.language) {
        const language = document.createElement("span");
        language.className =
          "rounded border border-muted bg-muted px-2 py-1 text-xs leading-4 text-muted-foreground font-medium";
        language.textContent = block.dataset.language;
        language.setAttribute(
          "aria-label",
          `Language: ${block.dataset.language}`
        );
        controls.appendChild(language);
      }

      button = document.createElement("button");
      button.type = "button";
      button.className =
        "copy-code rounded border border-muted bg-muted px-2 py-1 text-xs leading-4 text-foreground font-medium hover:text-accent";
      button.setAttribute("aria-live", "polite");
      controls.appendChild(button);
      block.setAttribute("tabindex", "0");
      block.appendChild(controls);
    }

    const copyButton = button;
    copyButton.textContent = "Copy";
    copyButton.addEventListener(
      "click",
      async () => {
        const copied = await copyText(
          block.querySelector("code")?.textContent ?? ""
        );
        if (signal.aborted) return;
        copyButton.textContent = copied ? "Copied" : "Copy failed";
        window.clearTimeout(timers.get(copyButton));
        timers.set(
          copyButton,
          window.setTimeout(() => {
            copyButton.textContent = "Copy";
            timers.delete(copyButton);
          }, 1500)
        );
      },
      { signal }
    );
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Keep the fallback for non-HTTPS pages and denied clipboard permissions.
  }

  const focused = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.readOnly = true;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
    if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
  }
}
