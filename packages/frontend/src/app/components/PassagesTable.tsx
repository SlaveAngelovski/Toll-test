"use client";

import { Fragment, useMemo, useState } from "react";
import { Passage } from "@/types";
import { annotatePassages, PassageAnnotation } from "@/passageBusiness/passagesLogic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WindowGroup {
    windowStart: string | undefined;
    windowEnd: string | undefined;
    windowIndex: number | undefined;
    items: Array<{ passage: Passage; ann: PassageAnnotation | undefined }>;
}

interface Props {
    passages: Passage[];
    loading: boolean;
    onDelete: (id: string) => void;
    onAdd: () => void;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString([], { hour12: false });
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatWindowHeader(start: string, end: string, index: number): string {
    const startLabel = new Date(start).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
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

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function sortByTime(passages: Passage[]): Passage[] {
    return [...passages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function groupIntoWindows(sorted: Passage[], annotations: PassageAnnotation[]): WindowGroup[] {
    const annMap = new Map(annotations.map((a) => [a.id, a]));
    const groups: WindowGroup[] = [];
    const seenWindows = new Map<string | undefined, number>();

    for (const passage of sorted) {
        const ann = annMap.get(passage.id);
        const key = ann?.windowStart;
        if (!seenWindows.has(key)) {
            seenWindows.set(key, groups.length);
            groups.push({ windowStart: ann?.windowStart, windowEnd: ann?.windowEnd, windowIndex: ann?.windowIndex, items: [] });
        }
        groups[seenWindows.get(key)!].items.push({ passage, ann });
    }

    return groups;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PassagesTable({ passages, loading, onDelete, onAdd }: Props) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const groups = useMemo(() => {
        const map = new Map<string, Passage[]>();
        for (const p of passages) {
            if (!map.has(p.vehicleId)) map.set(p.vehicleId, []);
            map.get(p.vehicleId)!.push(p);
        }
        return map;
    }, [passages]);

    const toggleExpand = (vehicleId: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(vehicleId)) next.delete(vehicleId);
            else next.add(vehicleId);
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
            <table className="table is-fullwidth is-hoverable">
                <thead>
                    <tr>
                        <th>Vehicle ID</th>
                        <th>Vehicle Type</th>
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
                        const dailyTotal = annotations.filter((a) => a.charged).reduce((sum, a) => sum + a.chargedFee, 0);
                        const windows = groupIntoWindows(sorted, annotations);
                        const totalTag = dailyTotalTag(dailyTotal);

                        return (
                            <Fragment key={vehicleId}>
                                {/* Summary row */}
                                <tr>
                                    <td><strong>{vehicleId}</strong></td>
                                    <td>{last.vehicleType}</td>
                                    <td>{formatDateTime(last.timestamp)}</td>
                                    <td><span className={totalTag.className}>{totalTag.label}</span></td>
                                    <td>
                                        <button
                                            className="button is-small is-light"
                                            onClick={() => toggleExpand(vehicleId)}
                                            title={isExpanded ? "Collapse" : "Expand"}
                                        >
                                            {isExpanded ? "▲" : "▼"} {sorted.length} passage{sorted.length !== 1 ? "s" : ""}
                                        </button>
                                    </td>
                                </tr>

                                {/* Expanded: one window-header row + passage rows per window */}
                                {isExpanded && windows.map((group, gi) => {
                                    const windowTotal = windowChargedTotal(group);
                                    const windowLabel = group.windowStart
                                        ? formatWindowHeader(group.windowStart, group.windowEnd!, group.windowIndex ?? gi)
                                        : null;

                                    return (
                                        <Fragment key={group.windowStart ?? `no-window-${gi}`}>
                                            {windowLabel && (
                                                <tr className="has-background-grey-lighter">
                                                    <td colSpan={5} className="is-small pl-2">
                                                        <strong>{windowLabel}</strong>
                                                        {windowTotal > 0 && <span className="tag is-info is-light ml-2">{windowTotal} DKK</span>}
                                                    </td>
                                                </tr>
                                            )}
                                            {group.items.map(({ passage, ann }) => {
                                                const tag = chargeTag(ann, passage.baseFee);
                                                const indent = group.windowStart !== undefined ? "3rem" : "2.5rem";

                                                return (
                                                    <tr key={passage.id} className="has-background-light">
                                                        <td colSpan={2} className="is-small" style={{ paddingLeft: indent, color: "#555", fontSize: "0.9em" }}>
                                                            ↳ {formatDateTime(passage.timestamp)}
                                                        </td>
                                                        <td className="is-small" style={{ fontSize: "0.9em" }}>Base: {ann?.baseFee ?? passage.baseFee} DKK</td>
                                                        <td><span className={tag.className} title={ann?.reason}>{tag.label}</span></td>
                                                        <td>
                                                            <button className="button is-danger is-small is-outlined" onClick={() => onDelete(passage.id)}>
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
