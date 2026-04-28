import { getTeamLogoSrc } from "@/features/teams/Teams.utils";
import { cn } from "@/shared/utils/cn";

const logoPalette = [
  "border-orange-200 bg-orange-50 text-orange-700",
  "border-sky-200 bg-sky-50 text-sky-700",
  "border-emerald-200 bg-emerald-50 text-emerald-700",
  "border-violet-200 bg-violet-50 text-violet-700",
];

type TeamLogoProps = {
  name: string;
  logoBase64?: string | null;
  seed?: number;
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

export function TeamLogo({
  name,
  logoBase64,
  seed = 0,
  className,
  imageClassName,
  emptyClassName,
}: TeamLogoProps) {
  const logoSrc = getTeamLogoSrc(logoBase64);

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden font-bold",
        logoSrc ? "border-transparent bg-transparent shadow-none" : `border shadow-sm ${logoPalette[seed % logoPalette.length]}`,
        !logoSrc && emptyClassName,
        className
      )}
    >
      {logoSrc ? (
        <img src={logoSrc} alt={`Logo de ${name}`} className={cn("h-full w-full object-contain", imageClassName)} />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

