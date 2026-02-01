import { Sidebar } from "@/components/layout/Sidebar";
import { getContentTree } from "@/lib/posts";

// 统一的应用壳层：侧边栏 + 主内容区
// - 在构建期读取中英文目录树，提供给 Sidebar
// - 复用以减少 (en)/(zh) layout 的重复代码
export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const treeEn = getContentTree("en");
  const treeZh = getContentTree("zh");

  return (
    <div className="app-shell">
      <Sidebar trees={{ en: treeEn, zh: treeZh }} />
      <main className="app-main">{children}</main>
    </div>
  );
};
