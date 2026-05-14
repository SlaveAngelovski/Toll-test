import {
    CHARGE_WINDOW_MINUTES,
    DAILY_CAP_DKK,
    FEE_SCHEDULE,
    PUBLIC_HOLIDAYS_2025,
    TOLL_FREE_VEHICLE_TYPES,
    TOLL_FREE_WEEKDAYS,
    VehicleType,
} from "./passagesRules";

// ---------------------------------------------------------------------------
// Public types (assignment request / response shapes)
// ---------------------------------------------------------------------------

export interface PassageEvent {
    /** ISO-8601 string that must include a timezone offset, e.g. "2025-04-07T07:30:00+02:00". */
    timestamp: string;
}

export interface DailyTollRequest {
    vehicleType: string;
    passages: PassageEvent[];
}

export interface ChargedPassage {
    windowStart: string;
    windowEnd: string;
    appliedFeeDkk: number;
    triggeringTimestamp: string;
}

export interface DailyTollResponse {
    date: string;
    totalFeeDkk: number;
    chargedPassages?: ChargedPassage[];
    notes?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert an "HH:MM" string to total minutes from midnight. */
function hhmm(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

/**
 * Look up the base fee for a timestamp using the FEE_SCHEDULE.
 * Evaluation uses the local wall-clock time encoded in the ISO-8601 offset.
 */
export function getBaseFee(timestamp: string): number {
    const date = new Date(timestamp);

    // Extract local HH:MM from the timestamp's own offset so we never
    // silently collapse to the runtime's system timezone.
    const offsetMatch = timestamp.match(/([+-])(\d{2}):(\d{2})$/);
    let localMinutes: number;

    if (offsetMatch) {
        const sign = offsetMatch[1] === "+" ? 1 : -1;
        const offsetMinutes = sign * (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3]));
        const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
        localMinutes = ((utcMinutes + offsetMinutes) % 1440 + 1440) % 1440;
    } else {
        // Fallback: treat as UTC
        localMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
    }

    const entry = FEE_SCHEDULE.find(
        (e) => localMinutes >= hhmm(e.from) && localMinutes <= hhmm(e.to)
    );
    return entry?.feeDkk ?? 0;
}

/**
 * Returns true if the date encoded in the ISO-8601 timestamp falls on a
 * toll-free weekday (Saturday or Sunday, ISO Mon=1…Sun=7).
 */
function isTollFreeWeekday(timestamp: string): boolean {
    const date = new Date(timestamp);
    // getDay() returns 0=Sun … 6=Sat; convert to ISO 1=Mon … 7=Sun
    const iso = date.getDay() === 0 ? 7 : date.getDay();
    return (TOLL_FREE_WEEKDAYS as readonly number[]).includes(iso);
}

/**
 * Returns true if the calendar date of the timestamp matches any entry in
 * the provided holiday list (DD/MM/YYYY format).
 */
function isTollFreeHoliday(timestamp: string): boolean {
    const date = new Date(timestamp);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = String(date.getFullYear());
    const key = `${dd}/${mm}/${yyyy}`;
    return PUBLIC_HOLIDAYS_2025.some((h) => h.date === key);
}

/** Returns true if no toll should be charged for this timestamp. */
function isTollFreeDate(timestamp: string): boolean {
    return isTollFreeWeekday(timestamp) || isTollFreeHoliday(timestamp);
}

/** Extract "YYYY-MM-DD" from an ISO-8601 timestamp using its UTC date. */
function toDateKey(timestamp: string): string {
    return new Date(timestamp).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Passage annotation — per-passage charge detail with reason
// ---------------------------------------------------------------------------

export enum NotChargedReason {
    TOLL_FREE_VEHICLE = "toll free vehicle",
    TOLL_FREE_DATE = "toll free date",
    WITHIN_ROLLING_WINDOW = "within rolling window",
    FEE_IS_ZERO = "fee is zero",
    DAILY_CAP_REACHED = "daily cap reached",
}

export interface AnnotationInput {
    id: string;
    timestamp: string;
}

export interface PassageAnnotation {
    id: string;
    timestamp: string;
    baseFee: number;
    charged: boolean;
    chargedFee: number;
    reason?: NotChargedReason;
    /** ISO string of the rolling window's start (= timestamp of window's first passage). */
    windowStart?: string;
    /** ISO string of the rolling window's end (windowStart + 60 min). */
    windowEnd?: string;
    /** 0-based index of this window within its calendar day. */
    windowIndex?: number;
}

/**
 * Annotates each passage with whether it was charged, how much, and why not
 * if it wasn't. Mirrors calculateDailyToll but returns per-passage detail.
 */
export function annotatePassages(
    vehicleType: string,
    passages: AnnotationInput[]
): PassageAnnotation[] {
    const sorted = [...passages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const vt = vehicleType as VehicleType;

    // Rule 4 – toll-free vehicle: all passages get the same reason
    if (TOLL_FREE_VEHICLE_TYPES.includes(vt)) {
        return sorted.map((p) => ({
            id: p.id,
            timestamp: p.timestamp,
            baseFee: getBaseFee(p.timestamp),
            charged: false,
            chargedFee: 0,
            reason: NotChargedReason.TOLL_FREE_VEHICLE,
        }));
    }

    const result: PassageAnnotation[] = [];

    // Group by calendar date so the daily cap resets each day
    const byDate = new Map<string, AnnotationInput[]>();
    for (const p of sorted) {
        const key = toDateKey(p.timestamp);
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key)!.push(p);
    }

    for (const dayPassages of byDate.values()) {
        // Rule 5 – toll-free date
        if (isTollFreeDate(dayPassages[0].timestamp)) {
            for (const p of dayPassages) {
                result.push({
                    id: p.id,
                    timestamp: p.timestamp,
                    baseFee: getBaseFee(p.timestamp),
                    charged: false,
                    chargedFee: 0,
                    reason: NotChargedReason.TOLL_FREE_DATE,
                });
            }
            continue;
        }

        let totalFee = 0;
        let windowIdx = 0;

        for (let i = 0; i < dayPassages.length;) {
            // Rule 2 – compute the window boundaries first so cap-reached passages
            // are still assigned to their correct window for display purposes.
            const windowStartMs = new Date(dayPassages[i].timestamp).getTime();
            const windowEndMs = windowStartMs + CHARGE_WINDOW_MINUTES * 60_000;
            const windowStartISO = new Date(windowStartMs).toISOString();
            const windowEndISO = new Date(windowEndMs).toISOString();

            let maxFee = 0;
            let triggeringId = dayPassages[i].id;
            let j = i;

            for (; j < dayPassages.length && new Date(dayPassages[j].timestamp).getTime() < windowEndMs; j++) {
                const fee = getBaseFee(dayPassages[j].timestamp);
                if (fee > maxFee) {
                    maxFee = fee;
                    triggeringId = dayPassages[j].id;
                }
            }

            const windowPassages = dayPassages.slice(i, j);

            // Rule 3 – daily cap already reached before this window
            if (totalFee >= DAILY_CAP_DKK) {
                for (const p of windowPassages) {
                    result.push({
                        id: p.id,
                        timestamp: p.timestamp,
                        baseFee: getBaseFee(p.timestamp),
                        charged: false,
                        chargedFee: 0,
                        reason: NotChargedReason.DAILY_CAP_REACHED,
                        windowStart: windowStartISO,
                        windowEnd: windowEndISO,
                        windowIndex: windowIdx,
                    });
                }
            } else if (maxFee === 0) {
                // All passages in this window fall in a 0-fee band
                for (const p of windowPassages) {
                    result.push({
                        id: p.id,
                        timestamp: p.timestamp,
                        baseFee: 0,
                        charged: false,
                        chargedFee: 0,
                        reason: NotChargedReason.FEE_IS_ZERO,
                        windowStart: windowStartISO,
                        windowEnd: windowEndISO,
                        windowIndex: windowIdx,
                    });
                }
            } else {
                const applicable = Math.min(maxFee, DAILY_CAP_DKK - totalFee);
                totalFee += applicable;

                for (const p of windowPassages) {
                    const baseFee = getBaseFee(p.timestamp);
                    if (p.id === triggeringId) {
                        result.push({ id: p.id, timestamp: p.timestamp, baseFee, charged: true, chargedFee: applicable, windowStart: windowStartISO, windowEnd: windowEndISO, windowIndex: windowIdx });
                    } else {
                        result.push({ id: p.id, timestamp: p.timestamp, baseFee, charged: false, chargedFee: 0, reason: NotChargedReason.WITHIN_ROLLING_WINDOW, windowStart: windowStartISO, windowEnd: windowEndISO, windowIndex: windowIdx });
                    }
                }
            }

            windowIdx++;
            i = j;
        }
    }

    return result;
}

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the daily toll for a single vehicle on a single calendar day.
 *
 * Rules applied:
 *  1. Fee schedule look-up per passage.
 *  2. Rolling 60-minute windows — only the highest fee per window is charged.
 *  3. Daily cap of 120 DKK.
 *  4. Toll-free vehicle types → total is always 0.
 *  5. Toll-free dates (weekends + public holidays) → total is always 0.
 */
function calculateDailyToll(
    vehicleType: VehicleType,
    sortedTimestamps: string[]
): { totalFeeDkk: number; chargedPassages: ChargedPassage[] } {
    // Rule 4 – toll-free vehicle
    if (TOLL_FREE_VEHICLE_TYPES.includes(vehicleType)) {
        return { totalFeeDkk: 0, chargedPassages: [] };
    }

    // Rule 5 – toll-free date (all passages are on the same day by this point)
    if (sortedTimestamps.length > 0 && isTollFreeDate(sortedTimestamps[0])) {
        return { totalFeeDkk: 0, chargedPassages: [] };
    }

    const chargedPassages: ChargedPassage[] = [];
    let totalFee = 0;

    for (let i = 0; i < sortedTimestamps.length;) {
        // Rule 2 – open a new 60-minute window starting at passage i
        const windowStart = sortedTimestamps[i];
        const windowStartMs = new Date(windowStart).getTime();
        const windowEndMs = windowStartMs + CHARGE_WINDOW_MINUTES * 60_000;

        let maxFee = 0;
        let triggeringTimestamp = windowStart;
        let j = i;

        for (; j < sortedTimestamps.length && new Date(sortedTimestamps[j]).getTime() < windowEndMs; j++) {
            const fee = getBaseFee(sortedTimestamps[j]);
            if (fee > maxFee) {
                maxFee = fee;
                triggeringTimestamp = sortedTimestamps[j];
            }
        }

        if (maxFee > 0) {
            // Rule 3 – apply daily cap
            const applicable = Math.min(maxFee, DAILY_CAP_DKK - totalFee);
            totalFee += applicable;

            chargedPassages.push({
                windowStart,
                windowEnd: new Date(windowEndMs).toISOString(),
                appliedFeeDkk: applicable,
                triggeringTimestamp,
            });

            if (totalFee >= DAILY_CAP_DKK) break;
        }

        i = j; // advance past all passages consumed by this window
    }

    return { totalFeeDkk: totalFee, chargedPassages };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Calculate toll fees for a vehicle from a list of passages.
 *
 * Passages may span multiple calendar dates — they are split by date and a
 * separate DailyTollResponse is returned for each date.
 *
 * Invalid (unparseable) timestamps are skipped and reported in `notes`.
 */
export function calculateToll(request: DailyTollRequest): DailyTollResponse[] {
    const notes: string[] = [];

    // Validate vehicle type
    const vehicleType = request.vehicleType as VehicleType;
    if (!vehicleType) {
        return [{ date: "unknown", totalFeeDkk: 0, notes: ["Missing vehicleType."] }];
    }

    // Parse and validate timestamps
    const validTimestamps: string[] = [];
    for (const passage of request.passages) {
        if (!passage.timestamp || isNaN(Date.parse(passage.timestamp))) {
            notes.push(`Skipped malformed timestamp: "${passage.timestamp}".`);
        } else {
            validTimestamps.push(passage.timestamp);
        }
    }

    if (validTimestamps.length === 0) {
        return [{ date: "unknown", totalFeeDkk: 0, notes: ["No valid passages provided.", ...notes] }];
    }

    // Sort ascending
    validTimestamps.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // Group by calendar date (UTC date key — consistent with toISOString)
    const byDate = new Map<string, string[]>();
    for (const ts of validTimestamps) {
        const key = toDateKey(ts);
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key)!.push(ts);
    }

    const responses: DailyTollResponse[] = [];

    for (const [date, timestamps] of byDate) {
        const { totalFeeDkk, chargedPassages } = calculateDailyToll(vehicleType, timestamps);
        responses.push({
            date,
            totalFeeDkk,
            chargedPassages,
            notes: notes.length > 0 ? notes : undefined,
        });
    }

    return responses;
}
