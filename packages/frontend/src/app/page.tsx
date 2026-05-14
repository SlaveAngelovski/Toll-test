"use client";

import { useEffect, useState } from "react";
import { createPassage, deletePassage, fetchPassages, fetchVehicleTypes } from "@/lib/api";
import { Passage, VehicleTypeOption } from "@/types";
import { PassagesTable } from "./components/PassagesTable";
import { VehicleTypePicker } from "./components/VehicleTypePicker";
import { AddPassageModal } from "./components/AddPassageModal";

export default function HomePage() {
  const [passages, setPassages] = useState<Passage[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeOption[]>([]);
  const [loadingPassages, setLoadingPassages] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [preselectedType, setPreselectedType] = useState<string | undefined>();

  const loadPassages = async () => {
    setLoadingPassages(true);
    const data = await fetchPassages();
    setPassages(data);
    setLoadingPassages(false);
  };

  useEffect(() => {
    loadPassages();
    fetchVehicleTypes().then(setVehicleTypes);
  }, []);

  const handleAdd = async (vehicleId: string, vehicleType: string, timestamp: string) => {
    await createPassage({ vehicleId, vehicleType, timestamp });
    setModalOpen(false);
    await loadPassages();
  };

  const handleDelete = async (id: string) => {
    await deletePassage(id);
    await loadPassages();
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
      </div>
    </main>
  );
}
