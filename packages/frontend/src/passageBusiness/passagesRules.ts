// ---------------------------------------------------------------------------
// Vehicle types, for now I added the types to the frontend and backend separately, but we could move them to a shared package.
// ---------------------------------------------------------------------------

import { VehicleType } from "@/types";

export const VEHICLE_TYPES: VehicleType[] = [
    "car",
    "motorbike",
    "emergency",
    "tractor",
    "diplomat",
    "military",
    "foreign",
    "bus",
];

export const TOLL_FREE_VEHICLE_TYPES: VehicleType[] = [
    "motorbike",
    "emergency",
    "tractor",
    "diplomat",
    "military",
    "bus",
];

// ---------------------------------------------------------------------------
// Fee schedule
// ---------------------------------------------------------------------------

/** A single entry in the fee schedule. Times are "HH:MM" strings in local time. */
export interface FeeScheduleEntry {
    /** Start of the interval, inclusive ("HH:MM"). */
    from: string;
    /** End of the interval, inclusive ("HH:MM"). */
    to: string;
    /** Fee in DKK. */
    feeDkk: number;
}

/**
 * Fee schedule based on local time (rule 1).
 * Entries are non-overlapping and collectively exhaustive for a full day.
 */
export const FEE_SCHEDULE: FeeScheduleEntry[] = [
    { from: "00:00", to: "05:59", feeDkk: 0 },
    { from: "06:00", to: "06:29", feeDkk: 10 },
    { from: "06:30", to: "06:59", feeDkk: 16 },
    { from: "07:00", to: "07:59", feeDkk: 25 },
    { from: "08:00", to: "08:29", feeDkk: 16 },
    { from: "08:30", to: "14:59", feeDkk: 10 },
    { from: "15:00", to: "15:29", feeDkk: 16 },
    { from: "15:30", to: "16:59", feeDkk: 25 },
    { from: "17:00", to: "17:59", feeDkk: 16 },
    { from: "18:00", to: "18:29", feeDkk: 10 },
    { from: "18:30", to: "23:59", feeDkk: 0 },
];

// ---------------------------------------------------------------------------
// Charging rules
// ---------------------------------------------------------------------------

/** Rolling window size in minutes (rule 2). */
export const CHARGE_WINDOW_MINUTES = 60;

/** Maximum total fee per vehicle per calendar day in DKK (rule 3). */
export const DAILY_CAP_DKK = 120;

// ---------------------------------------------------------------------------
// Toll-free dates (2025)
// ---------------------------------------------------------------------------

export interface PublicHoliday {
    /** DD/MM/YYYY */
    date: string;
    description: string;
}

/**
 * Public holidays for 2025 on which no toll is charged (rule 5).
 * Weekends (Saturday/Sunday) are toll-free by day-of-week check, not listed here.
 */
export const PUBLIC_HOLIDAYS_2025: PublicHoliday[] = [
    { date: "01/01/2025", description: "New Year's Day" },
    { date: "17/04/2025", description: "Maundy Thursday" },
    { date: "18/04/2025", description: "Good Friday" },
    { date: "19/04/2025", description: "Holy Saturday" },
    { date: "20/04/2025", description: "Easter Sunday" },
    { date: "21/04/2025", description: "Easter Monday" },
    { date: "29/05/2025", description: "Ascension Day" },
    { date: "08/06/2025", description: "Whit Sunday" },
    { date: "09/06/2025", description: "Whit Monday" },
    { date: "24/12/2025", description: "Christmas Eve" },
    { date: "25/12/2025", description: "Christmas Day" },
    { date: "26/12/2025", description: "Boxing Day" },
];

export const PUBLIC_HOLIDAYS_2026: PublicHoliday[] = [
    { date: "01/01/2026", description: "New Year's Day" },
    { date: "06/04/2026", description: "Maundy Monday" },
    { date: "07/04/2026", description: "Good Tuesday" },
    { date: "08/04/2026", description: "Holy Wednesday" },
    { date: "09/04/2026", description: "Maundy Thursday" },
    { date: "10/04/2026", description: "Good Friday" },
    { date: "11/04/2026", description: "Holy Saturday" },
    { date: "12/04/2026", description: "Easter Sunday" },
    { date: "13/04/2026", description: "Easter Monday" },
    { date: "21/05/2026", description: "Ascension Day" },
    { date: "31/05/2026", description: "Whit Sunday" },
    { date: "01/06/2026", description: "Whit Monday" },
    { date: "24/12/2026", description: "Christmas Eve" },
    { date: "25/12/2026", description: "Christmas Day" },
    { date: "26/12/2026", description: "Boxing Day" },
];

/** ISO day-of-week numbers that are always toll-free (Mon=1 … Sun=7). Saturday=6, Sunday=7. */
export const TOLL_FREE_WEEKDAYS = [6, 7] as const;
export type TollFreeWeekday = typeof TOLL_FREE_WEEKDAYS[number];
