"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Zap, Power, Activity, TrendingUp, Settings, Gauge, ChevronRight } from 'lucide-react';

// --- ThingSpeak Configuration ---
const THINGSPEAK_CHANNEL_ID = process.env.NEXT_PUBLIC_THINGSPEAK_CHANNEL_ID as string;
const THINGSPEAK_READ_API_KEY = process.env.NEXT_PUBLIC_THINGSPEAK_READ_API_KEY as string;
const THINGSPEAK_WRITE_API_KEY = process.env.NEXT_PUBLIC_THINGSPEAK_WRITE_API_KEY as string;

// Define a type for a load, including a Firestore ID and the ThingSpeak field number
type Device = {
  id: string; // Unique ID for Firestore document
  name: string;
  field: number; // The ThingSpeak field number (1-8) it maps to
};

// Define a type for the ThingSpeak data
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

// Combine Device configuration with ThingSpeak data for display
type DisplayDevice = Device & {
  power: number;
  voltage: number;
  current: number;
  status: "active" | "standby";
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [thingSpeakData, setThingSpeakData] = useState<ThingSpeakData>({
    field1: 0, field2: 0, field3: 0, field4: 0, field5: 0, field6: 0, field7: 0, field8: 0
  });
  const [newLimitInput, setNewLimitInput] = useState<string>('1000');

  // --- Firestore and Auth Logic ---
  useEffect(() => {
    // Authenticate and get the user ID
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/login');
      } else {
        const uid = user.uid;
        setUserId(uid);

        // Subscribe to Firestore for changes in the user's devices
        const devicesCollectionRef = collection(db, `users/${uid}/loads`);
        const unsubscribeFirestore = onSnapshot(devicesCollectionRef, (snapshot) => {
          const fetchedDevices = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Device[];
          setDevices(fetchedDevices);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching devices from Firestore:", error);
          setLoading(false);
        });

        // Fetch initial ThingSpeak data
        fetchThingSpeakData();

        // Start periodic ThingSpeak data fetch
        const intervalId = setInterval(fetchThingSpeakData, 20000);

        // Cleanup function
        return () => {
          unsubscribeAuth();
          unsubscribeFirestore();
          clearInterval(intervalId);
        };
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  // --- ThingSpeak Data Fetching ---
  const fetchThingSpeakData = async () => {
    if (!THINGSPEAK_CHANNEL_ID || !THINGSPEAK_READ_API_KEY) {
      console.error("ThingSpeak API keys are not configured.");
      return;
    }

    try {
      const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_READ_API_KEY}&results=1`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.feeds && data.feeds.length > 0) {
        const latestFeed = data.feeds[0];
        setThingSpeakData({
          field1: parseFloat(latestFeed.field1) || 0,
          field2: parseFloat(latestFeed.field2) || 0,
          field3: parseFloat(latestFeed.field3) || 0,
          field4: parseFloat(latestFeed.field4) || 1000,
          field5: parseFloat(latestFeed.field5) || 0,
          field6: parseFloat(latestFeed.field6) || 0,
          field7: parseFloat(latestFeed.field7) || 0,
          field8: parseFloat(latestFeed.field8) || 0,
        });
        setNewLimitInput(parseFloat(latestFeed.field4).toFixed(0));
      }
    } catch (error) {
      console.error("❌ ThingSpeak data fetch error:", error);
    }
  };

  // --- ThingSpeak Limit Control ---
  const updatePermissibleLimit = async () => {
    const newLimit = parseFloat(newLimitInput);
    if (isNaN(newLimit) || newLimit < 0) {
      alert('Please enter a valid non-negative number for the new limit.');
      return;
    }
    if (!THINGSPEAK_CHANNEL_ID || !THINGSPEAK_WRITE_API_KEY) {
      alert("ThingSpeak Write API key is not configured. Cannot update limit.");
      return;
    }
    try {
      const url = `https://api.thingspeak.com/update?api_key=${THINGSPEAK_WRITE_API_KEY}&field4=${newLimit}`;
      const response = await fetch(url, { method: 'POST' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.text();
      if (parseInt(data) > 0) {
        alert(`Permissible limit updated to ${newLimit}W.`);
        // The next ThingSpeak fetch will sync the new limit
      } else {
        alert('Failed to update permissible limit on ThingSpeak.');
      }
    } catch (error) {
      console.error("Error setting permissible limit:", error);
      alert('An error occurred while trying to set the limit.');
    }
  };

  // --- Display and UI Logic ---
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  // Map the ThingSpeak data to the user-defined devices
  const displayDevices: DisplayDevice[] = devices.map(device => {
    let power = 0;
    let current = 0;
    const voltage = thingSpeakData.field2;

    switch (device.field) {
      case 1:
        power = thingSpeakData.field3;
        current = thingSpeakData.field1;
        break;
      case 5:
        power = thingSpeakData.field6;
        current = thingSpeakData.field5;
        break;
      case 7:
        power = thingSpeakData.field8;
        current = thingSpeakData.field7;
        break;
      default:
        power = 0;
        current = 0;
        break;
    }

    const status = power > 5 ? "active" : "standby";

    return {
      ...device,
      power,
      voltage,
      current,
      status,
    };
  });

  const totalConsumption = displayDevices.reduce((sum, item) => sum + item.power, 0);
  const cost = (totalConsumption / 1000) * 0.18;

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
            onClick={() => router.push('/loads')}
            className="flex items-center px-4 py-2 text-sm font-medium bg-gray-700 rounded-md hover:bg-gray-600 transition"
          >
            Manage Loads
            <ChevronRight className="h-4 w-4 ml-2" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-400">Total Power</p>
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white">{totalConsumption.toFixed(2)} W</div>
            <p className="text-xs text-gray-500">Real-time aggregate power</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-400">Average Voltage</p>
              <Power className="h-5 w-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {thingSpeakData.field2.toFixed(2)} V
            </div>
            <p className="text-xs text-gray-500">Instantaneous mains voltage</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-400">Estimated Cost (per hour)</p>
              <TrendingUp className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-white">${cost.toFixed(2)}</div>
            <p className="text-xs text-gray-500">@ $0.18/kWh (based on current power)</p>
          </div>
        </div>

        {/* Permissible Power Limit Control Section */}
        <div className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" /> Global Permissible Power Limit
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <p className="text-lg font-bold text-white">Current Limit: <span className="text-blue-400">{thingSpeakData.field4.toFixed(0)} W</span></p>
            <input
              type="number"
              id="newLimitInput"
              placeholder="Set new limit (Watts)"
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
          <p className="text-sm text-gray-400">This limit is sent to the ESP32 and controls when individual loads are automatically disconnected to manage consumption.</p>
        </div>

        {/* Load Cards Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayDevices.length === 0 && (
            <p className="text-center text-gray-500 col-span-2">No loads configured. Please go to the "Manage Loads" page to add a new load.</p>
          )}

          {displayDevices.map((item) => {
            const loadFactor = thingSpeakData.field4 > 0 ? Math.round((item.power / thingSpeakData.field4) * 100) : 0;
            const displayLoadFactor = Math.min(100, Math.max(0, loadFactor));
            const statusColor = item.status === "active" ? "bg-green-900 text-green-400 border border-green-500" : "bg-yellow-900 text-yellow-400 border border-yellow-500";

            return (
              <div
                key={item.id}
                className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-4 relative"
              >
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
                    <p className="text-sm text-gray-400">ThingSpeak Field</p>
                    <p className="text-lg font-semibold text-white">{item.field}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>Load Factor (vs. Permissible Limit)</span>
                    <span>{displayLoadFactor}%</span>
                  </div>
                  <div className="w-full bg-gray-700 h-2 rounded-full">
                    <div
                      className="h-2 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all"
                      style={{ width: `${displayLoadFactor}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
