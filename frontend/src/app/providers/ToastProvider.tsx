import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { cn } from "@/shared/utils/cn";

type ToastVariant = "success" | "warning" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastItem = ToastInput & {
  id: number;
  variant: ToastVariant;
  durationMs: number;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => number;
  dismissToast: (id: number) => void;
  success: (toast: Omit<ToastInput, "variant">) => number;
  warning: (toast: Omit<ToastInput, "variant">) => number;
  error: (toast: Omit<ToastInput, "variant">) => number;
  info: (toast: Omit<ToastInput, "variant">) => number;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const DEFAULT_DURATION_MS = 4000;

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  error: "border-red-300 bg-red-50 text-red-900",
  info: "border-sky-300 bg-sky-50 text-sky-900",
};

const variantIconStyles: Record<ToastVariant, string> = {
  success: "text-emerald-600",
  warning: "text-amber-600",
  error: "text-red-600",
  info: "text-sky-600",
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === "success") return <CheckCircle2 size={16} className={variantIconStyles.success} />;
  if (variant === "warning") return <AlertTriangle size={16} className={variantIconStyles.warning} />;
  if (variant === "error") return <AlertCircle size={16} className={variantIconStyles.error} />;
  return <Info size={16} className={variantIconStyles.info} />;
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const duration = toast.durationMs;
  const shouldAutoDismiss = duration > 0;
  const EXIT_ANIMATION_MS = 180;
  const closingRef = useRef(false);
  const [isClosing, setIsClosing] = useState(false);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);
    window.setTimeout(() => {
      onDismiss(toast.id);
    }, EXIT_ANIMATION_MS);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    if (!shouldAutoDismiss) return undefined;
    const timeout = window.setTimeout(() => {
      requestClose();
    }, duration);
    return () => window.clearTimeout(timeout);
  }, [duration, requestClose, shouldAutoDismiss]);

  return (
    <div
      role={toast.variant === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto w-full rounded-xl border px-3 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.14)]",
        isClosing ? "animate-[toast-out_180ms_ease-in_forwards]" : "animate-[toast-in_220ms_ease-out]",
        variantStyles[toast.variant],
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex shrink-0 items-center justify-center">
          <ToastIcon variant={toast.variant} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{toast.title}</p>
          {toast.description ? <p className="mt-0.5 text-xs leading-tight opacity-90">{toast.description}</p> : null}
          {toast.actionLabel && toast.onAction ? (
            <button
              type="button"
              onClick={toast.onAction}
              className="mt-1 text-xs font-semibold underline underline-offset-2 hover:opacity-80"
            >
              {toast.actionLabel}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Cerrar notificacion"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md opacity-75 transition hover:opacity-100"
          onClick={requestClose}
        >
          <X size={14} />
        </button>
      </div>
      {shouldAutoDismiss ? (
        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-current opacity-35 animate-[toast-progress_linear_forwards]"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = nextIdRef.current++;
    const nextToast: ToastItem = {
      id,
      variant: toast.variant ?? "info",
      durationMs: toast.durationMs ?? DEFAULT_DURATION_MS,
      ...toast,
    };
    setToasts((current) => [...current, nextToast].slice(-5));
    return id;
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
      success: (toast) => showToast({ ...toast, variant: "success" }),
      warning: (toast) => showToast({ ...toast, variant: "warning" }),
      error: (toast) => showToast({ ...toast, variant: "error" }),
      info: (toast) => showToast({ ...toast, variant: "info" }),
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(92vw,360px)] flex-col gap-2.5">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider.");
  }
  return context;
}
