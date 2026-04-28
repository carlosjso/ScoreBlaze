type KeyboardItem = {
  keyLabel: string;
  action: string;
};

type KeyboardGroup = {
  title: string;
  items: KeyboardItem[];
};

const KEYBOARD_GROUPS: KeyboardGroup[] = [
  {
    title: "Frailes",
    items: [
      { keyLabel: "Q", action: "+1" },
      { keyLabel: "W", action: "+2" },
      { keyLabel: "E", action: "+3" },
      { keyLabel: "A", action: "Fallo" },
      { keyLabel: "S", action: "Falta" },
      { keyLabel: "D", action: "Rebote" },
      { keyLabel: "F", action: "Asistencia" },
    ],
  },
  {
    title: "Warriors",
    items: [
      { keyLabel: "U", action: "+1" },
      { keyLabel: "I", action: "+2" },
      { keyLabel: "O", action: "+3" },
      { keyLabel: "J", action: "Fallo" },
      { keyLabel: "K", action: "Falta" },
      { keyLabel: "L", action: "Rebote" },
      { keyLabel: "Ñ / N", action: "Asistencia" },
    ],
  },
  {
    title: "General",
    items: [
      { keyLabel: "C", action: "Reloj" },
      { keyLabel: "V", action: "Reset reloj" },
      { keyLabel: "T", action: "Tiro 24" },
      { keyLabel: "G", action: "Tiro 14" },
      { keyLabel: "B", action: "Periodo" },
      { keyLabel: "Z", action: "Deshacer" },
      { keyLabel: "X", action: "Posesión" },
      { keyLabel: "R", action: "Reiniciar" },
    ],
  },
];

export function KeyboardHelp() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
          Modo teclado activo
        </p>

        <h3 className="mt-1 text-lg font-black text-slate-950">
          Guía rápida de controles
        </h3>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {KEYBOARD_GROUPS.map((group) => (
          <div key={group.title} className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-800">{group.title}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {group.items.map((item) => (
                <div
                  key={`${group.title}-${item.keyLabel}-${item.action}`}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2"
                >
                  <span className="rounded-lg bg-slate-950 px-2 py-1 text-xs font-black text-white">
                    {item.keyLabel}
                  </span>

                  <span className="text-xs font-bold text-slate-600">
                    {item.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}