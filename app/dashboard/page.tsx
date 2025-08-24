"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { onSnapshot, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type Device = { id: string; name: string; field: number };
type ThingSpeakData = {
  field1: number;
  field2: number;
  field3: number;
  field4: number;
  field5: number;
  field6: number;
  field7: number;
  field8: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [ts, setTS] = useState<ThingSpeakData>({
    field1: 0,
    field2: 0,
    field3: 0,
    field4: 1000,
    field5: 0,
    field6: 0,
    field7: 0,
    field8: 0,
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
      } else {
        const colRef = collection(db, `users/${user.uid}/loads`);
        const unsubFS = onSnapshot(
          colRef,
          (snap) => {
            const items = snap.docs.map((d) => {
              const data = d.data() as Omit<Device, "id">; // ✅ prevents duplicate id
              return { id: d.id, ...data };
            }) as Device[];
            setDevices(items);
            setLoading(false);
          },
          (err) => {
            console.error("Firestore loads error:", err);
            setLoading(false);
          }
        );

        return () => unsubFS();
      }
    });
    return () => unsubAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <header className="sticky top-0 bg-gray-900 border-b border-gray-800 shadow z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-800 rounded-lg animate-pulse" />
            <div>
              <h1 className="text-2xl font-bold">PowerPal Dashboard</h1>
              <p className="text-sm text-gray-400">ESP32 Energy Monitor</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/add-load")}
            className="flex items-center px-4 py-2 text-sm font-medium bg-gray-700 rounded-md hover:bg-gray-600 transition"
          >
            Manage Loads →
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-2">
            <p className="text-sm font-medium text-gray-400">Voltage</p>
            <div className="text-3xl font-bold text-white">
              {ts.field2.toFixed(2)} V
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {devices.map((item) => (
            <div
              key={item.id}
              className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-4"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-white">{item.name}</span>
                <span className="text-xs text-gray-400">Field {item.field}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
