type LiveClockBarProps = {
  clockText: string;
  shotClockText: string;
};

export function LiveClockBar({ clockText, shotClockText }: LiveClockBarProps) {
  return (
    <div className="relative flex min-h-[110px] items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(249,115,22,0.08),rgba(255,255,255,0)_36%,rgba(255,255,255,0)_70%,rgba(249,115,22,0.06))]" />

      <h1 className="relative z-10 text-7xl font-black tracking-[0.08em] text-slate-800 sm:text-8xl lg:text-9xl">
        {clockText}
      </h1>

      <div className="absolute left-[calc(50%+210px)] top-[58%] z-10 flex -translate-y-1/2 flex-col items-center rounded-2xl border border-orange-200 bg-white px-5 py-3 shadow-[0_8px_18px_rgba(17,24,39,0.08)]">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-700">
          Tiro
        </span>

        <span className="text-4xl font-black leading-none text-slate-950">
          {shotClockText}
        </span>
      </div>
    </div>
  );
}