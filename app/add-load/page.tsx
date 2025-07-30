"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";


export default function AddLoadPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [power, setPower] = useState("");
  const [voltage, setVoltage] = useState("");
  const [current, setCurrent] = useState("");
  const [efficiency, setEfficiency] = useState("");
  const [status, setStatus] = useState<"active" | "standby">("active");

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();

//     const newLoad = {
//       name,
//       power: parseFloat(power),
//       voltage: parseFloat(voltage),
//       current: parseFloat(current),
//       efficiency: parseInt(efficiency),
//       status,
//     };

//     // Optional: Save to Firebase here

//     console.log("New load added:", newLoad);

//     // Redirect back to dashboard or show a success message
//     router.push("/dashboard");
//   };


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const newLoad = {
    name,
    power: parseFloat(power),
    voltage: parseFloat(voltage),
    current: parseFloat(current),
    efficiency: parseInt(efficiency),
    status,
    timestamp: new Date(), // Optional: add timestamp
  };

  try {
    // Save to Firebase
    await addDoc(collection(db, "loads"), newLoad); // 👈 Create a "loads" collection

    console.log("Load added to Firestore:", newLoad);

    router.push("/dashboard"); // Redirect to dashboard
  } catch (error) {
    console.error("Error adding load to Firestore:", error);
    alert("Failed to add load. Try again.");
  }
};


  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold flex items-center space-x-2">
          <PlusCircle className="h-7 w-7 text-blue-400" />
          <span>Add New Load</span>
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 p-6 rounded-xl border border-gray-800 shadow">
          <Input label="Device Name" value={name} onChange={setName} />
          <Input label="Power (kW)" value={power} onChange={setPower} />
          <Input label="Voltage (V)" value={voltage} onChange={setVoltage} />
          <Input label="Current (A)" value={current} onChange={setCurrent} />
          <Input label="Efficiency (%)" value={efficiency} onChange={setEfficiency} />

          <div>
            <label className="block text-sm text-gray-400 mb-1">Status</label>
            <select
              className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700"
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "standby")}
            >
              <option value="active">Active</option>
              <option value="standby">Standby</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 transition rounded text-white font-semibold"
          >
            Add Load
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  );
}
