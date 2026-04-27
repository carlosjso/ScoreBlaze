import { getBase64ImageSrc, imageFileToPngBase64 } from "@/shared/utils/base64Image";

export { imageFileToPngBase64 };

export function getTeamLogoSrc(logoBase64?: string | null): string | null {
  return getBase64ImageSrc(logoBase64);
}
