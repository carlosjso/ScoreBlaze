type LiveMetaBarProps = {
  period: number;
  lastEventText: string;
};

export function LiveMetaBar({ period, lastEventText }: LiveMetaBarProps) {
  return (
    <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
      <div />

      <div className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 px-8 text-xl font-black text-white shadow-[0_10px_24px_rgba(249,115,22,0.25)]">
        CUARTO {period}
      </div>

      <div className="text-center text-sm font-black uppercase tracking-wide text-slate-500 lg:text-right">
        {lastEventText}
      </div>
    </div>
  );
}