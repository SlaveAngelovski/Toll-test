import cors from "cors";
import express from "express";
import { passagesRouter } from "./routes/passages";
import { TOLL_FREE_VEHICLE_TYPES, VEHICLE_TYPES } from "./types";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/meta/vehicle-types", (_req, res) => {
  res.json({
    data: VEHICLE_TYPES.map((type) => ({
      vehicleType: type,
      tollFree: TOLL_FREE_VEHICLE_TYPES.includes(type)
    }))
  });
});

app.use("/api/passages", passagesRouter);
