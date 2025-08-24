"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Zap, Gauge, Settings, ChevronRight } from "lucide-react";

type Device = {
  id: string;
  name: string;
  voltage?: number;
  current?: number;
  state?: boolean;
};

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
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
        (d) =>
          ({
            id: d.id,
            ...(d.data() as Omit<Device, "id">),
          } as Device)
      );
      setDevices(items);
    });

    return () => unsubFS();
  }, [router]);

  // Toggle relay state
  const toggleRelay = async (id: string) => {
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, `users/${user.uid}/loads/${id}`);
    const device = devices.find((d) => d.id === id);
    if (!device) return;

    await updateDoc(ref, { state: !device.state });
  };

  // Aggregate stats
  const totalPower = devices.reduce(
    (sum, d) => sum + (d.voltage ?? 0) * (d.current ?? 0),
    0
  );
  const avgVoltage =
    devices.length > 0
      ? devices.reduce((sum, d) => sum + (d.voltage ?? 0), 0) / devices.length
      : 0;
  const totalCost = devices.reduce((sum, d) => {
    const power = (d.voltage ?? 0) * (d.current ?? 0);
    return sum + (power / 1000) * 0.18; // $0.18/kWh
  }, 0);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* 📊 Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow space-y-2">
          <p className="text-sm text-gray-400">Total Power</p>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-400" />
            <span className="text-xl font-bold text-white">
              {totalPower.toFixed(2)} W
            </span>
          </div>
        </div>

        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow space-y-2">
          <p className="text-sm text-gray-400">Average Voltage</p>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-purple-400" />
            <span className="text-xl font-bold text-white">
              {avgVoltage.toFixed(2)} V
            </span>
          </div>
        </div>

        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow space-y-2">
          <p className="text-sm text-gray-400">Est. Total Cost (per hour)</p>
          <div className="flex items-center gap-2">
            <ChevronRight className="h-5 w-5 text-yellow-400" />
            <span className="text-xl font-bold text-white">
              ${totalCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 📦 Load Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {devices.map((device) => {
          const voltage = device.voltage ?? 0;
          const current = device.current ?? 0;
          const power = voltage * current;
          const cost = (power / 1000) * 0.18;

          return (
            <div
              key={device.id}
              className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {device.name}
                </h3>
                <Settings className="h-5 w-5 text-gray-400" />
              </div>

              {/* Power */}
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-400">Power</p>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" />
                  <span className="text-xl font-bold text-white">
                    {power.toFixed(2)} W
                  </span>
                </div>
              </div>

              {/* Voltage */}
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-400">Voltage</p>
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-purple-400" />
                  <span className="text-lg font-semibold text-white">
                    {voltage.toFixed(2)} V
                  </span>
                </div>
              </div>

              {/* Cost */}
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-400">Est. Cost (per hour)</p>
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-yellow-400" />
                  <span className="text-lg font-semibold text-white">
                    ${cost.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Manual Relay Toggle */}
              <div className="mt-4">
                <button
                  onClick={() => toggleRelay(device.id)}
                  className={`w-full py-2 px-4 rounded-lg font-medium ${
                    device.state
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                >
                  {device.state ? "Turn OFF" : "Turn ON"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
