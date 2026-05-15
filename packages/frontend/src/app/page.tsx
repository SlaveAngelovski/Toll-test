"use client";

import { useEffect, useState } from "react";
import { createPassage, deletePassage, fetchPassages, fetchVehicleTypes } from "@/lib/api";
import { Passage, VehicleType, VehicleTypeOption } from "@/types";
import { PassagesTable } from "./components/PassagesTable";
import { VehicleTypePicker } from "./components/VehicleTypePicker";
import { AddPassageModal } from "./components/AddPassageModal";
import { ErrorModal } from "./components/ErrorModal";

export default function HomePage() {
  const [passages, setPassages] = useState<Passage[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeOption[]>([]);
  const [loadingPassages, setLoadingPassages] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [preselectedType, setPreselectedType] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const loadPassages = async () => {
    setLoadingPassages(true);
    try {
      const data = await fetchPassages();
      setPassages(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load passages.");
    } finally {
      setLoadingPassages(false);
    }
  };

  useEffect(() => {
    loadPassages();
    fetchVehicleTypes().then(setVehicleTypes);
  }, []);

  const handleAdd = async (vehicleId: string, vehicleType: string, timestamp: string) => {
    try {
      await createPassage({ vehicleId, vehicleType: vehicleType as VehicleType, timestamp });
      setModalOpen(false);
      await loadPassages();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add passage.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePassage(id);
      await loadPassages();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete passage.");
    }
  };

  const openModal = (type?: string) => {
    setPreselectedType(type);
    setModalOpen(true);
  };

  return (
    <main className="section">
      <div className="container">
        <div className="mb-5">
          <h1 className="title">Toll Passage Manager</h1>
          <p className="subtitle">
            Track daily toll fees, stay under the 120 DKK cap, and review which
            passages were actually charged.
          </p>
        </div>

        <VehicleTypePicker vehicleTypes={vehicleTypes} onSelect={openModal} />

        <div className="box">
          <PassagesTable
            passages={passages}
            loading={loadingPassages}
            onDelete={handleDelete}
            onAdd={() => openModal()}
          />
        </div>

        {modalOpen && vehicleTypes.length > 0 && (
          <AddPassageModal
            vehicleTypes={vehicleTypes}
            preselectedType={preselectedType}
            onClose={() => setModalOpen(false)}
            onAdd={handleAdd}
          />
        )}

        {error && (
          <ErrorModal message={error} onClose={() => setError(null)} />
        )}
      </div>
    </main>
  );
}
