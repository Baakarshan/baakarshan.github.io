import type { ReactNode } from "react";

export const PageTopbar = ({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) => {
  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>
      {action ? <div>{action}</div> : null}
    </header>
  );
};
