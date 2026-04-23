import type { ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

type PanelProps = {
  children: ReactNode;
  className?: string;
};

export function Panel({ children, className }: PanelProps) {
  return <section className={cn("sb-panel", className)}>{children}</section>;
}
