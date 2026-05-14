"use client";

import { VehicleTypeOption } from "@/types";
import CarIcon from "./Icons/CarIcon";
import MotorbikeIcon from "./Icons/MotorbikeIcon";
import EmergencyIcon from "./Icons/EmergencyIcon";
import TractorIcon from "./Icons/TractorIcon";
import DiplomatIcon from "./Icons/DiplomatIcon";
import MilitaryIcon from "./Icons/MilitaryIcon";
import ForeignIcon from "./Icons/ForeignIcon";
import BusIcon from "./Icons/BusIcon";
import React from "react";

const VEHICLE_ICONS: Record<string, any> = {
    car: CarIcon,
    motorbike: MotorbikeIcon,
    emergency: EmergencyIcon,
    tractor: TractorIcon,
    diplomat: DiplomatIcon,
    military: MilitaryIcon,
    foreign: ForeignIcon,
    bus: BusIcon,
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
                        {React.createElement(VEHICLE_ICONS[vt.vehicleType])}
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
