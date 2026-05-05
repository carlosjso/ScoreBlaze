import { ChevronDown, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

import {
  useDismissablePopover,
  usePopoverCoordinator,
} from "@/shared/components/ui/useDismissablePopover";

type TimePickerProps = {
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

type TimeParts = {
  hours24: number;
  minutes: number;
};

type TimeSegment = "hour" | "minute";
type Meridiem = "AM" | "PM";

const TIME_VALUE_REGEX = /^\d{2}:\d{2}$/;
const HOUR_VALUES = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_LABEL_VALUES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function padNumber(value: number): string {
  return String(value).padStart(2, "0");
}

function parseTimeValue(value: string): TimeParts | null {
  if (!TIME_VALUE_REGEX.test(value)) {
    return null;
  }

  const [hours24, minutes] = value.split(":").map(Number);

  if (
    Number.isNaN(hours24) ||
    Number.isNaN(minutes) ||
    hours24 < 0 ||
    hours24 > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return { hours24, minutes };
}

function formatTimeValue(time: TimeParts): string {
  return `${padNumber(time.hours24)}:${padNumber(time.minutes)}`;
}

function getMeridiem(hours24: number): Meridiem {
  return hours24 >= 12 ? "PM" : "AM";
}

function to12Hour(hours24: number): number {
  const normalizedHour = hours24 % 12;
  return normalizedHour === 0 ? 12 : normalizedHour;
}

function to24Hour(hour12: number, meridiem: Meridiem): number {
  if (meridiem === "AM") {
    return hour12 === 12 ? 0 : hour12;
  }

  return hour12 === 12 ? 12 : hour12 + 12;
}

function getInitialDraftTime(value: string): TimeParts {
  const parsedValue = parseTimeValue(value);

  if (parsedValue) {
    return parsedValue;
  }

  const now = new Date();
  return {
    hours24: now.getHours(),
    minutes: now.getMinutes(),
  };
}

function formatTriggerTime(value: string, placeholder: string): string {
  const parsedValue = parseTimeValue(value);

  if (!parsedValue) {
    return placeholder;
  }

  return `${padNumber(to12Hour(parsedValue.hours24))}:${padNumber(parsedValue.minutes)} ${getMeridiem(
    parsedValue.hours24,
  )}`;
}

function getDialAngle(activeSegment: TimeSegment, time: TimeParts): number {
  if (activeSegment === "hour") {
    return (to12Hour(time.hours24) % 12) * 30 - 180;
  }

  return time.minutes * 6 - 180;
}

function getDialItemPosition(index: number, radius: number) {
  const angleInDegrees = index * 30 - 90;
  const angleInRadians = (angleInDegrees * Math.PI) / 180;

  return {
    left: `calc(50% + ${Math.cos(angleInRadians) * radius}px)`,
    top: `calc(50% + ${Math.sin(angleInRadians) * radius}px)`,
  };
}

function getClockAngle(clientX: number, clientY: number, rect: DOMRect): number {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const radians = Math.atan2(clientY - centerY, clientX - centerX);
  const degrees = (radians * 180) / Math.PI;

  return (degrees + 450) % 360;
}

function getHourFromAngle(angle: number): number {
  const hourIndex = Math.round(angle / 30) % 12;
  return hourIndex === 0 ? 12 : hourIndex;
}

function getMinuteFromAngle(angle: number): number {
  return Math.round(angle / 6) % 60;
}

export function TimePicker({
  label,
  value,
  onChange,
  onBlur,
  hint,
  error,
  leftIcon,
  placeholder = "--:--",
  disabled = false,
  containerClassName,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSegment, setActiveSegment] = useState<TimeSegment>("hour");
  const [draftTime, setDraftTime] = useState<TimeParts>(() => getInitialDraftTime(value));
  const clockFaceRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useDismissablePopover<HTMLDivElement>(isOpen, () => {
    setIsOpen(false);
    onBlur?.();
  });
  const announceOpen = usePopoverCoordinator(isOpen, () => {
    setIsOpen(false);
    onBlur?.();
  });

  useEffect(() => {
    if (isOpen) {
      setDraftTime(getInitialDraftTime(value));
      setActiveSegment("hour");
    }
  }, [isOpen, value]);

  const dialValues = useMemo(
    () => (activeSegment === "hour" ? HOUR_VALUES : MINUTE_LABEL_VALUES),
    [activeSegment],
  );
  const displayedHour = padNumber(to12Hour(draftTime.hours24));
  const displayedMinutes = padNumber(draftTime.minutes);
  const meridiem = getMeridiem(draftTime.hours24);
  const dialAngle = getDialAngle(activeSegment, draftTime);
  const handLength = activeSegment === "hour" ? 50 : 62;

  const closePopover = (shouldBlur = true) => {
    setIsOpen(false);

    if (shouldBlur) {
      onBlur?.();
    }
  };

  const togglePopover = () => {
    if (disabled) {
      return;
    }

    if (isOpen) {
      closePopover();
      return;
    }

    announceOpen();
    setIsOpen(true);
  };

  const commitTime = (nextTime: TimeParts) => {
    setDraftTime(nextTime);
    onChange(formatTimeValue(nextTime));
    closePopover();
  };

  const selectHour = (hour12: number) => {
    setDraftTime((current) => ({
      ...current,
      hours24: to24Hour(hour12, getMeridiem(current.hours24)),
    }));
    setActiveSegment("minute");
  };

  const selectMinute = (minutes: number) => {
    setDraftTime({
      ...draftTime,
      minutes,
    });
  };

  const selectMeridiem = (nextMeridiem: Meridiem) => {
    setDraftTime((current) => ({
      ...current,
      hours24: to24Hour(to12Hour(current.hours24), nextMeridiem),
    }));
  };

  const handleClockPointer = (clientX: number, clientY: number) => {
    if (!clockFaceRef.current) {
      return;
    }

    const angle = getClockAngle(clientX, clientY, clockFaceRef.current.getBoundingClientRect());

    if (activeSegment === "hour") {
      selectHour(getHourFromAngle(angle));
      return;
    }

    selectMinute(getMinuteFromAngle(angle));
  };

  const nudgeMinute = (delta: number) => {
    setDraftTime((current) => {
      const totalMinutes = (current.hours24 * 60 + current.minutes + delta + 24 * 60) % (24 * 60);

      return {
        hours24: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
      };
    });
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
            {formatTriggerTime(value, placeholder)}
          </span>
          <ChevronDown
            size={16}
            className={cn("shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")}
          />
        </button>

        {isOpen ? (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/10 p-4 backdrop-blur-[1px]"
            onMouseDown={() => closePopover()}
          >
            <div
              className="w-[276px] max-w-full rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Selecciona la hora
              </p>

              <div className="mt-2.5 flex items-start justify-between gap-3">
                <div className="flex items-end gap-1 text-slate-900">
                  <button
                    type="button"
                    onClick={() => setActiveSegment("hour")}
                    className={cn(
                      "rounded-2xl px-1.5 py-1 text-[30px] font-semibold leading-none transition",
                      activeSegment === "hour" ? "bg-orange-50 text-orange-600" : "text-slate-900",
                    )}
                  >
                    {displayedHour}
                  </button>
                  <span className="pb-1 text-[30px] leading-none text-slate-300">:</span>
                  <button
                    type="button"
                    onClick={() => setActiveSegment("minute")}
                    className={cn(
                      "rounded-2xl px-1.5 py-1 text-[30px] font-semibold leading-none transition",
                      activeSegment === "minute" ? "bg-orange-50 text-orange-600" : "text-slate-900",
                    )}
                  >
                    {displayedMinutes}
                  </button>
                </div>

                <div className="grid gap-1 rounded-2xl bg-slate-100 p-1">
                  {(["AM", "PM"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => selectMeridiem(option)}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-sm font-semibold transition",
                        meridiem === option
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-500 hover:bg-white hover:text-slate-900",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 rounded-[20px] bg-slate-100/90 p-2.5">
                <div
                  ref={clockFaceRef}
                  className="relative mx-auto h-40 w-40 cursor-pointer rounded-full bg-slate-200 sm:h-44 sm:w-44"
                  onPointerDown={(event) => {
                    handleClockPointer(event.clientX, event.clientY);
                  }}
                >
                  <div
                    className="absolute left-1/2 top-1/2 origin-top -translate-x-1/2"
                    style={{ transform: `translateX(-50%) rotate(${dialAngle}deg)` }}
                  >
                    <div className="w-0.5 rounded-full bg-orange-500" style={{ height: `${handLength}px` }} />
                  </div>
                  <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500 shadow-[0_0_0_6px_rgba(249,115,22,0.12)]" />

                  {dialValues.map((dialValue, index) => {
                    const isSelected =
                      activeSegment === "hour"
                        ? to12Hour(draftTime.hours24) === dialValue
                        : draftTime.minutes === dialValue;

                    return (
                      <button
                        key={dialValue}
                        type="button"
                        onClick={() =>
                          activeSegment === "hour" ? selectHour(dialValue) : selectMinute(dialValue)
                        }
                        className={cn(
                          "absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[13px] font-semibold transition sm:h-9 sm:w-9",
                          isSelected
                            ? "bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.28)]"
                            : "text-slate-700 hover:bg-white hover:text-slate-900",
                        )}
                        style={getDialItemPosition(index, 64)}
                      >
                        {activeSegment === "hour" ? dialValue : padNumber(dialValue)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="mt-3 text-center text-[11px] font-medium text-slate-400">
                {activeSegment === "hour"
                  ? "Toca el reloj para elegir la hora."
                  : "Toca el reloj para elegir los minutos."}
              </p>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => nudgeMinute(-1)}
                    className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-orange-200 hover:text-orange-600"
                    aria-label="Restar un minuto"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Ajuste fino
                  </span>
                  <button
                    type="button"
                    onClick={() => nudgeMinute(1)}
                    className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-orange-200 hover:text-orange-600"
                    aria-label="Sumar un minuto"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => commitTime(draftTime)}
                  className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
                >
                  OK
                </button>
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
