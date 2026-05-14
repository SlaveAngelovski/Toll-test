"use client";

import { Fragment, useMemo, useState } from "react";
import { Passage } from "@/types";
import { annotatePassages, PassageAnnotation } from "@/passageBusiness/passagesLogic";

interface Props {
    passages: Passage[];
    loading: boolean;
    onDelete: (id: string) => void;
    onAdd: () => void;
}

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
                        const sorted = [...vPassages].sort(
                            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                        );
                        const last = sorted[sorted.length - 1];
                        const isExpanded = expanded.has(vehicleId);

                        const annotations = annotatePassages(
                            last.vehicleType,
                            sorted.map((p) => ({ id: p.id, timestamp: p.timestamp }))
                        );

                        const dailyTotal = annotations
                            .filter((a) => a.charged)
                            .reduce((sum, a) => sum + a.chargedFee, 0);

                        const annMap = new Map(annotations.map((a) => [a.id, a]));

                        // Group sorted passages into rolling windows for the expanded view.
                        const windowGroups: Array<{
                            windowStart: string | undefined;
                            windowEnd: string | undefined;
                            windowIndex: number | undefined;
                            items: Array<{ passage: Passage; ann: PassageAnnotation | undefined }>;
                        }> = [];
                        const seenWindows = new Map<string | undefined, number>();
                        for (const passage of sorted) {
                            const ann = annMap.get(passage.id);
                            const key = ann?.windowStart;
                            if (!seenWindows.has(key)) {
                                seenWindows.set(key, windowGroups.length);
                                windowGroups.push({ windowStart: ann?.windowStart, windowEnd: ann?.windowEnd, windowIndex: ann?.windowIndex, items: [] });
                            }
                            windowGroups[seenWindows.get(key)!].items.push({ passage, ann });
                        }

                        return (
                            <Fragment key={vehicleId}>
                                <tr>
                                    <td>
                                        <strong>{vehicleId}</strong>
                                    </td>
                                    <td>{last.vehicleType}</td>
                                    <td>{new Date(last.timestamp).toLocaleString()}</td>
                                    <td>
                                        <span
                                            className={`tag ${dailyTotal >= 120
                                                ? "is-danger"
                                                : dailyTotal > 0
                                                    ? "is-warning"
                                                    : "is-light"
                                                }`}
                                        >
                                            {dailyTotal} DKK{dailyTotal >= 120 ? " · cap reached" : ""}
                                        </span>
                                    </td>
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

                                {isExpanded &&
                                    windowGroups.map((group, gi) => (
                                        <Fragment key={group.windowStart ?? `no-window-${gi}`}>
                                            {group.windowStart !== undefined && (
                                                <tr style={{ backgroundColor: "#dbeafe" }}>
                                                    <td
                                                        colSpan={5}
                                                        style={{ paddingLeft: "1.5rem", fontSize: "0.85em", borderTop: "2px solid #bfdbfe" }}
                                                    >
                                                        <strong>Window {(group.windowIndex ?? gi) + 1}</strong>
                                                        {": "}
                                                        {new Date(group.windowStart).toLocaleString([], {
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                        {" – "}
                                                        {new Date(group.windowEnd!).toLocaleTimeString([], {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                        {group.items.some(({ ann }) => ann?.charged) && (
                                                            <span className="tag is-info is-light ml-2">
                                                                {group.items.reduce((s, { ann }) => s + (ann?.chargedFee ?? 0), 0)} DKK
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                            {group.items.map(({ passage, ann }) => (
                                                <tr key={passage.id} style={{ backgroundColor: "#f8f9fa" }}>
                                                    <td
                                                        colSpan={2}
                                                        style={{ paddingLeft: group.windowStart !== undefined ? "3rem" : "2.5rem", color: "#555", fontSize: "0.9em" }}
                                                    >
                                                        ↳ {new Date(passage.timestamp).toLocaleString()}
                                                    </td>
                                                    <td style={{ fontSize: "0.9em" }}>
                                                        Base: {ann?.baseFee ?? passage.baseFee} DKK
                                                    </td>
                                                    <td>
                                                        {ann?.charged ? (
                                                            <span className="tag is-success is-light">
                                                                Charged {ann.chargedFee} DKK
                                                            </span>
                                                        ) : (
                                                            <span className="tag is-light" title={ann?.reason}>
                                                                {ann?.reason ?? "Not charged"}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="button is-danger is-small is-outlined"
                                                            onClick={() => onDelete(passage.id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    ))}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
