import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

import {
  useDismissablePopover,
  usePopoverCoordinator,
} from "@/shared/components/ui/useDismissablePopover";

type DatePickerProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  containerClassName?: string;
};

const DATE_VALUE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAY_LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
const monthFormatter = new Intl.DateTimeFormat("es-MX", {
  month: "long",
  year: "numeric",
});
const triggerDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function parseDateValue(value: string): Date | null {
  if (!DATE_VALUE_REGEX.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return parsedDate;
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isSameMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function buildCalendarDays(visibleMonth: Date): Date[] {
  const firstDayOfMonth = startOfMonth(visibleMonth);
  const firstWeekdayIndex = (firstDayOfMonth.getDay() + 6) % 7;
  const gridStartDate = new Date(
    firstDayOfMonth.getFullYear(),
    firstDayOfMonth.getMonth(),
    firstDayOfMonth.getDate() - firstWeekdayIndex,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStartDate);
    day.setDate(gridStartDate.getDate() + index);
    return day;
  });
}

function formatTriggerDate(value: string, placeholder: string): string {
  const parsedDate = parseDateValue(value);
  return parsedDate ? triggerDateFormatter.format(parsedDate) : placeholder;
}

export function DatePicker({
  label,
  value,
  onChange,
  onBlur,
  hint,
  error,
  leftIcon,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  containerClassName,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(parseDateValue(value) ?? new Date()),
  );
  const rootRef = useDismissablePopover<HTMLDivElement>(isOpen, () => {
    setIsOpen(false);
    onBlur?.();
  });
  const announceOpen = usePopoverCoordinator(isOpen, () => {
    setIsOpen(false);
    onBlur?.();
  });
  const selectedDate = parseDateValue(value);
  const today = useMemo(() => new Date(), []);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  useEffect(() => {
    if (!isOpen) {
      setVisibleMonth(startOfMonth(parseDateValue(value) ?? new Date()));
    }
  }, [isOpen, value]);

  const togglePopover = () => {
    if (disabled) {
      return;
    }

    if (!isOpen) {
      announceOpen();
      setIsOpen(true);
      return;
    }

    setIsOpen(false);
    onBlur?.();
  };

  const selectDate = (date: Date) => {
    onChange(formatDateValue(date));
    setVisibleMonth(startOfMonth(date));
    setIsOpen(false);
    onBlur?.();
  };

  return (
    <div className={cn("block space-y-1", containerClassName)} ref={rootRef}>
      {label ? <span className="text-xs font-semibold text-slate-600">{label}</span> : null}
      <div className="relative">
        <button
          type="button"
          onClick={togglePopover}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={cn(
            "sb-input flex min-h-[42px] items-center gap-3 text-left",
            disabled && "cursor-not-allowed opacity-60",
            error && "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100",
          )}
        >
          {leftIcon ? <span className="shrink-0 text-slate-400">{leftIcon}</span> : null}
          <span className={cn("flex-1 truncate", value ? "text-slate-800" : "text-slate-400")}>
            {formatTriggerDate(value, placeholder)}
          </span>
          <ChevronDown
            size={16}
            className={cn("shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")}
          />
        </button>

        {isOpen ? (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/10 p-4 backdrop-blur-[1px]"
            onMouseDown={() => {
              setIsOpen(false);
              onBlur?.();
            }}
          >
            <div
              className="w-[296px] max-w-full rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_20px_48px_rgba(15,23,42,0.14)]"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Selecciona fecha
                  </p>
                  <p className="mt-1 capitalize text-sm font-semibold text-slate-800">
                    {monthFormatter.format(visibleMonth)}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                    aria-label="Mes siguiente"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {WEEKDAY_LABELS.map((weekdayLabel) => (
                  <span key={weekdayLabel} className="py-1.5">
                    {weekdayLabel}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                  const isToday = isSameDay(day, today);
                  const isCurrentMonth = isSameMonth(day, visibleMonth);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => selectDate(day)}
                      className={cn(
                        "flex h-9 items-center justify-center rounded-xl text-sm font-medium transition",
                        isCurrentMonth ? "text-slate-700 hover:bg-slate-100" : "text-slate-300",
                        isToday && !isSelected && "border border-orange-200 text-orange-700",
                        isSelected && "bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.28)]",
                      )}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => selectDate(new Date())}
                  className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                >
                  Hoy
                </button>
                <p className="text-xs text-slate-400">Toca un dia para seleccionarlo.</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <span className="block rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-slate-500">{hint}</span>
      ) : null}
    </div>
  );
}
