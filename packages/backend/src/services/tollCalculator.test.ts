import { describe, expect, it } from "vitest";
import { calculateCharges } from "./tollCalculator";
import { TollPassage } from "../types";

describe("calculateCharges", () => {
  it("returns zero for toll-free vehicle type", () => {
    const passages: TollPassage[] = [
      {
        id: "p1",
        vehicleId: "veh-1",
        vehicleType: "bus",
        timestamp: "2025-02-10T07:15:00+01:00"
      }
    ];

    const charges = calculateCharges(passages);
    const charge = charges.get("p1");

    expect(charge).toBeDefined();
    expect(charge?.chargedFee).toBe(0);
  });

  it("charges only the highest fee within an hour for the same vehicle", () => {
    const passages: TollPassage[] = [
      {
        id: "p1",
        vehicleId: "veh-1",
        vehicleType: "car",
        timestamp: "2025-02-10T07:05:00+01:00"
      },
      {
        id: "p2",
        vehicleId: "veh-1",
        vehicleType: "car",
        timestamp: "2025-02-10T07:45:00+01:00"
      },
      {
        id: "p3",
        vehicleId: "veh-1",
        vehicleType: "car",
        timestamp: "2025-02-10T08:10:00+01:00"
      }
    ];

    const charges = calculateCharges(passages);

    expect(charges.get("p1")?.chargedFee).toBe(25);
    expect(charges.get("p2")?.chargedFee).toBe(0);
    expect(charges.get("p3")?.chargedFee).toBe(16);
  });

  it("caps the daily total at 120 DKK", () => {
    const passages: TollPassage[] = [
      {
        id: "p1",
        vehicleId: "veh-1",
        vehicleType: "car",
        timestamp: "2025-02-10T06:00:00+01:00"
      },
      {
        id: "p2",
        vehicleId: "veh-1",
        vehicleType: "car",
        timestamp: "2025-02-10T07:05:00+01:00"
      },
      {
        id: "p3",
        vehicleId: "veh-1",
        vehicleType: "car",
        timestamp: "2025-02-10T08:10:00+01:00"
      },
      {
        id: "p4",
        vehicleId: "veh-1",
        vehicleType: "car",
        timestamp: "2025-02-10T09:15:00+01:00"
      },
      {
        id: "p5",
        vehicleId: "veh-1",
        vehicleType: "car",
        timestamp: "2025-02-10T15:30:00+01:00"
      },
      {
        id: "p6",
        vehicleId: "veh-1",
        vehicleType: "car",
        timestamp: "2025-02-10T16:35:00+01:00"
      },
      {
        id: "p7",
        vehicleId: "veh-1",
        vehicleType: "car",
        timestamp: "2025-02-10T17:40:00+01:00"
      }
    ];

    const charges = calculateCharges(passages);

    const total = Array.from(charges.values()).reduce(
      (sum, { chargedFee }) => sum + chargedFee,
      0
    );

    expect(total).toBe(120);
    expect(charges.get("p7")?.chargedFee).toBe(9);
  });

  it("skips tolls on weekends", () => {
    const passages: TollPassage[] = [
      {
        id: "p1",
        vehicleId: "veh-1",
        vehicleType: "car",
        timestamp: "2025-02-15T09:00:00+01:00" // Saturday
      }
    ];

    const charges = calculateCharges(passages);
    expect(charges.get("p1")?.chargedFee).toBe(0);
  });
});
