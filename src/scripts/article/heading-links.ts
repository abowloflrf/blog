export function addHeadingLinks() {
  const headings = document.querySelectorAll<HTMLElement>(
    "#article :is(h2, h3, h4, h5, h6)[id]"
  );

  for (const heading of headings) {
    if (heading.querySelector(".heading-link")) continue;
    heading.classList.add("group");
    const link = document.createElement("a");
    link.className =
      "heading-link ms-2 no-underline opacity-75 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100";
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.setAttribute(
      "aria-label",
      `Link to section: ${heading.textContent?.trim()}`
    );
    link.setAttribute("data-pagefind-ignore", "");

    const span = document.createElement("span");
    span.setAttribute("aria-hidden", "true");
    span.textContent = "#";
    link.appendChild(span);
    heading.appendChild(link);
  }
}
