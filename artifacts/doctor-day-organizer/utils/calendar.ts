import type { PlannerEvent } from "@workspace/api-client-react";

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function shiftDate(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function monthCells(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const saturdayOffset = (first.getDay() + 1) % 7;
  const gridStart = shiftDate(first, -saturdayOffset);
  return Array.from({ length: 42 }, (_, index) => shiftDate(gridStart, index));
}

export function formatTime(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function startMinute(event: PlannerEvent): number {
  const [hour, minute] = event.startTime.split(":").map(Number);
  return hour * 60 + minute;
}

export function segmentOnDate(event: PlannerEvent, date: Date) {
  const dayDifference = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      parseDate(event.date).getTime()) /
      86400000,
  );
  const start = startMinute(event) - dayDifference * 1440;
  const end = start + event.durationMinutes;
  if (end <= 0 || start >= 1440) return null;
  return { start: Math.max(0, start), end: Math.min(1440, end) };
}

export function monthHoursByType(events: PlannerEvent[], month: Date) {
  const totals = new Map<string, number>();
  for (const event of events) {
    const start = parseDate(event.date);
    for (let offset = 0; offset < Math.ceil(event.durationMinutes / 1440) + 1; offset++) {
      const day = shiftDate(start, offset);
      if (day.getFullYear() !== month.getFullYear() || day.getMonth() !== month.getMonth()) continue;
      const segment = segmentOnDate(event, day);
      if (segment) totals.set(event.type, (totals.get(event.type) ?? 0) + segment.end - segment.start);
    }
  }
  return totals;
}

export function formatArabicNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("ar-SY", { maximumFractionDigits }).format(value);
}

export function groupTimeline(events: PlannerEvent[], date: Date) {
  const rows = events
    .map((event) => ({ event, segment: segmentOnDate(event, date) }))
    .filter((row): row is { event: PlannerEvent; segment: { start: number; end: number } } => row.segment !== null)
    .sort((a, b) => a.segment.start - b.segment.start || b.segment.end - a.segment.end);

  const positioned: {
    event: PlannerEvent;
    start: number;
    end: number;
    lane: number;
    laneCount: number;
  }[] = [];
  let group: typeof rows = [];
  let groupEnd = -1;

  const flush = () => {
    if (!group.length) return;
    const laneEnds: number[] = [];
    const placed = group.map((row) => {
      let lane = laneEnds.findIndex((end) => end <= row.segment.start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = row.segment.end;
      return { row, lane };
    });
    for (const item of placed) {
      positioned.push({
        event: item.row.event,
        start: item.row.segment.start,
        end: item.row.segment.end,
        lane: item.lane,
        laneCount: laneEnds.length,
      });
    }
    group = [];
    groupEnd = -1;
  };

  for (const row of rows) {
    if (group.length && row.segment.start >= groupEnd) flush();
    group.push(row);
    groupEnd = Math.max(groupEnd, row.segment.end);
  }
  flush();
  return positioned;
}

export function hasConflicts(events: PlannerEvent[], date: Date): boolean {
  const intervals = events
    .map((event) => segmentOnDate(event, date))
    .filter((item): item is { start: number; end: number } => item !== null)
    .sort((a, b) => a.start - b.start);
  return intervals.some((item, index) => index > 0 && item.start < intervals[index - 1].end);
}