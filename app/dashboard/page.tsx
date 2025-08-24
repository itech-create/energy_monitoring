"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

type Device = {
  id: string;
  name: string;
  field: string;
  status: "auto" | "on" | "off";
  power?: number;
  current?: number;
  cost?: number;
};

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [globalLimit, setGlobalLimit] = useState<number>(1000);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace("/login");
      return;
    }

    const colRef = collection(db, `users/${user.uid}/loads`);
    const unsubFS = onSnapshot(colRef, (snap) => {
      const items = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Device) } as Device)
      );
      setDevices(items);
      setLoading(false);
    });

    return () => unsubFS();
  }, [router]);

  const handleControl = async (id: string, status: "auto" | "on" | "off") => {
    const user = auth.currentUser;
    if (!user) return;
    await updateDoc(doc(db, `users/${user.uid}/loads/${id}`), { status });
  };

  const totalPower = devices.reduce((sum, d) => sum + (d.power || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* Global Limit */}
      <div className="bg-gray-900 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-white">
          Global Permissible Power Limit
        </h2>
        <input
          type="number"
          className="mt-2 p-2 rounded bg-gray-800 text-white w-full"
          value={globalLimit}
          onChange={(e) => setGlobalLimit(Number(e.target.value))}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg text-white">Total Power</h2>
          <p className="text-2xl font-bold text-blue-400">
            {totalPower.toFixed(2)} W
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg text-white">Total Current</h2>
          <p className="text-2xl font-bold text-green-400">
            {devices.reduce((sum, d) => sum + (d.current || 0), 0).toFixed(2)} A
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg text-white">Total Cost</h2>
          <p className="text-2xl font-bold text-yellow-400">
            ₦
            {devices.reduce((sum, d) => sum + (d.cost || 0), 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Loads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map((device) => (
          <div key={device.id} className="bg-gray-900 p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold text-white">{device.name}</h2>
            <p className="text-gray-400">Field: {device.field}</p>
            <p className="text-gray-400">
              Power: {device.power?.toFixed(2) || 0} W
            </p>
            <p className="text-gray-400">
              Current: {device.current?.toFixed(2) || 0} A
            </p>
            <p className="text-gray-400">Cost: ₦{device.cost?.toFixed(2) || 0}</p>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleControl(device.id, "auto")}
                className={`px-4 py-2 rounded ${
                  device.status === "auto"
                    ? "bg-blue-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => handleControl(device.id, "on")}
                className={`px-4 py-2 rounded ${
                  device.status === "on"
                    ? "bg-green-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                On
              </button>
              <button
                onClick={() => handleControl(device.id, "off")}
                className={`px-4 py-2 rounded ${
                  device.status === "off"
                    ? "bg-red-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                Off
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
