export interface Passage {
  id: string;
  vehicleId: string;
  vehicleType: VehicleType;
  timestamp: string;
  baseFee: number;
  chargedFee: number;
  dailyTotal: number;
}

export interface VehicleTypeOption {
  vehicleType: VehicleType;
  tollFree: boolean;
}

export interface ApiListResponse<T> {
  data: T;
}

export interface CreatePassagePayload {
  vehicleId: string;
  vehicleType: VehicleType;
  timestamp: string;
}

export type VehicleType =
  | "car"
  | "motorbike"
  | "emergency"
  | "tractor"
  | "diplomat"
  | "military"
  | "foreign"
  | "bus";