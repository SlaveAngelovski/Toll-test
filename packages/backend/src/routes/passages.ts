import { Router } from "express";
import { z } from "zod";
import {
  addPassage,
  listPassages,
  removePassage
} from "../data/passagesStore";
import {
  calculateCharges,
  getBaseFee
} from "../services/tollCalculator";
import {
  PassageResponse,
  VEHICLE_TYPES,
  VehicleType
} from "../types";

const createPassageSchema = z.object({
  vehicleId: z.string().min(1, "vehicleId is required"),
  vehicleType: z.enum(VEHICLE_TYPES as [VehicleType, ...VehicleType[]]),
  timestamp: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "timestamp must be an ISO-8601 date string"
    })
});

export const passagesRouter = Router();

passagesRouter.get("/getPassages", (_req, res) => {
  const passages = listPassages();
  const charges = calculateCharges(passages);

  const response: PassageResponse[] = passages.map((passage) => {
    const charge = charges.get(passage.id);
    const date = new Date(passage.timestamp);

    return {
      ...passage,
      baseFee: charge?.baseFee ?? getBaseFee(date, passage.vehicleType),
      chargedFee: charge?.chargedFee ?? 0,
      dailyTotal: charge?.dailyTotal ?? 0
    };
  });

  res.json({ data: response });
});

passagesRouter.post("/postPassages", (req, res) => {
  const parseResult = createPassageSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const passage = addPassage(parseResult.data);
  const charges = calculateCharges(listPassages());
  const charge = charges.get(passage.id);
  const date = new Date(passage.timestamp);

  const response: PassageResponse = {
    ...passage,
    baseFee: charge?.baseFee ?? getBaseFee(date, passage.vehicleType),
    chargedFee: charge?.chargedFee ?? 0,
    dailyTotal: charge?.dailyTotal ?? 0
  };

  res.status(201).json({ data: response });
});

passagesRouter.delete("/deletePassages/:id", (req, res) => {
  const { id } = req.params;
  const wasRemoved = removePassage(id);

  if (!wasRemoved) {
    return res.status(404).json({ error: "Passage not found" });
  }

  res.status(204).send();
});
