"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { onSnapshot, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Activity, Power, TrendingUp, Settings, Gauge, ChevronRight, Zap } from "lucide-react";

const THINGSPEAK_CHANNEL_ID = process.env.NEXT_PUBLIC_THINGSPEAK_CHANNEL_ID as string;
const THINGSPEAK_READ_API_KEY = process.env.NEXT_PUBLIC_THINGSPEAK_READ_API_KEY as string;
const THINGSPEAK_WRITE_API_KEY = process.env.NEXT_PUBLIC_THINGSPEAK_WRITE_API_KEY as string;

// Local ESP32 API
const ESP32_BASE_URL = process.env.NEXT_PUBLIC_ESP32_BASE_URL || "http://10.97.54.34";

// Types
type Device = { name: string; field: number }; // ✅ no "id" here
type ThingSpeakData = { field1:number; field2:number; field3:number; field4:number; field5:number; field6:number; field7:number; field8:number; };
type DisplayDevice = { id: string; name: string; field: number; power:number; voltage:number; current:number; status:"active"|"standby" };

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<DisplayDevice[]>([]);
  const [ts, setTS] = useState<ThingSpeakData>({
    field1:0,field2:0,field3:0,field4:1000,field5:0,field6:0,field7:0,field8:0
  });
  const [newLimitInput, setNewLimitInput] = useState("1000");

  // Map field -> relay channel
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
          const items = snap.docs.map((d) => ({
            id: d.id, // ✅ only source of id
            ...(d.data() as Device),
          }));
          setDevices(items);
          setLoading(false);
        }, (err) => {
          console.error("Firestore loads error:", err);
          setLoading(false);
        });

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
    try {
      await fetch(`${ESP32_BASE_URL}/limit?value=${val}`);
    } catch (e) {
      console.warn("Local limit set failed (ESP32 offline?)", e);
    }
    if (!THINGSPEAK_WRITE_API_KEY) return alert("Missing ThingSpeak write key.");
    try {
      const url = `https://api.thingspeak.com/update?api_key=${THINGSPEAK_WRITE_API_KEY}&field4=${val}`;
      await fetch(url, { method: "POST" });
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
      {/* header + main same as before, unchanged */}
      {/* ... */}
    </div>
  );
}
