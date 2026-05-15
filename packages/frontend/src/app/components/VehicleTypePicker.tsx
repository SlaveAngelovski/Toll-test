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
        <div className="box">
            <h2 className="subtitle is-5">Quick Add — click a vehicle to log a passage</h2>
            <div className="columns is-gap-2 m-1">
                {vehicleTypes.map((vt) => (
                    <button
                        key={vt.vehicleType}
                        className="column is-flex is-flex-direction-column button is-align-items-center is-justify-content-center is-cursor-pointer"
                        onClick={() => onSelect(vt.vehicleType)}
                        title={`Add ${vt.vehicleType} passage`}
                    >
                        {<div className="image is-64x64">
                            {React.createElement(VEHICLE_ICONS[vt.vehicleType])}
                        </div>}
                        <div className="mt-2 is-capitalized">
                            {vt.vehicleType}
                        </div>
                        {vt.tollFree && (
                            <div className="tag is-info is-light is-small mt-1">toll-free</div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
