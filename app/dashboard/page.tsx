"use client";

import {
  Zap,
  Power,
  Activity,
  TrendingUp,
  Settings,
  LogOut,
  Gauge,
  Pencil,
  PlusCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type Device = {
  name: string;
  power: number;
  voltage: number;
  current: number;
  status: "active" | "standby";
  efficiency: number;
};

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [realtimeData, setRealtimeData] = useState<Device[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedData, setEditedData] = useState<Device | null>(null);
  const [newDevice, setNewDevice] = useState<Device>({
    name: "",
    power: 0,
    voltage: 0,
    current: 0,
    status: "standby",
    efficiency: 0,
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
      } else {
        const dataRef = doc(db, "realtime_data", "latest");

        const unsubscribeSnapshot = onSnapshot(
          dataRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const extractedLoads: Device[] = Array.isArray(data.loads) ? data.loads : [];
              setRealtimeData(extractedLoads);
            }
          },
          (error) => {
            console.error("❌ Firestore snapshot error:", error);
          }
        );

        setLoading(false);
        return () => unsubscribeSnapshot();
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleEditClick = (index: number) => {
    setEditingIndex(index);
    setEditedData(realtimeData[index]);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editedData) return;
    const { name, value } = e.target;
    setEditedData({
      ...editedData,
      [name]: name === "name" || name === "status" ? value : parseFloat(value),
    });
  };

  const saveEdit = async () => {
    if (editingIndex === null || editedData === null) return;
    const updated = [...realtimeData];
    updated[editingIndex] = editedData;
    setRealtimeData(updated);
    await updateDoc(doc(db, "realtime_data", "latest"), {
      loads: updated,
    });
    setEditingIndex(null);
    setEditedData(null);
  };

  const handleAddLoad = async () => {
    const updated = [...realtimeData, newDevice];
    await updateDoc(doc(db, "realtime_data", "latest"), {
      loads: updated,
    });
    setRealtimeData(updated);
    setNewDevice({
      name: "",
      power: 0,
      voltage: 0,
      current: 0,
      status: "standby",
      efficiency: 0,
    });
  };

  const totalConsumption = realtimeData.reduce((sum, item) => sum + item.power, 0).toFixed(2);
  const cost = (parseFloat(totalConsumption) * 0.18).toFixed(2);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl">Checking session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <header className="sticky top-0 bg-gray-900 border-b border-gray-800 shadow z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-800 rounded-lg animate-pulse">
              <Zap className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">PowerPal Dashboard</h1>
              <p className="text-sm text-gray-400">ESP32 Energy Monitor</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="flex items-center px-4 py-2 text-sm font-medium border border-gray-700 rounded hover:bg-gray-800 transition">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-sm font-medium border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-400">Total Consumption</p>
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white">{totalConsumption} kWh</div>
            <p className="text-xs text-gray-500">Based on current data</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-400">Active Power</p>
              <Power className="h-5 w-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white">{totalConsumption} kW</div>
            <p className="text-xs text-gray-500">Real-time usage</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-400">Estimated Cost</p>
              <TrendingUp className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-white">${cost}</div>
            <p className="text-xs text-gray-500">$0.18/kWh</p>
          </div>
        </div>

        {/* Load Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {realtimeData.map((item, index) => {
            const loadFactor = Math.round((item.power / 2.5) * 100);
            const statusColor =
              item.status === "active"
                ? "bg-green-900 text-green-400 border border-green-500"
                : "bg-yellow-900 text-yellow-400 border border-yellow-500";

            return (
              <div
                key={index}
                className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 font-medium text-white">
                    <Gauge className="h-5 w-5 text-blue-400" />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded ${statusColor}`}>
                      {item.status.toUpperCase()}
                    </span>
                    <button
                      onClick={() => handleEditClick(index)}
                      className="text-sm text-blue-400 hover:text-blue-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Power</p>
                    <p className="text-lg font-semibold text-white">{item.power} kW</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Efficiency</p>
                    <p className="text-lg font-semibold text-white">{item.efficiency}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Voltage</p>
                    <p className="text-lg font-semibold text-white">{item.voltage} V</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Current</p>
                    <p className="text-lg font-semibold text-white">{item.current} A</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>Load Factor</span>
                    <span>{loadFactor}%</span>
                  </div>
                  <div className="w-full bg-gray-700 h-2 rounded-full">
                    <div
                      className="h-2 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all"
                      style={{ width: `${loadFactor}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Load */}
        <div className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <PlusCircle className="h-5 w-5" /> Add New Load
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {["name", "power", "voltage", "current", "efficiency"].map((key) => (
              <input
                key={key}
                name={key}
                type={key === "name" ? "text" : "number"}
                placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                className="bg-gray-800 text-white px-3 py-2 rounded"
                value={newDevice[key as keyof Device]}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, [key]: key === "name" ? e.target.value : parseFloat(e.target.value) })
                }
              />
            ))}
            <select
              name="status"
              value={newDevice.status}
              className="bg-gray-800 text-white px-3 py-2 rounded"
              onChange={(e) => setNewDevice({ ...newDevice, status: e.target.value as Device["status"] })}
            >
              <option value="active">Active</option>
              <option value="standby">Standby</option>
            </select>
          </div>
          <button
            onClick={handleAddLoad}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Load
          </button>
        </div>

        {/* Edit Modal */}
        {editingIndex !== null && editedData && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded-xl shadow border border-gray-700 w-full max-w-md space-y-4">
              <h2 className="text-xl font-bold">Edit Load</h2>
              {["name", "power", "voltage", "current", "efficiency"].map((key) => (
                <input
                  key={key}
                  name={key}
                  type={key === "name" ? "text" : "number"}
                  value={editedData[key as keyof Device]}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                  onChange={handleEditChange}
                />
              ))}
              <select
                name="status"
                value={editedData.status}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                onChange={handleEditChange}
              >
                <option value="active">Active</option>
                <option value="standby">Standby</option>
              </select>
              <div className="flex justify-end gap-3">
                <button
                  className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
                  onClick={() => setEditingIndex(null)}
                >
                  Cancel
                </button>
                <button
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  onClick={saveEdit}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
