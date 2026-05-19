import { useEffect, useId, useRef } from "react";

export function useDismissablePopover<T extends HTMLElement>(
  isOpen: boolean,
  onDismiss: () => void,
) {
  const rootRef = useRef<T | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onDismiss();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onDismiss]);

  return rootRef;
}

export function usePopoverCoordinator(isOpen: boolean, onDismiss: () => void) {
  const popoverId = useId();

  useEffect(() => {
    const handlePopoverOpen = (event: Event) => {
      const customEvent = event as CustomEvent<string>;

      if (customEvent.detail !== popoverId && isOpen) {
        onDismiss();
      }
    };

    window.addEventListener("scoreblaze:popover-open", handlePopoverOpen as EventListener);

    return () => {
      window.removeEventListener("scoreblaze:popover-open", handlePopoverOpen as EventListener);
    };
  }, [isOpen, onDismiss, popoverId]);

  const announceOpen = () => {
    window.dispatchEvent(new CustomEvent("scoreblaze:popover-open", { detail: popoverId }));
  };

  return announceOpen;
}
