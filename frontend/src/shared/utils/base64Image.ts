export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("No se pudo leer la imagen seleccionada."));
    };

    reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
}

export function loadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo procesar la imagen seleccionada."));
    image.src = source;
  });
}

export type ImageOutputShape = "circle" | "square";
type RgbaSample = { r: number; g: number; b: number; a: number };
type BackgroundBucket = {
  count: number;
  totalR: number;
  totalG: number;
  totalB: number;
  totalA: number;
};

function getScaledDimensions(width: number, height: number, maxSize: number) {
  const longestSide = Math.max(width, height);
  if (longestSide <= maxSize) {
    return { width, height };
  }

  const scale = maxSize / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function getPixelIndex(width: number, x: number, y: number) {
  return (y * width + x) * 4;
}

function readPixel(data: Uint8ClampedArray, width: number, x: number, y: number): RgbaSample {
  const index = getPixelIndex(width, x, y);

  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
    a: data[index + 3],
  };
}

function getColorDistance(left: RgbaSample, right: RgbaSample) {
  const dr = left.r - right.r;
  const dg = left.g - right.g;
  const db = left.b - right.b;
  const da = (left.a - right.a) * 0.35;

  return Math.sqrt(dr * dr + dg * dg + db * db + da * da);
}

function averageSamples(samples: RgbaSample[]): RgbaSample | null {
  if (samples.length === 0) {
    return null;
  }

  const total = samples.reduce(
    (current, sample) => ({
      r: current.r + sample.r,
      g: current.g + sample.g,
      b: current.b + sample.b,
      a: current.a + sample.a,
    }),
    { r: 0, g: 0, b: 0, a: 0 },
  );

  return {
    r: total.r / samples.length,
    g: total.g / samples.length,
    b: total.b / samples.length,
    a: total.a / samples.length,
  };
}

function quantizeChannel(value: number, step = 24) {
  return Math.round(value / step) * step;
}

function buildSampleBucketKey(sample: RgbaSample) {
  return [
    quantizeChannel(sample.r),
    quantizeChannel(sample.g),
    quantizeChannel(sample.b),
    quantizeChannel(sample.a, 32),
  ].join(":");
}

function isBrightNeutralSample(sample: RgbaSample) {
  const maxChannel = Math.max(sample.r, sample.g, sample.b);
  const minChannel = Math.min(sample.r, sample.g, sample.b);
  const average = (sample.r + sample.g + sample.b) / 3;

  return sample.a >= 180 && average >= 214 && maxChannel - minChannel <= 24;
}

function collectCornerBackgroundSamples(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  sampleSize: number,
): RgbaSample[] {
  const corners = [
    { startX: 0, startY: 0 },
    { startX: Math.max(0, width - sampleSize), startY: 0 },
    { startX: 0, startY: Math.max(0, height - sampleSize) },
    { startX: Math.max(0, width - sampleSize), startY: Math.max(0, height - sampleSize) },
  ];

  return corners
    .map(({ startX, startY }) => {
      const samples: RgbaSample[] = [];

      for (let y = startY; y < Math.min(height, startY + sampleSize); y += 1) {
        for (let x = startX; x < Math.min(width, startX + sampleSize); x += 1) {
          const pixel = readPixel(data, width, x, y);
          if (pixel.a <= 12) {
            continue;
          }
          samples.push(pixel);
        }
      }

      return averageSamples(samples);
    })
    .filter((sample): sample is RgbaSample => sample !== null);
}

function collectEdgeBackgroundSamples(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  sampleDepth: number,
): RgbaSample[] {
  const buckets = new Map<string, BackgroundBucket>();

  const registerSample = (sample: RgbaSample) => {
    if (sample.a <= 12) {
      return;
    }

    const key = buildSampleBucketKey(sample);
    const current = buckets.get(key);
    if (current) {
      current.count += 1;
      current.totalR += sample.r;
      current.totalG += sample.g;
      current.totalB += sample.b;
      current.totalA += sample.a;
      return;
    }

    buckets.set(key, {
      count: 1,
      totalR: sample.r,
      totalG: sample.g,
      totalB: sample.b,
      totalA: sample.a,
    });
  };

  for (let inset = 0; inset < sampleDepth; inset += 1) {
    const topY = inset;
    const bottomY = height - 1 - inset;
    const leftX = inset;
    const rightX = width - 1 - inset;

    for (let x = inset; x < width - inset; x += 1) {
      registerSample(readPixel(data, width, x, topY));
      if (bottomY !== topY) {
        registerSample(readPixel(data, width, x, bottomY));
      }
    }

    for (let y = inset + 1; y < height - inset - 1; y += 1) {
      registerSample(readPixel(data, width, leftX, y));
      if (rightX !== leftX) {
        registerSample(readPixel(data, width, rightX, y));
      }
    }
  }

  return [...buckets.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, 4)
    .map((bucket) => ({
      r: bucket.totalR / bucket.count,
      g: bucket.totalG / bucket.count,
      b: bucket.totalB / bucket.count,
      a: bucket.totalA / bucket.count,
    }));
}

function shouldTreatAsBackgroundPixel(pixel: RgbaSample, backgroundSamples: RgbaSample[], tolerance: number) {
  if (pixel.a <= 12) {
    return true;
  }

  return backgroundSamples.some((sample) => getColorDistance(pixel, sample) <= tolerance);
}

function applyOutputShapeMask(context: CanvasRenderingContext2D, outputSize: number, outputShape: ImageOutputShape) {
  if (outputShape !== "circle") {
    return;
  }

  context.save();
  context.globalCompositeOperation = "destination-in";
  context.beginPath();
  context.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
  context.closePath();
  context.fill();
  context.restore();
}

export async function cropImageSourceToPngBase64(
  source: string,
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
    outputSize?: number;
    outputShape?: ImageOutputShape;
  },
): Promise<string> {
  const image = await loadImageElement(source);
  const outputSize = crop.outputSize ?? 512;
  const outputShape = crop.outputShape ?? "square";
  const safeWidth = Math.max(1, crop.width);
  const safeHeight = Math.max(1, crop.height);
  const safeX = Math.max(0, Math.min(crop.x, image.naturalWidth - safeWidth));
  const safeY = Math.max(0, Math.min(crop.y, image.naturalHeight - safeHeight));

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo preparar la imagen para subirla.");
  }

  context.clearRect(0, 0, outputSize, outputSize);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, safeX, safeY, safeWidth, safeHeight, 0, 0, outputSize, outputSize);
  applyOutputShapeMask(context, outputSize, outputShape);

  const pngDataUrl = canvas.toDataURL("image/png");
  return pngDataUrl.replace("data:image/png;base64,", "");
}

export async function removeImageBackgroundFromSource(
  source: string,
  options?: {
    maxSize?: number;
    tolerance?: number;
    featherTolerance?: number;
  },
): Promise<string> {
  const image = await loadImageElement(source);
  const maxSize = options?.maxSize ?? 1400;
  let tolerance = options?.tolerance ?? 58;
  let featherTolerance = options?.featherTolerance ?? 18;
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const scaled = getScaledDimensions(naturalWidth, naturalHeight, maxSize);

  const canvas = document.createElement("canvas");
  canvas.width = scaled.width;
  canvas.height = scaled.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo preparar la imagen para quitarle el fondo.");
  }

  context.clearRect(0, 0, scaled.width, scaled.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, naturalWidth, naturalHeight, 0, 0, scaled.width, scaled.height);

  const imageData = context.getImageData(0, 0, scaled.width, scaled.height);
  const { data } = imageData;
  const sampleSize = Math.max(2, Math.min(12, Math.round(Math.min(scaled.width, scaled.height) * 0.05)));
  const backgroundSamples = [
    ...collectCornerBackgroundSamples(data, scaled.width, scaled.height, sampleSize),
    ...collectEdgeBackgroundSamples(data, scaled.width, scaled.height, sampleSize),
  ];

  if (backgroundSamples.length === 0) {
    return source;
  }

  if (backgroundSamples.some(isBrightNeutralSample)) {
    backgroundSamples.push({ r: 255, g: 255, b: 255, a: 255 });
    tolerance = Math.max(tolerance, 82);
    featherTolerance = Math.max(featherTolerance, 30);
  }

  const visited = new Uint8Array(scaled.width * scaled.height);
  const queue = new Uint32Array(scaled.width * scaled.height);
  let queueStart = 0;
  let queueEnd = 0;

  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= scaled.width || y >= scaled.height) {
      return;
    }

    const pixelIndex = y * scaled.width + x;
    if (visited[pixelIndex]) {
      return;
    }

    const pixel = readPixel(data, scaled.width, x, y);
    if (!shouldTreatAsBackgroundPixel(pixel, backgroundSamples, tolerance)) {
      return;
    }

    visited[pixelIndex] = 1;
    queue[queueEnd] = pixelIndex;
    queueEnd += 1;
  };

  for (let x = 0; x < scaled.width; x += 1) {
    enqueue(x, 0);
    enqueue(x, scaled.height - 1);
  }

  for (let y = 0; y < scaled.height; y += 1) {
    enqueue(0, y);
    enqueue(scaled.width - 1, y);
  }

  while (queueStart < queueEnd) {
    const pixelIndex = queue[queueStart];
    queueStart += 1;

    const x = pixelIndex % scaled.width;
    const y = Math.floor(pixelIndex / scaled.width);

    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
    enqueue(x + 1, y + 1);
    enqueue(x + 1, y - 1);
    enqueue(x - 1, y + 1);
    enqueue(x - 1, y - 1);
  }

  let removedCount = 0;

  for (let y = 0; y < scaled.height; y += 1) {
    for (let x = 0; x < scaled.width; x += 1) {
      const pixelIndex = y * scaled.width + x;
      if (!visited[pixelIndex]) {
        continue;
      }

      const index = pixelIndex * 4;
      data[index + 3] = 0;
      removedCount += 1;
    }
  }

  if (removedCount === 0) {
    return source;
  }

  for (let y = 1; y < scaled.height - 1; y += 1) {
    for (let x = 1; x < scaled.width - 1; x += 1) {
      const pixelIndex = y * scaled.width + x;
      if (visited[pixelIndex]) {
        continue;
      }

      const index = pixelIndex * 4;
      const alpha = data[index + 3];
      if (alpha <= 12) {
        continue;
      }

      const hasRemovedNeighbor =
        visited[pixelIndex - 1] ||
        visited[pixelIndex + 1] ||
        visited[pixelIndex - scaled.width] ||
        visited[pixelIndex + scaled.width];

      if (!hasRemovedNeighbor) {
        continue;
      }

      const pixel = readPixel(data, scaled.width, x, y);
      const minDistance = backgroundSamples.reduce(
        (current, sample) => Math.min(current, getColorDistance(pixel, sample)),
        Number.POSITIVE_INFINITY,
      );

      if (minDistance > tolerance + featherTolerance) {
        continue;
      }

      const fadeRatio = Math.max(0, Math.min(1, (minDistance - tolerance) / featherTolerance));
      data[index + 3] = Math.round(alpha * fadeRatio);
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export async function imageFileToPngBase64(file: File, outputShape: ImageOutputShape = "square"): Promise<string> {
  const source = await readImageFileAsDataUrl(file);
  const image = await loadImageElement(source);

  const outputSize = 512;
  const padding = outputSize * 0.06;
  const availableSize = outputSize - padding * 2;
  const scale = Math.min(availableSize / (image.naturalWidth || image.width), availableSize / (image.naturalHeight || image.height));
  const width = (image.naturalWidth || image.width) * scale;
  const height = (image.naturalHeight || image.height) * scale;
  const x = (outputSize - width) / 2;
  const y = (outputSize - height) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo preparar la imagen para subirla.");
  }

  context.clearRect(0, 0, outputSize, outputSize);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, x, y, width, height);
  applyOutputShapeMask(context, outputSize, outputShape);

  const pngDataUrl = canvas.toDataURL("image/png");
  return pngDataUrl.replace("data:image/png;base64,", "");
}

export function getBase64ImageSrc(base64?: string | null, mimeType = "image/png"): string | null {
  if (!base64) {
    return null;
  }

  const normalized = base64.trim();
  if (!normalized) {
    return null;
  }

  if (
    normalized.startsWith("data:") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }

  return `data:${mimeType};base64,${normalized}`;
}
