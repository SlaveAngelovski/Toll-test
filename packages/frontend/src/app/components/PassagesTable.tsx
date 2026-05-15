"use client";

import { Fragment, useMemo, useState } from "react";
import { Passage } from "@/types";
import { annotatePassages, PassageAnnotation } from "@/passageBusiness/passagesLogic";
import { formatDateTime, formatTime, toDateKey } from "../utils/dateUtils";

type WindowGroup = {
    windowStart: string | undefined;
    windowEnd: string | undefined;
    windowIndex: number | undefined;
    items: Array<{ passage: Passage; ann: PassageAnnotation | undefined }>;
}

type Props = {
    passages: Passage[];
    loading: boolean;
    onDelete: (id: string) => void;
    onAdd: () => void;
}



function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function formatWindowHeader(start: string, end: string, index: number): string {
    const startLabel = formatDateTime(start);
    return `Window ${index + 1}: ${startLabel} – ${formatTime(end)}`;
}

function dailyTotalTag(total: number): { className: string; label: string } {
    if (total >= 120) return { className: "tag is-danger", label: `${total} DKK · cap reached` };
    if (total > 0) return { className: "tag is-warning", label: `${total} DKK` };
    return { className: "tag is-light", label: `${total} DKK` };
}

function chargeTag(ann: PassageAnnotation | undefined, baseFee: number): { className: string; label: string } {
    if (ann?.charged) return { className: "tag is-success is-light", label: `Charged ${ann.chargedFee} DKK` };
    return { className: "tag is-light", label: ann?.reason ?? "Not charged" };
}

function windowChargedTotal(group: WindowGroup): number {
    return group.items.reduce((sum, { ann }) => sum + (ann?.chargedFee ?? 0), 0);
}

function sortByTime(passages: Passage[]): Passage[] {
    return [...passages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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

function groupByVehicleId(passages: Passage[]): Map<string, Passage[]> {
    const map = new Map<string, Passage[]>();
    for (const p of passages) {
        if (!map.has(p.vehicleId)) map.set(p.vehicleId, []);
        map.get(p.vehicleId)!.push(p);
    }
    return map;
}

/** Groups annotations by calendar day and returns the charged total for each day. */
function perDayTotals(annotations: PassageAnnotation[]): { dateKey: string; total: number }[] {
    const byDay = new Map<string, number>();
    for (const ann of annotations) {
        const key = toDateKey(ann.timestamp);
        byDay.set(key, (byDay.get(key) ?? 0) + ann.chargedFee);
    }
    return Array.from(byDay.entries()).map(([dateKey, total]) => ({ dateKey, total }));
}

export function PassagesTable({ passages, loading, onDelete, onAdd }: Props) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const groups = useMemo(() => groupByVehicleId(passages), [passages]);

    const toggleExpand = (vehicleId: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(vehicleId) ? next.delete(vehicleId) : next.add(vehicleId);
            return next;
        });
    };

    if (loading) return <span className="loader" />;

    if (passages.length === 0) {
        return (
            <div className="has-text-centered py-5">
                <p className="has-text-grey mb-3">No passages recorded yet.</p>
                <button className="button is-primary" onClick={onAdd}>
                    Add first passage
                </button>
            </div>
        );
    }

    return (
        <div className="table-container">
            <table className="table is-fullwidth is-hoverable is-bordered">
                <thead>
                    <tr>
                        <th>Vehicle ID</th>
                        <th>
                            <span>Vehicle Type</span>
                        </th>
                        <th>Last Passage</th>
                        <th>Daily Total</th>
                        <th style={{ width: "1%" }}>
                            <button className="button is-small is-primary" onClick={onAdd}>
                                + Add
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {Array.from(groups.entries()).map(([vehicleId, vPassages]) => {
                        const sorted = sortByTime(vPassages);
                        const last = sorted[sorted.length - 1];
                        const isExpanded = expanded.has(vehicleId);
                        const annotations = annotatePassages(last.vehicleType, sorted.map((p) => ({ id: p.id, timestamp: p.timestamp })));
                        const dayTotals = perDayTotals(annotations);
                        const windows = groupIntoWindows(sorted, annotations);

                        return (
                            <Fragment key={vehicleId}>
                                {/* Summary row */}
                                <tr className="mainRowBg">
                                    <td className="has-text-weight-medium">{vehicleId}</td>
                                    <td>{last.vehicleType}</td>
                                    <td>{formatDateTime(last.timestamp)}</td>
                                    <td>
                                        {dayTotals.map(({ dateKey, total }) => {
                                            const tag = dailyTotalTag(total);
                                            return <span key={dateKey} className={tag.className}>{tag.label}</span>;
                                        })}
                                    </td>
                                    <td>
                                        <button
                                            className="button is-small is-light"
                                            onClick={() => toggleExpand(vehicleId)}
                                            title={isExpanded ? "Collapse" : "Expand"}
                                        >
                                            {isExpanded ? "▼" : "▶"} {sorted.length} passage{sorted.length !== 1 ? "s" : ""}
                                        </button>
                                    </td>
                                </tr>

                                {/* Expanded: one window-header row + passage rows per window */}
                                {isExpanded && windows.map((group, gi) => {
                                    const windowTotal = windowChargedTotal(group);
                                    const windowLabel = group.windowStart
                                        ? formatWindowHeader(group.windowStart, group.windowEnd!, group.windowIndex ?? gi)
                                        : null;
                                    // Toll-free groups have no windowStart — show a plain date header instead
                                    const dateLabel = !windowLabel && group.items.length > 0
                                        ? formatDate(group.items[0].passage.timestamp)
                                        : null;

                                    return (
                                        <Fragment key={group.windowStart ?? `no-window-${gi}`}>
                                            {windowLabel && (
                                                <tr className="expandedRowWindow">
                                                    <td colSpan={3} className="has-text-weight-medium pl-5">
                                                        <span className="is-small is-size-7">{windowLabel}</span>
                                                    </td>
                                                    <td colSpan={2}>
                                                        <span>{<span className="tag is-warning">{windowTotal} DKK</span>}</span>
                                                    </td>
                                                </tr>
                                            )}
                                            {dateLabel && (
                                                <tr className="expandedRowWindow">
                                                    <td colSpan={5} className="has-text-weight-medium pl-5">
                                                        <span className="is-small is-size-7">{dateLabel} · toll-free</span>
                                                    </td>
                                                </tr>
                                            )}
                                            {group.items.map(({ passage, ann }) => {
                                                const tag = chargeTag(ann, passage.baseFee);

                                                return (
                                                    <tr key={passage.id} className="expandedRowTimestamp">
                                                        <td colSpan={2} className="is-small pl-5">
                                                            <span className="pl-4">
                                                                {formatDateTime(passage.timestamp)}
                                                            </span>
                                                        </td>
                                                        <td className="is-small" style={{ fontSize: "0.9em" }}>Base: {ann?.baseFee ?? passage.baseFee} DKK</td>
                                                        <td><span className={tag.className} title={ann?.reason}>{tag.label}</span></td>
                                                        <td>
                                                            <button className="button is-danger is-small is-light" onClick={() => onDelete(passage.id)}>
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </Fragment>
                                    );
                                })}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
