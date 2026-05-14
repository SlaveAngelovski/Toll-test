"use client";

import { VehicleTypeOption } from "@/types";

const VEHICLE_ICONS: Record<string, string> = {
    car: "🚗",
    motorbike: "🏍️",
    emergency: "🚑",
    tractor: "🚜",
    diplomat: "🎩",
    military: "🪖",
    foreign: "🌍",
    bus: "🚌",
};

interface Props {
    vehicleTypes: VehicleTypeOption[];
    onSelect: (vehicleType: string) => void;
}

export function VehicleTypePicker({ vehicleTypes, onSelect }: Props) {
    return (
        <div className="box mb-5">
            <h2 className="subtitle is-5 mb-3">Quick Add — click a vehicle to log a passage</h2>
            <div className="is-flex is-flex-wrap-wrap" style={{ gap: "0.75rem" }}>
                {vehicleTypes.map((vt) => (
                    <button
                        key={vt.vehicleType}
                        className="button is-white"
                        style={{
                            flexDirection: "column",
                            height: "auto",
                            padding: "0.75rem 1.25rem",
                            border: "1px solid #dbdbdb",
                            borderRadius: "10px",
                            minWidth: "90px",
                            cursor: "pointer",
                        }}
                        onClick={() => onSelect(vt.vehicleType)}
                        title={`Add ${vt.vehicleType} passage`}
                    >
                        <span style={{ fontSize: "2rem", lineHeight: 1 }}>
                            {VEHICLE_ICONS[vt.vehicleType] ?? "🚘"}
                        </span>
                        <span className="is-size-7 mt-2" style={{ textTransform: "capitalize" }}>
                            {vt.vehicleType}
                        </span>
                        {vt.tollFree && (
                            <span className="tag is-info is-light is-small mt-1">toll-free</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
