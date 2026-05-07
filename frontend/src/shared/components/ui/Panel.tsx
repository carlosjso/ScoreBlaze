import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

type PanelProps = ComponentPropsWithoutRef<"section"> & {
  children: ReactNode;
};

export function Panel({ children, className, ...props }: PanelProps) {
  return (
    <section className={cn("sb-panel", className)} {...props}>
      {children}
    </section>
  );
}
