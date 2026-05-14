"use client";

import { useState } from "react";
import { VehicleTypeOption } from "@/types";

function nowAsDatetimeLocal(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** Converts a datetime-local string ("YYYY-MM-DDTHH:MM") to an ISO-8601 string
 *  that preserves the browser's local UTC offset, e.g. "2026-05-14T16:49:00+02:00".
 *  This is required so getBaseFee() can extract the correct local wall-clock time. */
function datetimeLocalToISO(value: string): string {
    const date = new Date(value);
    const offsetMin = -date.getTimezoneOffset(); // getTimezoneOffset() returns UTC-local, flip sign
    const sign = offsetMin >= 0 ? "+" : "-";
    const absMin = Math.abs(offsetMin);
    const hh = String(Math.floor(absMin / 60)).padStart(2, "0");
    const mm = String(absMin % 60).padStart(2, "0");
    // Build local wall-clock ISO string without relying on toISOString() (which is UTC)
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 19);
    return `${local}${sign}${hh}:${mm}`;
}

interface Props {
    vehicleTypes: VehicleTypeOption[];
    preselectedType?: string;
    onClose: () => void;
    onAdd: (vehicleId: string, vehicleType: string, timestamp: string) => Promise<void>;
}

export function AddPassageModal({ vehicleTypes, preselectedType, onClose, onAdd }: Props) {
    const [vehicleId, setVehicleId] = useState("");
    const [vehicleType, setVehicleType] = useState(
        preselectedType ?? vehicleTypes[0]?.vehicleType ?? ""
    );
    const [timestamp, setTimestamp] = useState(nowAsDatetimeLocal);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vehicleId.trim()) return;
        setSubmitting(true);
        await onAdd(vehicleId.trim(), vehicleType, datetimeLocalToISO(timestamp));
        setSubmitting(false);
    };

    return (
        <div className="modal is-active">
            <div className="modal-background" onClick={onClose} />
            <div className="modal-card">
                <header className="modal-card-head">
                    <p className="modal-card-title">Add Passage</p>
                    <button className="delete" aria-label="close" onClick={onClose} />
                </header>

                <form onSubmit={handleSubmit}>
                    <section className="modal-card-body">
                        <div className="field">
                            <label className="label">Vehicle ID</label>
                            <div className="control">
                                <input
                                    className="input"
                                    type="text"
                                    placeholder="e.g. ABC-123"
                                    value={vehicleId}
                                    onChange={(e) => setVehicleId(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Vehicle Type</label>
                            <div className="control">
                                <div className="select is-fullwidth">
                                    <select
                                        value={vehicleType}
                                        onChange={(e) => setVehicleType(e.target.value)}
                                    >
                                        {vehicleTypes.map((vt) => (
                                            <option key={vt.vehicleType} value={vt.vehicleType}>
                                                {vt.vehicleType}
                                                {vt.tollFree ? " (toll-free)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Date &amp; Time</label>
                            <div className="control">
                                <input
                                    className="input"
                                    type="datetime-local"
                                    value={timestamp}
                                    onChange={(e) => setTimestamp(e.target.value)}
                                    required
                                />
                            </div>
                            <p className="help">Defaults to now. Change to enter a past passage.</p>
                        </div>
                    </section>

                    <footer className="modal-card-foot" style={{ justifyContent: "flex-end", gap: "0.5rem" }}>
                        <button className="button" type="button" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className={`button is-primary${submitting ? " is-loading" : ""}`}
                            type="submit"
                            disabled={submitting || !vehicleId.trim()}
                        >
                            Add Passage
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
