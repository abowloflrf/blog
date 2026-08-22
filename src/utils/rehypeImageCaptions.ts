type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
};

type HastParent = HastNode & { children: HastNode[] };
type HastElement = HastParent & {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
};

/** Wrap standalone Markdown images in a figure and show their alt text as a caption. */
export function rehypeImageCaptions() {
  return (tree: unknown) => {
    if (isParent(tree)) transformChildren(tree);
  };
}

function transformChildren(parent: HastParent) {
  parent.children = parent.children.map(child => {
    if (isStandaloneImageParagraph(child)) {
      const image = child.children[0];
      const alt = String(image.properties.alt);

      const figure: HastElement = {
        type: "element",
        tagName: "figure",
        properties: {},
        children: [
          image,
          {
            type: "element",
            tagName: "figcaption",
            properties: {},
            children: [{ type: "text", value: alt }],
          },
        ],
      };
      return figure;
    }

    if (isParent(child)) transformChildren(child);
    return child;
  });
}

function isStandaloneImageParagraph(
  node: HastNode
): node is HastElement & { children: [HastElement] } {
  if (node.type !== "element" || node.tagName !== "p") return false;
  if (!node.children || node.children.length !== 1) return false;

  const [image] = node.children;
  return (
    image.type === "element" &&
    image.tagName === "img" &&
    typeof image.properties?.alt === "string" &&
    image.properties.alt.trim().length > 0
  );
}

function isParent(node: unknown): node is HastParent {
  return (
    typeof node === "object" &&
    node !== null &&
    "children" in node &&
    Array.isArray(node.children)
  );
}
