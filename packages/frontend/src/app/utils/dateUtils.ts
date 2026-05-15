import { PUBLIC_HOLIDAYS_2025, PUBLIC_HOLIDAYS_2026, TOLL_FREE_WEEKDAYS } from "../../passageBusiness/passagesRules";

const TIME_ZONE = "Europe/Copenhagen";

/** Converts a UTC Date to its equivalent Copenhagen wall-clock time. */
function toCopenhagenTime(date: Date): Date {
    const locale = date.toLocaleString("en-US", { timeZone: TIME_ZONE });
    return new Date(locale);
}

/** Converts an "HH:MM" time string to total minutes since midnight. */
export function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

/** Returns Copenhagen wall-clock time in minutes since midnight. */
export function localMinutesSinceMidnight(timestamp: string): number {
    const zoned = toCopenhagenTime(new Date(timestamp));
    return zoned.getHours() * 60 + zoned.getMinutes();
}

/** Returns true if the Copenhagen date falls on a toll-free weekday (Sat or Sun). */
export function isTollFreeWeekday(date: Date): boolean {
    const zoned = toCopenhagenTime(date);
    const iso = zoned.getDay() === 0 ? 7 : zoned.getDay();
    return TOLL_FREE_WEEKDAYS.includes(iso);
}

/** Returns true if the Copenhagen calendar date matches a public holiday. */
export function isTollFreeHoliday(date: Date): boolean {
    const zoned = toCopenhagenTime(date);
    const isoToSlash = zoned.toLocaleDateString("en-GB", {
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

/** Extracts "YYYY-MM-DD" for the Copenhagen calendar date of the timestamp. */
export function toDateKey(timestamp: string): string {
    const zoned = toCopenhagenTime(new Date(timestamp));
    const y = zoned.getFullYear();
    const m = String(zoned.getMonth() + 1).padStart(2, "0");
    const d = String(zoned.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/** Formats a timestamp into a human-friendly date and time string in Copenhagen time. */
export function formatDateTime(timestamp: string): string {
    const zoned = toCopenhagenTime(new Date(timestamp));
    return zoned.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

/** Formats a timestamp into a human-friendly time string in Copenhagen time. */
export function formatTime(timestamp: string): string {
    const zoned = toCopenhagenTime(new Date(timestamp));
    return zoned.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}