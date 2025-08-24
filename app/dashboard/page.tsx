"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Device = {
  id: string;
  name: string;
  field: string;
  power: number;
  status: "auto" | "on" | "off";
};

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [totalPower, setTotalPower] = useState(0);
  const [voltage, setVoltage] = useState(230);
  const [limit, setLimit] = useState(1000);
  const [newLimit, setNewLimit] = useState(1000);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const colRef = collection(db, `users/${user.uid}/loads`);
    const unsub = onSnapshot(colRef, (snap) => {
      const items = snap.docs.map((d) => d.data() as Device);
      setDevices(items);

      const sum = items.reduce((acc, d) => acc + (d.power || 0), 0);
      setTotalPower(sum);
    });

    return () => unsub();
  }, []);

  const handleControl = async (id: string, newStatus: "auto" | "on" | "off") => {
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, `users/${user.uid}/loads/${id}`);
    await updateDoc(ref, { status: newStatus });
  };

  const updateLimit = () => {
    setLimit(newLimit);
    // push to Firestore if ESP32 listens for global limit
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">PowerPal Dashboard</h1>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg">Total Power</h2>
            <p className="text-2xl font-bold">{totalPower.toFixed(2)} W</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg">Average Voltage</h2>
            <p className="text-2xl font-bold">{voltage.toFixed(2)} V</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg">Estimated Cost (per hour)</h2>
            <p className="text-2xl font-bold">
              ${(totalPower * 0.18 / 1000).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Global Permissible Limit */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold">Global Permissible Power Limit</h2>
          <div className="flex items-center gap-3 mt-2">
            <span>Current Limit: {limit} W</span>
            <input
              type="number"
              className="px-3 py-1 rounded bg-gray-700 text-white w-24"
              value={newLimit}
              onChange={(e) => setNewLimit(Number(e.target.value))}
            />
            <Button onClick={updateLimit}>Update Limit</Button>
          </div>
        </CardContent>
      </Card>

      {/* Load Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {devices.map((device) => (
          <Card key={device.id}>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold">{device.name}</h2>
              <p className="text-sm text-gray-400">
                Power: {device.power ?? 0} W
              </p>

              <div className="flex gap-2 mt-3">
                <Button
                  variant={device.status === "auto" ? "default" : "outline"}
                  onClick={() => handleControl(device.id, "auto")}
                >
                  Auto
                </Button>
                <Button
                  variant={device.status === "on" ? "default" : "outline"}
                  onClick={() => handleControl(device.id, "on")}
                >
                  On
                </Button>
                <Button
                  variant={device.status === "off" ? "default" : "outline"}
                  onClick={() => handleControl(device.id, "off")}
                >
                  Off
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
