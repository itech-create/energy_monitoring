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
  power: number;
  current: number;
  cost: number;
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
      const items: Device[] = snap.docs.map((d) => {
        const raw = d.data() as Partial<Device> & { id?: string };

        // Remove any 'id' coming from Firestore data to avoid duplicate key overwrite
        const {
          id: _ignore,
          name,
          field,
          status,
          power,
          current,
          cost,
          ...rest
        } = raw;

        return {
          id: d.id,
          name: name ?? "Unnamed Load",
          field: field ?? "",
          status: (status ?? "auto") as Device["status"],
          power: Number(power ?? 0),
          current: Number(current ?? 0),
          cost: Number(cost ?? 0),
          // keep any extra fields out of the strongly typed object
          ...({} as Record<string, never>)
        };
      });

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
  const totalCurrent = devices.reduce((sum, d) => sum + (d.current || 0), 0);
  const totalCost = devices.reduce((sum, d) => sum + (d.cost || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-lg animate-pulse">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-black min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <button
          onClick={() => router.push("/add-load")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded shadow"
        >
          ➕ Add Load
        </button>
      </div>

      {/* Global Limit */}
      <div className="bg-gray-900 p-4 rounded-lg shadow border border-gray-800">
        <h2 className="text-lg font-semibold text-white">
          Global Permissible Power Limit
        </h2>
        <input
          type="number"
          className="mt-2 p-2 rounded bg-gray-800 text-white w-full"
            value={Number.isFinite(globalLimit) ? globalLimit : 0}
          onChange={(e) => setGlobalLimit(Number(e.target.value || 0))}
        />
        <p className="text-sm text-gray-400 mt-2">
          Used for display/reference. (Persisting this can be added later if you like.)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700">
          <h2 className="text-lg text-white">Total Power</h2>
          <p className="text-2xl font-bold text-blue-400">
            {totalPower.toFixed(2)} W
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700">
          <h2 className="text-lg text-white">Total Current</h2>
          <p className="text-2xl font-bold text-green-400">
            {totalCurrent.toFixed(2)} A
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700">
          <h2 className="text-lg text-white">Total Cost</h2>
          <p className="text-2xl font-bold text-yellow-400">
            ₦{totalCost.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Loads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map((device) => {
          const loadFactor =
            globalLimit > 0 ? Math.min(100, Math.round((device.power / globalLimit) * 100)) : 0;

          return (
            <div key={device.id} className="bg-gray-900 p-4 rounded-lg shadow border border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">{device.name}</h2>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    device.status === "on"
                      ? "bg-green-900 text-green-400 border border-green-500"
                      : device.status === "off"
                      ? "bg-red-900 text-red-400 border border-red-500"
                      : "bg-blue-900 text-blue-400 border border-blue-500"
                  }`}
                >
                  {device.status.toUpperCase()}
                </span>
              </div>

              <p className="text-gray-400 mt-1">Field: {device.field}</p>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-sm text-gray-400">Power</p>
                  <p className="text-lg font-semibold text-white">
                    {device.power.toFixed(2)} W
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Current</p>
                  <p className="text-lg font-semibold text-white">
                    {device.current.toFixed(2)} A
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Cost</p>
                  <p className="text-lg font-semibold text-white">
                    ₦{device.cost.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Load Factor</p>
                  <p className="text-lg font-semibold text-white">{loadFactor}%</p>
                </div>
              </div>

              {/* Load Factor Bar */}
              <div className="mt-2">
                <div className="w-full bg-gray-700 h-2 rounded-full">
                  <div
                    className="h-2 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all"
                    style={{ width: `${loadFactor}%` }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleControl(device.id, "auto")}
                  className={`px-4 py-2 rounded ${
                    device.status === "auto"
                      ? "bg-blue-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  } text-white`}
                >
                  Auto
                </button>
                <button
                  onClick={() => handleControl(device.id, "on")}
                  className={`px-4 py-2 rounded ${
                    device.status === "on"
                      ? "bg-green-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  } text-white`}
                >
                  On
                </button>
                <button
                  onClick={() => handleControl(device.id, "off")}
                  className={`px-4 py-2 rounded ${
                    device.status === "off"
                      ? "bg-red-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  } text-white`}
                >
                  Off
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
