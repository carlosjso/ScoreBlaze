import type { ScoreboardTeamState } from "@/features/scoreboard/Scoreboard.types";
import { getBase64ImageSrc } from "@/shared/utils/base64Image";

type LiveTeamCardProps = {
  team: ScoreboardTeamState;
  hasPossession: boolean;
};

export function LiveTeamCard({ team, hasPossession }: LiveTeamCardProps) {
  const logoSrc = getBase64ImageSrc(team.logo);

  return (
    <article
      className={[
        "flex min-h-[390px] flex-col items-center justify-center gap-5 rounded-3xl border bg-white p-5 text-center shadow-[0_10px_30px_rgba(17,24,39,0.08)]",
        hasPossession ? "border-orange-300" : "border-slate-200",
      ].join(" ")}
    >
      <div className="grid aspect-square w-[188px] place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 p-2">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={team.name}
            className="h-[92%] w-[92%] object-contain drop-shadow"
          />
        ) : (
          <span className="text-5xl font-black text-orange-500">
            {team.name.slice(0, 1)}
          </span>
        )}
      </div>

      <div
        className={[
          "w-full max-w-[210px] rounded-full border bg-gradient-to-b from-white to-slate-50 px-4 py-2 text-base font-black uppercase tracking-[0.08em] shadow-sm",
          hasPossession
            ? "border-orange-300 text-orange-700 shadow-[0_0_0_3px_rgba(249,115,22,0.18)]"
            : "border-slate-200 text-slate-700",
        ].join(" ")}
      >
        {team.name}
      </div>

      <div className="grid aspect-square w-[126px] place-items-center rounded-[28px] border-2 border-orange-200 bg-slate-50">
        <span className="text-6xl font-black text-orange-700">
          {team.score}
        </span>
      </div>
    </article>
  );
}

