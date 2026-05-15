import {
  PassageCharge,
  TollPassage,
  TOLL_FREE_VEHICLE_TYPES,
  VehicleType,
} from "../types";
import {
  getLocalDateKey,
  getMinutesSinceMidnight,
  isHoliday,
  isWeekend,
} from "../utils/datetime";

const DAILY_CAP = 120;
const HOURLY_WINDOW_MS = 60 * 60 * 1000;

interface FeeInterval {
  startMinute: number;
  endMinute: number;
  fee: number;
}

const FEE_SCHEDULE: FeeInterval[] = [
  { startMinute: 6 * 60, endMinute: 6 * 60 + 29, fee: 10 },
  { startMinute: 6 * 60 + 30, endMinute: 6 * 60 + 59, fee: 16 },
  { startMinute: 7 * 60, endMinute: 7 * 60 + 59, fee: 25 },
  { startMinute: 8 * 60, endMinute: 8 * 60 + 29, fee: 16 },
  { startMinute: 8 * 60 + 30, endMinute: 14 * 60 + 59, fee: 10 },
  { startMinute: 15 * 60, endMinute: 15 * 60 + 29, fee: 16 },
  { startMinute: 15 * 60 + 30, endMinute: 16 * 60 + 59, fee: 25 },
  { startMinute: 17 * 60, endMinute: 17 * 60 + 59, fee: 16 },
  { startMinute: 18 * 60, endMinute: 18 * 60 + 29, fee: 10 },
];

interface PassageWithMeta {
  passage: TollPassage;
  baseFee: number;
  date: Date;
}

export function isTollFreeVehicle(vehicleType: VehicleType): boolean {
  return TOLL_FREE_VEHICLE_TYPES.includes(vehicleType);
}

export function getBaseFee(date: Date, vehicleType: VehicleType): number {
  if (isTollFreeVehicle(vehicleType) || isWeekend(date) || isHoliday(date)) {
    return 0;
  }

  const minutes = getMinutesSinceMidnight(date);
  const feeTimeInterval = FEE_SCHEDULE.find(
    ({ startMinute, endMinute }) =>
      minutes >= startMinute && minutes <= endMinute
  );

  return feeTimeInterval?.fee ?? 0;
}

export function calculateCharges(
  passages: TollPassage[]
): Map<string, PassageCharge> {
  const results = new Map<string, PassageCharge>();

  const grouped = passages.reduce((acc, passage) => {
    const date = new Date(passage.timestamp);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid timestamp for passage ${passage.id}`);
    }

    const key = `${passage.vehicleId}__${getLocalDateKey(date)}`;
    const baseFee = getBaseFee(date, passage.vehicleType);
    const meta: PassageWithMeta = { passage, baseFee, date };

    if (!acc.has(key)) {
      acc.set(key, []);
    }

    acc.get(key)!.push(meta);
    return acc;
  }, new Map<string, PassageWithMeta[]>());

  for (const [, value] of grouped) {
    value.sort((a, b) => a.date.getTime() - b.date.getTime());

    let dailyRunningTotal = 0;
    let activeWindow: { startTime: number; entries: PassageWithMeta[] } | null =
      null;

    const finalizeTimeWindow = () => {
      if (!activeWindow || activeWindow.entries.length === 0) {
        activeWindow = null;
        return;
      }

      const targetWindow = activeWindow.entries.reduce((max, current) => {
        if (!max) {
          return current;
        }

        if (current.baseFee > max.baseFee) {
          return current;
        }

        if (current.baseFee === max.baseFee) {
          return current.date.getTime() < max.date.getTime() ? current : max;
        }

        return max;
      });

      const baseFee = targetWindow.baseFee;
      let chargedFee = baseFee;

      if (dailyRunningTotal >= DAILY_CAP) {
        chargedFee = 0;
      } else if (dailyRunningTotal + chargedFee > DAILY_CAP) {
        chargedFee = DAILY_CAP - dailyRunningTotal;
      }

      dailyRunningTotal += chargedFee;

      activeWindow.entries.forEach((windowEntry: PassageWithMeta) => {
        const shouldCharge = windowEntry.passage.id === targetWindow.passage.id;
        results.set(windowEntry.passage.id, {
          passageId: windowEntry.passage.id,
          baseFee: windowEntry.baseFee,
          chargedFee: shouldCharge ? chargedFee : 0,
          dailyTotal: dailyRunningTotal,
        });
      });

      activeWindow = null;
    };

    value.forEach((entry: PassageWithMeta) => {
      if (entry.baseFee === 0) {
        results.set(entry.passage.id, {
          passageId: entry.passage.id,
          baseFee: 0,
          chargedFee: 0,
          dailyTotal: dailyRunningTotal,
        });
        return;
      }

      const timestamp = entry.date.getTime();

      if (!activeWindow) {
        activeWindow = { startTime: timestamp, entries: [entry] };
        return;
      }

      if (timestamp - activeWindow.startTime < HOURLY_WINDOW_MS) {
        activeWindow.entries.push(entry);
        return;
      }

      finalizeTimeWindow();
      activeWindow = { startTime: timestamp, entries: [entry] };
    });

    finalizeTimeWindow();
  }

  return results;
}
