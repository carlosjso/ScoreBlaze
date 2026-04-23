import type { ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

type TableShellProps = {
  children: ReactNode;
  className?: string;
};

export function TableShell({ children, className }: TableShellProps) {
  return <div className={cn("sb-table-wrap overflow-x-auto", className)}>{children}</div>;
}
