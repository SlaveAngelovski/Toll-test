"use client";

import { Fragment, useState } from "react";
import { Passage } from "@/types";
import { PassageAnnotation } from "@/passageBusiness/passagesLogic";
import { formatDateTime, formatTime } from "../utils/dateUtils";
import { useAnnotatedPassages, WindowGroup } from "../hooks/useAnnotatedPassages";

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

export function PassagesTable({ passages, loading, onDelete, onAdd }: Props) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const vehicleData = useAnnotatedPassages(passages);

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
                    {Array.from(vehicleData.entries()).map(([vehicleId, { sorted, last, dayTotals, windows }]) => {
                        const isExpanded = expanded.has(vehicleId);

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
