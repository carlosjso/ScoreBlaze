type LiveCenterPanelProps = {
  arrowToA: boolean;
  arrow: "A" | "B";
};

export function LiveCenterPanel({ arrowToA, arrow }: LiveCenterPanelProps) {
  return (
    <div className="flex flex-col justify-center gap-5">
      <div className="grid min-h-[145px] place-items-center rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
        <span className="text-7xl font-black leading-none text-orange-500">
          VS
        </span>
      </div>

      <div className="flex min-h-[165px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-orange-50 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
        <div className="text-8xl font-black leading-none text-orange-500">
          {arrowToA ? "◀" : "▶"}
        </div>

        <div className="mt-3 text-center text-sm font-black uppercase tracking-[0.18em] text-orange-700">
          Posesión {arrow}
        </div>
      </div>
    </div>
  );
}