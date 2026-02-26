import { visit } from "unist-util-visit";

// 将 ```mermaid 代码块转换为 <Mermaid code="..."/>，避免被普通代码链路截断
export const remarkMermaid = () => {
  return (tree: any) => {
    visit(tree, "code", (node: any, index?: number, parent?: any) => {
      if (!parent || typeof index !== "number") return;
      const lang = typeof node.lang === "string" ? node.lang.toLowerCase() : "";
      if (lang !== "mermaid") return;

      parent.children.splice(index, 1, {
        type: "mdxJsxFlowElement",
        name: "Mermaid",
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "code",
            value: node.value ?? "",
          },
        ],
        children: [],
      });
    });
  };
};
