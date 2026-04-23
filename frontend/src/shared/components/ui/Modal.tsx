import { X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

type ModalProps = {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
  hideCloseButton?: boolean;
};

export function Modal({
  isOpen,
  title,
  onClose,
  children,
  maxWidthClassName = "max-w-xl",
  hideCloseButton = false,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={onClose}>
      <div
        className={cn(
          "w-full rounded-3xl border border-slate-300 bg-slate-50 p-5 shadow-xl",
          "max-h-[92vh] overflow-y-auto",
          maxWidthClassName
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {(title || !hideCloseButton) && (
          <div className="mb-4 flex items-start justify-between gap-3">
            {title ? <h3 className="text-[30px] leading-none sm:text-[32px]">{title}</h3> : <span />}
            {!hideCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            ) : null}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
