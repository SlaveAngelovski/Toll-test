import { randomUUID } from "crypto";
import { TollPassage, VehicleType } from "../types";

export interface CreatePassageInput {
  vehicleId: string;
  vehicleType: VehicleType;
  timestamp: string;
}

const passages: TollPassage[] = [];

export function addPassage(input: CreatePassageInput): TollPassage {
  const passage: TollPassage = {
    id: randomUUID(),
    ...input
  };

  passages.push(passage);
  return passage;
}

export function listPassages(): TollPassage[] {
  return [...passages].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export function removePassage(id: string): boolean {
  const index = passages.findIndex((passage) => passage.id === id);
  if (index === -1) {
    return false;
  }

  passages.splice(index, 1);
  return true;
}

export function clearPassages(): void {
  passages.splice(0, passages.length);
}

export function listPassagesByVehicleAndDate(
  vehicleId: string,
  dateKey: string
): TollPassage[] {
  return passages.filter(
    (passage) =>
      passage.vehicleId === vehicleId &&
      getDateKey(new Date(passage.timestamp)) === dateKey
  );
}

function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}
