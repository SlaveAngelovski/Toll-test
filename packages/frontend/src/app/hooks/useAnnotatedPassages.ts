import { useMemo } from "react";
import { Passage } from "@/types";
import { annotatePassages, PassageAnnotation } from "@/passageBusiness/passagesLogic";
import { toDateKey } from "../utils/dateUtils";

export type WindowGroup = {
    windowStart: string | undefined;
    windowEnd: string | undefined;
    windowIndex: number | undefined;
    items: Array<{ passage: Passage; ann: PassageAnnotation | undefined }>;
};

export type VehicleData = {
    sorted: Passage[];
    last: Passage;
    annotations: PassageAnnotation[];
    dayTotals: { dateKey: string; total: number }[];
    windows: WindowGroup[];
};

function sortByTime(passages: Passage[]): Passage[] {
    return [...passages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function groupByVehicleId(passages: Passage[]): Map<string, Passage[]> {
    const map = new Map<string, Passage[]>();
    for (const p of passages) {
        if (!map.has(p.vehicleId)) map.set(p.vehicleId, []);
        map.get(p.vehicleId)!.push(p);
    }
    return map;
}

function groupIntoWindows(sorted: Passage[], annotations: PassageAnnotation[]): WindowGroup[] {
    const annMap = new Map(annotations.map((a) => [a.id, a]));
    const groups: WindowGroup[] = [];
    const seenWindows = new Map<string, number>();

    for (const passage of sorted) {
        const ann = annMap.get(passage.id);
        // Passages without a window (toll-free day/vehicle) fall back to their calendar
        // date so that different days never share the same group.
        const key = ann?.windowStart ?? toDateKey(passage.timestamp);
        if (!seenWindows.has(key)) {
            seenWindows.set(key, groups.length);
            groups.push({ windowStart: ann?.windowStart, windowEnd: ann?.windowEnd, windowIndex: ann?.windowIndex, items: [] });
        }
        groups[seenWindows.get(key)!].items.push({ passage, ann });
    }

    return groups;
}

function perDayTotals(annotations: PassageAnnotation[]): { dateKey: string; total: number }[] {
    const byDay = new Map<string, number>();
    for (const ann of annotations) {
        const key = toDateKey(ann.timestamp);
        byDay.set(key, (byDay.get(key) ?? 0) + ann.chargedFee);
    }
    return Array.from(byDay.entries()).map(([dateKey, total]) => ({ dateKey, total }));
}

/**
 * Derives per-vehicle annotated passage data from a flat list of passages.
 * Groups passages by vehicle, annotates each with charge information,
 * groups them into rolling 60-minute windows, and computes daily totals.
 */
export function useAnnotatedPassages(passages: Passage[]): Map<string, VehicleData> {
    return useMemo(() => {
        const byVehicle = groupByVehicleId(passages);
        const result = new Map<string, VehicleData>();

        for (const [vehicleId, vPassages] of byVehicle) {
            const sorted = sortByTime(vPassages);
            const last = sorted[sorted.length - 1];
            const annotations = annotatePassages(
                last.vehicleType,
                sorted.map((p) => ({ id: p.id, timestamp: p.timestamp }))
            );
            const dayTotals = perDayTotals(annotations);
            const windows = groupIntoWindows(sorted, annotations);
            result.set(vehicleId, { sorted, last, annotations, dayTotals, windows });
        }

        return result;
    }, [passages]);
}
