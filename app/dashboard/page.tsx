"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { onSnapshot, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Zap, Power, Activity, TrendingUp, Settings, Gauge, ChevronRight } from "lucide-react";

const THINGSPEAK_CHANNEL_ID = process.env.NEXT_PUBLIC_THINGSPEAK_CHANNEL_ID as string;
const THINGSPEAK_READ_API_KEY = process.env.NEXT_PUBLIC_THINGSPEAK_READ_API_KEY as string;
const THINGSPEAK_WRITE_API_KEY = process.env.NEXT_PUBLIC_THINGSPEAK_WRITE_API_KEY as string;

// Local ESP32 API
const ESP32_BASE_URL = process.env.NEXT_PUBLIC_ESP32_BASE_URL || "http://10.97.54.34";

// Types
type Device = { id: string; name: string; field: number; };
type ThingSpeakData = { field1:number; field2:number; field3:number; field4:number; field5:number; field6:number; field7:number; field8:number; };
type DisplayDevice = Device & { power:number; voltage:number; current:number; status:"active"|"standby" };

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [ts, setTS] = useState<ThingSpeakData>({field1:0,field2:0,field3:0,field4:1000,field5:0,field6:0,field7:0,field8:0});
  const [newLimitInput, setNewLimitInput] = useState("1000");

  // Map field -> relay channel (your mapping: field1/3=>ch1, field5/6=>ch2, field7/8=>ch3)
  const fieldToRelay = (f:number) => (f===1?1 : f===5?2 : 3);

  // Local API controls
  const setRelayState = async (channel:number, state:"on"|"off"|"auto") => {
    try {
      const res = await fetch(`${ESP32_BASE_URL}/relay?ch=${channel}&state=${state}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert(`Relay ${channel} -> ${state.toUpperCase()}`);
    } catch (e) {
      console.error(e);
      alert("Failed to reach ESP32. Check IP / network.");
    }
  };

  // Auth + Firestore devices
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
      } else {
        const colRef = collection(db, `users/${user.uid}/loads`);
        const unsubFS = onSnapshot(colRef, (snap) => {
          const items = snap.docs.map(d => ({ id:d.id, ...(d.data() as any) })) as Device[];
          setDevices(items);
          setLoading(false);
        }, (err) => {
          console.error("Firestore loads error:", err);
          setLoading(false);
        });

        // fetch ThingSpeak periodically for graphs/voltage/etc.
        fetchTS();
        const intv = setInterval(fetchTS, 20000);

        return () => { unsubFS(); clearInterval(intv); };
      }
    });
    return () => unsubAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTS = async () => {
    if (!THINGSPEAK_CHANNEL_ID || !THINGSPEAK_READ_API_KEY) return;
    try {
      const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_READ_API_KEY}&results=1`;
      const r = await fetch(url);
      const j = await r.json();
      if (j.feeds && j.feeds.length > 0) {
        const f = j.feeds[0];
        const data: ThingSpeakData = {
          field1: parseFloat(f.field1) || 0,
          field2: parseFloat(f.field2) || 0,
          field3: parseFloat(f.field3) || 0,
          field4: parseFloat(f.field4) || 1000,
          field5: parseFloat(f.field5) || 0,
          field6: parseFloat(f.field6) || 0,
          field7: parseFloat(f.field7) || 0,
          field8: parseFloat(f.field8) || 0,
        };
        setTS(data);
        setNewLimitInput(String(Math.round(data.field4)));
      }
    } catch (e) {
      console.error("ThingSpeak fetch error", e);
    }
  };

  const updatePermissibleLimit = async () => {
    const val = parseFloat(newLimitInput);
    if (isNaN(val) || val < 0) return alert("Enter a valid non-negative limit.");
    // Send locally for instant effect:
    try {
      const r = await fetch(`${ESP32_BASE_URL}/limit?value=${val}`);
      if (!r.ok) throw new Error(`Local limit set failed: ${r.status}`);
    } catch (e) {
      console.warn("Local limit set failed (ESP32 offline?)", e);
    }
    // Also push to ThingSpeak for logging/persistence
    if (!THINGSPEAK_WRITE_API_KEY) return alert("Missing ThingSpeak write key.");
    try {
      const url = `https://api.thingspeak.com/update?api_key=${THINGSPEAK_WRITE_API_KEY}&field4=${val}`;
      const resp = await fetch(url, { method: "POST" });
      if (!resp.ok) throw new Error(`TS HTTP ${resp.status}`);
      alert(`Limit set to ${val} W`);
    } catch (e) {
      console.error(e);
      alert("Failed to set ThingSpeak limit");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  const displayDevices: DisplayDevice[] = devices.map(d => {
    let power = 0, current = 0, voltage = ts.field2;
    if (d.field === 1) { power = ts.field3; current = ts.field1; }
    else if (d.field === 5) { power = ts.field6; current = ts.field5; }
    else if (d.field === 7) { power = ts.field8; current = ts.field7; }
    const status = power > 5 ? "active" : "standby";
    return { ...d, power, voltage, current, status };
  });

  const totalPower = displayDevices.reduce((s,x)=>s+x.power,0);
  const cost = (totalPower / 1000) * 0.18;

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
          <button
            onClick={() => router.push('/add-load')}
            className="flex items-center px-4 py-2 text-sm font-medium bg-gray-700 rounded-md hover:bg-gray-600 transition"
          >
            Manage Loads
            <ChevronRight className="h-4 w-4 ml-2" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-400">Total Power</p>
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white">{totalPower.toFixed(2)} W</div>
            <p className="text-xs text-gray-500">Real-time aggregate power</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-400">Voltage</p>
              <Power className="h-5 w-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white">{ts.field2.toFixed(2)} V</div>
            <p className="text-xs text-gray-500">Instantaneous mains voltage</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-400">Est. Cost (per hour)</p>
              <TrendingUp className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-white">${cost.toFixed(2)}</div>
            <p className="text-xs text-gray-500">@ $0.18/kWh</p>
          </div>
        </div>

        {/* Limit Control */}
        <div className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" /> Global Permissible Power Limit
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <p className="text-lg font-bold text-white">
              Current Limit: <span className="text-blue-400">{ts.field4.toFixed(0)} W</span>
            </p>
            <input
              type="number"
              className="bg-gray-800 text-white px-3 py-2 rounded-md w-full sm:w-auto"
              value={newLimitInput}
              onChange={(e) => setNewLimitInput(e.target.value)}
            />
            <button
              onClick={updatePermissibleLimit}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition w-full sm:w-auto"
            >
              Update Limit
            </button>
          </div>
          <p className="text-sm text-gray-400">
            Sent to ESP32 instantly (local API) and logged to ThingSpeak for history.
          </p>
        </div>

        {/* Load Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayDevices.map((item) => {
            const loadFactor = ts.field4 > 0 ? Math.round((item.power / ts.field4) * 100) : 0;
            const displayLoadFactor = Math.min(100, Math.max(0, loadFactor));
            const statusColor = item.status === "active"
              ? "bg-green-900 text-green-400 border border-green-500"
              : "bg-yellow-900 text-yellow-400 border border-yellow-500";

            const channel = fieldToRelay(item.field);

            return (
              <div key={item.id} className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-4 relative">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 font-medium text-white">
                    <Gauge className="h-5 w-5 text-blue-400" />
                    <span>{item.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-md ${statusColor}`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Power</p>
                    <p className="text-lg font-semibold text-white">{item.power.toFixed(2)} W</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Voltage</p>
                    <p className="text-lg font-semibold text-white">{item.voltage.toFixed(2)} V</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Current</p>
                    <p className="text-lg font-semibold text-white">{item.current.toFixed(2)} A</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Channel</p>
                    <p className="text-lg font-semibold text-white">{channel}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>Load Factor</span>
                    <span>{displayLoadFactor}%</span>
                  </div>
                  <div className="w-full bg-gray-700 h-2 rounded-full">
                    <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all" style={{ width: `${displayLoadFactor}%` }} />
                  </div>
                </div>

                {/* Manual Control */}
                <div className="flex justify-between mt-4">
                  <button onClick={() => setRelayState(channel, "on")} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">ON</button>
                  <button onClick={() => setRelayState(channel, "off")} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">OFF</button>
                  <button onClick={() => setRelayState(channel, "auto")} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">AUTO</button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
