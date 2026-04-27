function readFileAsDataUrl(file: File): Promise<string> {
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

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo procesar la imagen seleccionada."));
    image.src = source;
  });
}

export async function imageFileToPngBase64(file: File): Promise<string> {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);

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

  const pngDataUrl = canvas.toDataURL("image/png");
  return pngDataUrl.replace("data:image/png;base64,", "");
}

export function getBase64ImageSrc(base64?: string | null, mimeType = "image/png"): string | null {
  return base64 ? `data:${mimeType};base64,${base64}` : null;
}
