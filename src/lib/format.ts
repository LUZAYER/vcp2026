import { format, formatDistanceToNow, parseISO } from "date-fns";

export function fmtDate(d: string | Date | null | undefined, fallback = "—") {
  if (!d) return fallback;
  try {
    const date = typeof d === "string" ? parseISO(d) : d;
    return format(date, "MMM d, yyyy");
  } catch { return fallback; }
}

export function fmtDateTime(d: string | Date | null | undefined, fallback = "—") {
  if (!d) return fallback;
  try {
    const date = typeof d === "string" ? parseISO(d) : d;
    return format(date, "MMM d, yyyy 'at' h:mm a");
  } catch { return fallback; }
}

export function fmtRelative(d: string | Date | null | undefined, fallback = "—") {
  if (!d) return fallback;
  try {
    const date = typeof d === "string" ? parseISO(d) : d;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch { return fallback; }
}

export function fmtPct(n: number | null | undefined, digits = 0, fallback = "—") {
  if (n === null || n === undefined || Number.isNaN(n)) return fallback;
  return `${n.toFixed(digits)}%`;
}

export function fmtBytes(bytes: number | null | undefined) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

export function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}
