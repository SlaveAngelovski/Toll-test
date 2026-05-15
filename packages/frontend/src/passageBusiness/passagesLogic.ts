import { VehicleType } from "@/types";
import { CHARGE_WINDOW_MINUTES, DAILY_CAP_DKK, FEE_SCHEDULE, TOLL_FREE_VEHICLE_TYPES } from "./passagesRules";
import { isTollFreeDate, localMinutesSinceMidnight, timeToMinutes, toDateKey } from "../app/utils/dateUtils";

export interface DailyTollRequest {
    vehicleType: string;
    passages: string[];
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


export enum NotChargedReason {
    TOLL_FREE_VEHICLE = "toll free vehicle",
    TOLL_FREE_DATE = "toll free date",
    WITHIN_ROLLING_WINDOW = "within rolling window",
    FEE_IS_ZERO = "fee is zero",
    DAILY_CAP_REACHED = "daily cap reached",
    DATE_PARSE_ERROR = "date parse error",
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


type WindowData = {
    passages: AnnotationInput[];
    maxFee: number;
    triggeringId: string;
    startISO: string;
    endISO: string;
}

/** Returns the toll fee in DKK for the local time encoded in the timestamp. */
export function getBaseFee(timestamp: string): number {
    const localMinutes = localMinutesSinceMidnight(timestamp);
    const entry = FEE_SCHEDULE.find(
        (e) => localMinutes >= timeToMinutes(e.from) && localMinutes <= timeToMinutes(e.to)
    );
    return entry?.feeDkk ?? 0;
}

/** Builds a PassageAnnotation with sensible defaults, spread-overridden by the caller. */
function makeAnnotation(p: AnnotationInput, overrides: Partial<PassageAnnotation>): PassageAnnotation {
    return {
        id: p.id,
        timestamp: p.timestamp,
        baseFee: getBaseFee(p.timestamp),
        charged: false,
        chargedFee: 0,
        ...overrides,
    };
}

/**
 * Starting at `startIndex`, advances through `dayPassages` until the
 * 60-minute window closes and returns all collected passages plus the
 * highest-fee passage id.
 */
function collectWindow(dayPassages: AnnotationInput[], startIndex: number): WindowData {
    const startMs = new Date(dayPassages[startIndex].timestamp).getTime();
    const endMs = startMs + CHARGE_WINDOW_MINUTES * 60_000;

    const isWithinWindow = (p: AnnotationInput) => new Date(p.timestamp).getTime() < endMs;

    // Slice out all passages that fall within the 60-minute window
    const remaining = dayPassages.slice(startIndex);
    const firstOutside = remaining.findIndex((p) => !isWithinWindow(p));
    const windowPassages = firstOutside === -1 ? remaining : remaining.slice(0, firstOutside);

    // Find the passage with the highest fee — that's the one that gets charged
    const { triggeringId, maxFee } = windowPassages.reduce(
        (best, p) => {
            const fee = getBaseFee(p.timestamp);
            return fee > best.maxFee ? { triggeringId: p.id, maxFee: fee } : best;
        },
        { triggeringId: windowPassages[0].id, maxFee: getBaseFee(windowPassages[0].timestamp) }
    );

    return {
        passages: windowPassages,
        maxFee,
        triggeringId,
        startISO: new Date(startMs).toISOString(),
        endISO: new Date(endMs).toISOString(),
    };
}

/**
 * Produces annotations for every passage in a single rolling window,
 * applying the daily-cap and rolling-window rules.
 */
function annotateWindow(
    win: WindowData,
    windowIndex: number,
    totalFeeSoFar: number
): { annotations: PassageAnnotation[]; chargedAmount: number } {
    const windowMeta = { windowStart: win.startISO, windowEnd: win.endISO, windowIndex };

    if (totalFeeSoFar >= DAILY_CAP_DKK) {
        return {
            annotations: win.passages.map((p) => makeAnnotation(p, { reason: NotChargedReason.DAILY_CAP_REACHED, ...windowMeta })),
            chargedAmount: 0,
        };
    }

    if (win.maxFee === 0) {
        return {
            annotations: win.passages.map((p) => makeAnnotation(p, { reason: NotChargedReason.FEE_IS_ZERO, ...windowMeta })),
            chargedAmount: 0,
        };
    }

    const chargedAmount = Math.min(win.maxFee, DAILY_CAP_DKK - totalFeeSoFar);
    const annotations = win.passages.map((p) =>
        p.id === win.triggeringId
            ? makeAnnotation(p, { charged: true, chargedFee: chargedAmount, ...windowMeta })
            : makeAnnotation(p, { reason: NotChargedReason.WITHIN_ROLLING_WINDOW, ...windowMeta })
    );

    return { annotations, chargedAmount };
}

/** Annotates all passages for a single calendar day. */
function annotateDay(dayPassages: AnnotationInput[]): PassageAnnotation[] {

    if (isTollFreeDate(dayPassages[0].timestamp)) {
        return dayPassages.map((p) => makeAnnotation(p, { reason: NotChargedReason.TOLL_FREE_DATE }));
    }

    const result: PassageAnnotation[] = [];
    let totalFee = 0;
    let windowIdx = 0;

    for (let i = 0; i < dayPassages.length;) {
        const win = collectWindow(dayPassages, i);
        const { annotations, chargedAmount } = annotateWindow(win, windowIdx, totalFee);
        result.push(...annotations);
        totalFee += chargedAmount;
        windowIdx++;
        i += win.passages.length;
    }

    return result;
}

/** Sorts passages chronologically (earliest first). */
function sortByTimestamp(passages: AnnotationInput[]): AnnotationInput[] {
    return [...passages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/** Groups passages by calendar date (YYYY-MM-DD), preserving chronological order within each group. */
function groupByDate(passages: AnnotationInput[]): AnnotationInput[][] {
    const byDate = new Map<string, AnnotationInput[]>();
    for (const p of passages) {
        const key = toDateKey(p.timestamp);
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key)!.push(p);
    }
    return [...byDate.values()];
}

/**
 * Annotates each passage with whether it was charged, how much, and why not
 * if it wasn't. Mirrors calculateDailyToll but returns per-passage detail.
 *
 * Passages with unparseable timestamps and all passages when vehicleType is
 * missing are annotated with DATE_PARSE_ERROR instead of being silently dropped.
 */
export function annotatePassages(vehicleType: string, passages: AnnotationInput[]): PassageAnnotation[] {
    if (!vehicleType) {
        return passages.map((p) => makeAnnotation(p, { reason: NotChargedReason.DATE_PARSE_ERROR }));
    }

    const { valid, invalid } = passages.reduce<{ valid: AnnotationInput[]; invalid: AnnotationInput[] }>(
        (acc, p) => {
            (isNaN(Date.parse(p.timestamp)) ? acc.invalid : acc.valid).push(p);
            return acc;
        },
        { valid: [], invalid: [] }
    );

    const errorAnnotations = invalid.map((p) => makeAnnotation(p, { reason: NotChargedReason.DATE_PARSE_ERROR }));

    if (valid.length === 0) return errorAnnotations;

    const sorted = sortByTimestamp(valid);
    const validAnnotations = TOLL_FREE_VEHICLE_TYPES.includes(vehicleType as VehicleType)
        ? sorted.map((p) => makeAnnotation(p, { reason: NotChargedReason.TOLL_FREE_VEHICLE }))
        : groupByDate(sorted).flatMap(annotateDay);

    return [...errorAnnotations, ...validAnnotations];
}

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
    for (const timestamp of request.passages) {
        if (!timestamp || isNaN(Date.parse(timestamp))) {
            notes.push(`Skipped malformed timestamp: "${timestamp}".`);
        } else {
            validTimestamps.push(timestamp);
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
