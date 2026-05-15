import { PUBLIC_HOLIDAYS_2025, PUBLIC_HOLIDAYS_2026, TOLL_FREE_WEEKDAYS } from "../../passageBusiness/passagesRules";

/** Converts an "HH:MM" time string to total minutes since midnight. */
export function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

/**
 * Extracts the local wall-clock time in minutes since midnight from an ISO-8601
 * timestamp. Uses the timestamp's own UTC offset (e.g. +02:00) so the result
 * is never affected by the runtime's system timezone.
 * Falls back to UTC when no offset is present.
 */
export function localMinutesSinceMidnight(timestamp: string): number {
    const date = new Date(timestamp);
    const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();

    // Offset is always the last 6 chars: "+02:00" or "-05:30". No offset → use UTC.
    const sign = timestamp.at(-6);
    if (sign !== "+" && sign !== "-") return utcMinutes;

    const offsetHours = Number(timestamp.slice(-5, -3));
    const offsetMins = Number(timestamp.slice(-2));
    const offsetMinutes = (sign === "+" ? 1 : -1) * (offsetHours * 60 + offsetMins);
    return (utcMinutes + offsetMinutes + 1440) % 1440;
}

/**
 * Returns true if the date encoded in the ISO-8601 timestamp falls on a
 * toll-free weekday (Saturday or Sunday, ISO Mon=1…Sun=7).
 */
export function isTollFreeWeekday(date: Date): boolean {
    const iso = date.getDay() === 0 ? 7 : date.getDay();
    return TOLL_FREE_WEEKDAYS.includes(iso);
}

/**
 * Returns true if the calendar date of the timestamp matches any entry in
 * the provided holiday list (DD/MM/YYYY format).
 */
export function isTollFreeHoliday(date: Date): boolean {
    const isoToSlash = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
    return (
        PUBLIC_HOLIDAYS_2025.some((h) => h.date === isoToSlash) ||
        PUBLIC_HOLIDAYS_2026.some((h) => h.date === isoToSlash)
    );
}

/** Returns true if no toll should be charged for this timestamp. */
export function isTollFreeDate(timestamp: string): boolean {
    const date = new Date(timestamp);
    return isTollFreeWeekday(date) || isTollFreeHoliday(date);
}

/** Extracts "YYYY-MM-DD" from an ISO-8601 timestamp using its UTC date. */
export function toDateKey(timestamp: string): string {
    return new Date(timestamp).toISOString().slice(0, 10);
}
