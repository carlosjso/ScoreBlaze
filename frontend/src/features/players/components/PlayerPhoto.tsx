import { getBase64ImageSrc } from "@/shared/utils/base64Image";
import { cn } from "@/shared/utils/cn";

type PlayerPhotoProps = {
  name: string;
  photoBase64?: string | null;
  className?: string;
  imageClassName?: string;
  emptyClassName?: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PlayerPhoto({ name, photoBase64, className, imageClassName, emptyClassName }: PlayerPhotoProps) {
  const photoSrc = getBase64ImageSrc(photoBase64);

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-full font-bold",
        photoSrc ? "bg-transparent text-slate-700" : "border border-slate-200 bg-slate-100 text-slate-600 shadow-sm",
        !photoSrc && emptyClassName,
        className
      )}
    >
      {photoSrc ? (
        <img src={photoSrc} alt={`Foto de ${name}`} className={cn("h-full w-full object-cover", imageClassName)} />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}
