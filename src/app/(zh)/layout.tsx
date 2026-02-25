import { AppShell } from "@/components/layout/AppShell";

// 中文站布局：只负责套壳，不渲染 html/body
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // AppShell 内部根据路径加载对应语言目录树
  return <AppShell>{children}</AppShell>;
}
