import { Minus, Move, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cropImageSourceToPngBase64, getImageAlphaBoundsFromSource, loadImageElement, removeImageBackgroundFromSource } from "@/shared/utils/base64Image";
import { cn } from "@/shared/utils/cn";

import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";

type LoadedImage = {
  width: number;
  height: number;
};

type ImageCropperModalProps = {
  isOpen: boolean;
  imageSrc: string | null;
  title?: string;
  previewShape?: "circle" | "square";
  exportShape?: "circle" | "square";
  onClose: () => void;
  onConfirm: (base64: string) => void;
};

const VIEWPORT_INSET_RATIO = 0.08;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.05;
const AUTO_FIT_FILL_RATIO = 0.9;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampOffsets(offsetX: number, offsetY: number, image: LoadedImage, viewportSize: number, zoom: number) {
  const baseScale = Math.min(viewportSize / image.width, viewportSize / image.height);
  const displayWidth = image.width * baseScale * zoom;
  const displayHeight = image.height * baseScale * zoom;
  const maxOffsetX = Math.max(0, (displayWidth - viewportSize) / 2);
  const maxOffsetY = Math.max(0, (displayHeight - viewportSize) / 2);

  return {
    x: clamp(offsetX, -maxOffsetX, maxOffsetX),
    y: clamp(offsetY, -maxOffsetY, maxOffsetY),
  };
}

export function ImageCropperModal({
  isOpen,
  imageSrc,
  title = "Ajustar imagen",
  previewShape = "circle",
  exportShape = "square",
  onClose,
  onConfirm,
}: ImageCropperModalProps) {
  const cropFrameRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const [loadedImage, setLoadedImage] = useState<LoadedImage | null>(null);
  const [cropSize, setCropSize] = useState(320);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [processingBackground, setProcessingBackground] = useState(false);
  const [backgroundRemovedSrc, setBackgroundRemovedSrc] = useState<string | null>(null);
  const [cropError, setCropError] = useState<string | null>(null);
  const viewportInset = cropSize * VIEWPORT_INSET_RATIO;
  const viewportSize = cropSize - viewportInset * 2;
  const contentViewportSize = viewportSize;
  const contentViewportInset = viewportInset;
  const activeImageSrc = backgroundRemovedSrc ?? imageSrc;
  const zoomPercent = Math.round((zoom - 1) * 100);

  useEffect(() => {
    if (!isOpen || !activeImageSrc) {
      setLoadedImage(null);
      setCropError(null);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      return;
    }

    let cancelled = false;
    setCropError(null);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);

    void loadImageElement(activeImageSrc)
      .then((image) => {
        if (cancelled) {
          return;
        }

        setLoadedImage({
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
        });

        void getImageAlphaBoundsFromSource(activeImageSrc)
          .then((bounds) => {
            if (cancelled || !bounds) {
              return;
            }

            const imageWidth = image.naturalWidth || image.width;
            const imageHeight = image.naturalHeight || image.height;
            const hasUsefulTransparency = bounds.coverage < 0.92;
            if (!hasUsefulTransparency) {
              return;
            }

            const baseScale = Math.min(contentViewportSize / imageWidth, contentViewportSize / imageHeight);
            const dominantSize = Math.max(bounds.width, bounds.height);
            if (!dominantSize || !baseScale) {
              return;
            }

            const autoZoom = clamp((contentViewportSize * AUTO_FIT_FILL_RATIO) / (dominantSize * baseScale), MIN_ZOOM, MAX_ZOOM);
            const scaled = baseScale * autoZoom;
            const contentCenterX = bounds.x + bounds.width / 2;
            const contentCenterY = bounds.y + bounds.height / 2;
            const nextOffsetX = scaled * (imageWidth / 2 - contentCenterX);
            const nextOffsetY = scaled * (imageHeight / 2 - contentCenterY);
            const clamped = clampOffsets(nextOffsetX, nextOffsetY, { width: imageWidth, height: imageHeight }, contentViewportSize, autoZoom);

            setZoom(autoZoom);
            setOffsetX(clamped.x);
            setOffsetY(clamped.y);
          })
          .catch(() => undefined);
      })
      .catch((error) => {
        if (!cancelled) {
          setCropError(error instanceof Error ? error.message : "No se pudo preparar la imagen.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeImageSrc, contentViewportSize, isOpen]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setProcessingBackground(false);
    setBackgroundRemovedSrc(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const element = cropFrameRef.current;
    if (!element) {
      return;
    }

    const updateCropSize = () => {
      const nextSize = Math.max(220, Math.round(element.getBoundingClientRect().width));
      setCropSize(nextSize);
    };

    updateCropSize();
    const observer = new ResizeObserver(updateCropSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, [isOpen]);

  useEffect(() => {
    if (!loadedImage) {
      return;
    }

    const clamped = clampOffsets(offsetX, offsetY, loadedImage, contentViewportSize, zoom);
    if (clamped.x !== offsetX) {
      setOffsetX(clamped.x);
    }
    if (clamped.y !== offsetY) {
      setOffsetY(clamped.y);
    }
  }, [contentViewportSize, loadedImage, offsetX, offsetY, zoom]);

  const displayMetrics = useMemo(() => {
    if (!loadedImage) {
      return null;
    }

    const baseScale = Math.min(contentViewportSize / loadedImage.width, contentViewportSize / loadedImage.height);
    const effectiveScale = baseScale * zoom;
    const width = loadedImage.width * effectiveScale;
    const height = loadedImage.height * effectiveScale;

    return {
      effectiveScale,
      width,
      height,
      left: contentViewportInset + (contentViewportSize - width) / 2 + offsetX,
      top: contentViewportInset + (contentViewportSize - height) / 2 + offsetY,
    };
  }, [contentViewportInset, contentViewportSize, loadedImage, offsetX, offsetY, zoom]);

  const updateZoom = (nextZoom: number) => {
    if (!loadedImage) {
      setZoom(clamp(nextZoom, MIN_ZOOM, MAX_ZOOM));
      return;
    }

    const safeZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    const clamped = clampOffsets(offsetX, offsetY, loadedImage, contentViewportSize, safeZoom);
    setZoom(safeZoom);
    setOffsetX(clamped.x);
    setOffsetY(clamped.y);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!loadedImage || submitting) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!loadedImage || !dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    const nextOffsetX = dragStateRef.current.startOffsetX + (event.clientX - dragStateRef.current.startX);
    const nextOffsetY = dragStateRef.current.startOffsetY + (event.clientY - dragStateRef.current.startY);
    const clamped = clampOffsets(nextOffsetX, nextOffsetY, loadedImage, contentViewportSize, zoom);
    setOffsetX(clamped.x);
    setOffsetY(clamped.y);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleConfirm = async () => {
    if (!loadedImage || !displayMetrics || !activeImageSrc) {
      return;
    }

    setSubmitting(true);
    setCropError(null);

    try {
      const rawCropX = (contentViewportInset - displayMetrics.left) / displayMetrics.effectiveScale;
      const rawCropY = (contentViewportInset - displayMetrics.top) / displayMetrics.effectiveScale;
      const rawCropSize = contentViewportSize / displayMetrics.effectiveScale;
      const maxCropSize = Math.min(loadedImage.width, loadedImage.height);
      const cropSize = Math.min(rawCropSize, maxCropSize);
      const centeredCropX = rawCropX + (rawCropSize - cropSize) / 2;
      const centeredCropY = rawCropY + (rawCropSize - cropSize) / 2;
      const cropX = clamp(centeredCropX, 0, loadedImage.width - cropSize);
      const cropY = clamp(centeredCropY, 0, loadedImage.height - cropSize);
      const base64 = await cropImageSourceToPngBase64(activeImageSrc, {
        x: cropX,
        y: cropY,
        width: cropSize,
        height: cropSize,
        outputShape: exportShape,
      });

      onConfirm(base64);
    } catch (error) {
      setCropError(error instanceof Error ? error.message : "No se pudo recortar la imagen.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBackgroundRemoval = async () => {
    if (!imageSrc || submitting || processingBackground) {
      return;
    }

    if (backgroundRemovedSrc) {
      setBackgroundRemovedSrc(null);
      setCropError(null);
      return;
    }

    setProcessingBackground(true);
    setCropError(null);

    try {
      const cleanedSource = await removeImageBackgroundFromSource(imageSrc);
      setBackgroundRemovedSrc(cleanedSource);
    } catch (error) {
      setCropError(error instanceof Error ? error.message : "No se pudo quitar el fondo.");
    } finally {
      setProcessingBackground(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={submitting ? () => undefined : onClose} title={title} maxWidthClassName="max-w-2xl">
      <div className="space-y-5">
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div
            ref={cropFrameRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative mx-auto aspect-square w-full max-w-[360px] touch-none overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_top,_rgba(255,237,223,0.6),_transparent_40%),linear-gradient(180deg,_#f8fafc,_#eef2ff)]"
          >
            {activeImageSrc && displayMetrics ? (
              <img
                src={activeImageSrc}
                alt="Vista previa"
                draggable={false}
                className="pointer-events-none absolute max-w-none select-none"
                style={{
                  width: `${displayMetrics.width}px`,
                  height: `${displayMetrics.height}px`,
                  left: `${displayMetrics.left}px`,
                  top: `${displayMetrics.top}px`,
                }}
              />
            ) : null}

            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-slate-950/20" />
              <div
                className={cn(
                  "absolute border border-white/80 shadow-[0_0_0_999px_rgba(15,23,42,0.28)]",
                  previewShape === "circle" ? "rounded-full" : "rounded-[28px]",
                )}
                style={{
                  inset: `${VIEWPORT_INSET_RATIO * 100}%`,
                }}
              />
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                  Arrastra para ajustar
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <Move size={16} className="text-slate-400" />
              <p className="text-sm text-slate-600">Mueve la imagen y ajusta el zoom para elegir el encuadre visible.</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-medium text-slate-500">Ideal para logos con fondos lisos o uniformes.</p>

              <Button
                type="button"
                variant={backgroundRemovedSrc ? "secondary" : "outline"}
                size="sm"
                onClick={() => void toggleBackgroundRemoval()}
                disabled={!imageSrc || submitting || processingBackground}
              >
                {processingBackground
                  ? "Quitando fondo..."
                  : backgroundRemovedSrc
                    ? "Restaurar fondo"
                    : "Quitar fondo"}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateZoom(zoom - ZOOM_STEP)}
                disabled={submitting || processingBackground}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Minus size={14} />
              </button>

              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                disabled={submitting || processingBackground}
                onChange={(event) => updateZoom(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-orange-500"
              />

              <span className="min-w-[58px] text-right text-xs font-semibold text-slate-500">
                {zoomPercent > 0 ? `+${zoomPercent}%` : `${zoomPercent}%`}
              </span>

              <button
                type="button"
                onClick={() => updateZoom(zoom + ZOOM_STEP)}
                disabled={submitting || processingBackground}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {cropError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {cropError}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting || processingBackground}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={() => void handleConfirm()} disabled={!loadedImage || submitting || processingBackground}>
            {submitting ? "Aplicando..." : "Usar imagen"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
