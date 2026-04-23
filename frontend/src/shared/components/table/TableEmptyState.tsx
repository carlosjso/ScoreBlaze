import { Inbox, SearchX } from "lucide-react";

import { Button } from "@/shared/components/ui";

type TableEmptyStateProps = {
  mode: "empty" | "filtered";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function TableEmptyState({ mode, title, description, actionLabel, onAction }: TableEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-7 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
        {mode === "empty" ? <Inbox size={17} /> : <SearchX size={17} />}
      </span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="max-w-md text-xs text-slate-500">{description}</p>
      {actionLabel && onAction ? (
        <Button variant={mode === "empty" ? "primary" : "outline"} size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
