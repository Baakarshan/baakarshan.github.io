const isWhitespace = (node: any) =>
  node?.type === "text" && String(node.value ?? "").trim() === "";

const isImageElement = (node: any) =>
  node?.type === "element" && node.tagName === "img";

// Markdown 图片会被编译成 <p><img /></p>。
// 站点的 img 组件会渲染块级图片容器，因此需要先移除这层段落，避免非法的 <p><div>。
export const rehypeUnwrapImages = () => {
  return (tree: any) => {
    const walk = (node: any) => {
      if (!Array.isArray(node?.children)) return;

      node.children = node.children.flatMap((child: any) => {
        if (child?.type !== "element" || child.tagName !== "p") {
          walk(child);
          return [child];
        }

        const meaningfulChildren = (child.children ?? []).filter(
          (item: any) => !isWhitespace(item)
        );
        if (
          meaningfulChildren.length > 0 &&
          meaningfulChildren.every(isImageElement)
        ) {
          return meaningfulChildren;
        }

        walk(child);
        return [child];
      });
    };

    walk(tree);
  };
};
