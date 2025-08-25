"use client";

import { useEffect, useState } from "react";

type ThingSpeakData = {
  voltage: number;
  curr1: number;
  curr2: number;
  curr3: number;
  power1: number;
  power2: number;
  power3: number;
  permissibleLimit: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<ThingSpeakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [globalLimit, setGlobalLimit] = useState<number>(1000);

  const READ_KEY = "B5106LV3GVBOXRSO";   // ✅ ThingSpeak Read Key
  const WRITE_KEY = "OV54HOWGUQ71NXMP";  // ✅ ThingSpeak Write Key
  const CHANNEL_ID = "3021539";

  // 🔹 Fetch latest values from ThingSpeak
  async function fetchData() {
    try {
      const res = await fetch(
        `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_KEY}&results=1`
      );
      const json = await res.json();
      const feed = json.feeds[0];

      const parsed: ThingSpeakData = {
        curr1: Number(feed.field1 || 0),
        voltage: Number(feed.field2 || 0),
        power1: Number(feed.field3 || 0),
        permissibleLimit: Number(feed.field4 || 0),
        curr2: Number(feed.field5 || 0),
        power2: Number(feed.field6 || 0),
        curr3: Number(feed.field7 || 0),
        power3: Number(feed.field8 || 0),
      };

      setData(parsed);
      setGlobalLimit(parsed.permissibleLimit || 1000);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching ThingSpeak data:", err);
    }
  }

  // 🔹 Update permissible limit (field4)
  async function updateLimit() {
    setUpdating(true);
    try {
      await fetch(
        `https://api.thingspeak.com/update?api_key=${WRITE_KEY}&field4=${globalLimit}`
      );
      console.log("Permissible limit updated:", globalLimit);
    } catch (err) {
      console.error("Error updating limit:", err);
    }
    setUpdating(false);
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000); // refresh every 20s
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-lg animate-pulse">Loading ThingSpeak data…</div>
      </div>
    );
  }

  // 🔹 Derived totals
  const totalPower = data.power1 + data.power2 + data.power3;
  const totalCurrent = data.curr1 + data.curr2 + data.curr3;

  return (
    <div className="p-6 space-y-6 bg-black min-h-screen">
      <h1 className="text-2xl font-bold text-white">Energy Monitoring Dashboard</h1>

      {/* Global Limit Control */}
      <div className="bg-gray-900 p-4 rounded-lg shadow border border-gray-800">
        <h2 className="text-lg font-semibold text-white">
          Global Permissible Power Limit
        </h2>
        <div className="flex gap-2 mt-2">
          <input
            type="number"
            className="p-2 rounded bg-gray-800 text-white w-full"
            value={globalLimit}
            onChange={(e) => setGlobalLimit(Number(e.target.value || 0))}
          />
          <button
            onClick={updateLimit}
            disabled={updating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded shadow"
          >
            {updating ? "Updating…" : "Update"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700">
          <h2 className="text-lg text-white">Mains Voltage</h2>
          <p className="text-2xl font-bold text-purple-400">
            {data.voltage.toFixed(1)} V
          </p>
        </div>
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
          <h2 className="text-lg text-white">Permissible Limit</h2>
          <p className="text-2xl font-bold text-yellow-400">
            {globalLimit} W
          </p>
        </div>
      </div>

      {/* Individual Loads */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 p-4 rounded-lg shadow border border-gray-800">
          <h2 className="text-lg font-bold text-white">Load 1</h2>
          <p className="text-gray-400">Current: {data.curr1.toFixed(2)} A</p>
          <p className="text-gray-400">Power: {data.power1.toFixed(2)} W</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow border border-gray-800">
          <h2 className="text-lg font-bold text-white">Load 2</h2>
          <p className="text-gray-400">Current: {data.curr2.toFixed(2)} A</p>
          <p className="text-gray-400">Power: {data.power2.toFixed(2)} W</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow border border-gray-800">
          <h2 className="text-lg font-bold text-white">Load 3</h2>
          <p className="text-gray-400">Current: {data.curr3.toFixed(2)} A</p>
          <p className="text-gray-400">Power: {data.power3.toFixed(2)} W</p>
        </div>
      </div>
    </div>
  );
}
