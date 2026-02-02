import { Sidebar } from "@/components/layout/Sidebar";
import { getContentTree } from "@/lib/posts";

// 统一的应用壳层：侧边栏 + 主内容区
// - 在构建期读取中英文目录树，提供给 Sidebar
// - 复用以减少 (en)/(zh) layout 的重复代码
export const AppShell = ({ children }: { children: React.ReactNode }) => {
  // 目录树读取发生在构建期/服务端，满足“零动态”约束
  const treeEn = getContentTree("en");
  const treeZh = getContentTree("zh");

  return (
    <div className="app-shell">
      {/* 侧边栏统一接收双语树，内部按路径选择 */}
      <Sidebar trees={{ en: treeEn, zh: treeZh }} />
      {/* 主内容区：由路由页面注入 */}
      <main className="app-main">{children}</main>
    </div>
  );
};
