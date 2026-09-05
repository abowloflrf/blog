type Node = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

/** Reserve code toolbar containers before ClientRouter restores scroll position. */
export function rehypeCodeBlocks() {
  return (tree: Node) => visit(tree);
}

function visit(parent: Node) {
  if (!parent.children) return;
  parent.children = parent.children.map(child => {
    if (
      child.type === "element" &&
      child.tagName === "pre" &&
      child.children?.some(node => node.tagName === "code") &&
      !Object.hasOwn(parent.properties ?? {}, "data-code-block")
    ) {
      return {
        type: "element",
        tagName: "div",
        properties: { "data-code-block": "" },
        children: [child],
      };
    }
    visit(child);
    return child;
  });
}
