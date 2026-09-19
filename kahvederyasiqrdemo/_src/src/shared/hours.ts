/** Çalışma saatleri — hem build (haftalık liste) hem istemci ("şu an açık mı") kullanır. */
import type { BranchHours } from "../data/schema";

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Şube saat diliminde şu anki ISO hafta günü (1–7) ve gün içi dakika. */
export function nowIn(timeZone: string, date = new Date()): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1;
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export type OpenState =
  | { open: true; closes: string }
  /** inDays: 0 bugün, 1 yarın, 2+ ileriki gün (weekday ile adlandırılır) */
  | { open: false; opens: string; weekday: number; inDays: number }
  | { open: false; opens: null };

export function openState(hours: BranchHours[], now: { weekday: number; minutes: number }): OpenState {
  const prev = now.weekday === 1 ? 7 : now.weekday - 1;
  // Dünden sarkan dilim (ör. cuma 07:30–00:30 → cumartesi 00:15'te hâlâ açık)
  for (const h of hours) {
    const o = toMin(h.opens), c = toMin(h.closes);
    if (h.weekday === prev && c < o && now.minutes < c) return { open: true, closes: h.closes };
  }
  for (const h of hours) {
    if (h.weekday !== now.weekday) continue;
    const o = toMin(h.opens), c = toMin(h.closes);
    if (now.minutes >= o && (c < o || now.minutes < c)) return { open: true, closes: h.closes };
  }
  // Kapalı: bugün daha sonra ya da sonraki ilk açılış
  const today = hours.find((h) => h.weekday === now.weekday && toMin(h.opens) > now.minutes);
  if (today) return { open: false, opens: today.opens, weekday: now.weekday, inDays: 0 };
  for (let i = 1; i <= 7; i++) {
    const wd = ((now.weekday - 1 + i) % 7) + 1;
    const h = hours.find((x) => x.weekday === wd);
    if (h) return { open: false, opens: h.opens, weekday: wd, inDays: i };
  }
  return { open: false, opens: null };
}

/** "24:00" gibi değerleri görünümde "00:00" yapar. */
export const displayTime = (hhmm: string) => (hhmm === "24:00" ? "00:00" : hhmm);
