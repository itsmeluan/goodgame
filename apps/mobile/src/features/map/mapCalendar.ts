import { parseLocalDateTimeInput, toLocalDateTimeInput } from "@/lib/formatting";

export function getComposerDateParts(date: Date) {
  const localValue = toLocalDateTimeInput(date);
  const [datePart, timePart] = localValue.split(" ");
  const [hour = "00", minute = "00"] = (timePart ?? "00:00").split(":");

  return {
    date: datePart,
    hour,
    minute,
  };
}

/** Snap minute to 00/15/30/45 to match `TIME_MINUTES` in the composer. */
export function snapComposerMinuteToQuarter(minute: string): string {
  const n = Math.min(59, Math.max(0, parseInt(minute, 10) || 0));
  const snapped = Math.round(n / 15) * 15 % 60;
  return String(snapped).padStart(2, "0");
}

export function buildComposerStartsAtIso(input: {
  date: string;
  hour: string;
  minute: string;
}) {
  const localValue = `${input.date} ${input.hour}:${input.minute}`;
  return parseLocalDateTimeInput(localValue);
}

export function parseComposerDate(dateKey: string) {
  const parsed = new Date(`${dateKey}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

export function startOfCalendarMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function shiftCalendarMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function formatComposerDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(parseComposerDate(dateKey))
    .replace(".", "");
}

export function formatCalendarMonthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatFilterDateSummary(start: string | null, end: string | null) {
  if (!start && !end) {
    return "Qualquer data";
  }

  if (start && !end) {
    return `Exatamente em ${formatCompactDateLabel(start)}`;
  }

  if (start && end) {
    return `${formatCompactDateLabel(start)} até ${formatCompactDateLabel(end)}`;
  }

  return "Qualquer data";
}

export function formatCompactDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseComposerDate(dateKey));
}

export function selectFilterDateRange(input: {
  currentStart: string | null;
  currentEnd: string | null;
  selectedDate: string;
}) {
  if (!input.currentStart || (input.currentStart && input.currentEnd)) {
    return {
      start: input.selectedDate,
      end: null,
    };
  }

  if (input.selectedDate < input.currentStart) {
    return {
      start: input.selectedDate,
      end: input.currentStart,
    };
  }

  if (input.selectedDate === input.currentStart) {
    return {
      start: input.selectedDate,
      end: null,
    };
  }

  return {
    start: input.currentStart,
    end: input.selectedDate,
  };
}

export function buildCalendarCells(monthCursor: Date) {
  const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const firstGridDay = new Date(start);
  firstGridDay.setDate(firstGridDay.getDate() - firstGridDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(firstGridDay);
    cellDate.setDate(firstGridDay.getDate() + index);

    return {
      date: cellDate,
      dateKey: toCalendarDateKey(cellDate),
      dayNumber: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === monthCursor.getMonth(),
    };
  });
}

export function toCalendarDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
