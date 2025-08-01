"use client"; // Marks this as a Client Component

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // For redirection
import { onAuthStateChanged } from 'firebase/auth'; // For checking auth state
import { auth } from '@/lib/firebase'; // Assuming your firebase config is here
import { Zap, Power, Activity, TrendingUp, Settings, Gauge } from 'lucide-react';

// --- ThingSpeak Configuration (Using Environment Variables) ---
// IMPORTANT: These variables must be set in your Vercel project settings
const THINGSPEAK_CHANNEL_ID = process.env.NEXT_PUBLIC_THINGSPEAK_CHANNEL_ID as string;
const THINGSPEAK_READ_API_KEY = process.env.NEXT_PUBLIC_THINGSPEAK_READ_API_KEY as string;
const THINGSPEAK_WRITE_API_KEY = process.env.NEXT_PUBLIC_THINGSPEAK_WRITE_API_KEY as string;
// --- End Configuration ---

// Define the type for a single device/load
type Device = {
  name: string;
  power: number;
  voltage: number;
  current: number;
  status: "active" | "standby";
  efficiency: number; // Placeholder, as ThingSpeak fields don't directly provide this
};

export default function DashboardPage() {
  // State variables for managing UI and data
  const [loading, setLoading] = useState<boolean>(true); // Indicates if data is being loaded
  const [realtimeData, setRealtimeData] = useState<Device[]>([]); // Stores the processed energy data for display
  const [permissibleLimit, setPermissibleLimit] = useState<number>(1000); // Global power limit, default to 1000W
  const [newLimitInput, setNewLimitInput] = useState<string>('1000'); // State for the input field to set new limit

  const router = useRouter();

  // useEffect hook to handle authentication and data fetching
  useEffect(() => {
    // Check authentication state first
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // No user is signed in, redirect to login page
        router.replace('/login');
      } else {
        // User is signed in, proceed with data fetching
        setLoading(false);
      }
    });

    // Validate that API keys are loaded
    if (!THINGSPEAK_CHANNEL_ID || !THINGSPEAK_READ_API_KEY || !THINGSPEAK_WRITE_API_KEY) {
      console.error("ThingSpeak API keys are not configured. Please set NEXT_PUBLIC_THINGSPEAK environment variables.");
      setLoading(false);
      return;
    }

    // Asynchronous function to fetch data from ThingSpeak
    const fetchEnergyData = async () => {
      // Show loading state if we are authenticated and fetching data for the first time
      setLoading(true);

      try {
        const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_READ_API_KEY}&results=1`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.feeds && data.feeds.length > 0) {
          const latestFeed = data.feeds[0];

          // Extract and parse data from ThingSpeak fields
          const load1Current = parseFloat(latestFeed.field1) || 0;
          const mainsVoltage = parseFloat(latestFeed.field2) || 0;
          const load1Power = parseFloat(latestFeed.field3) || 0;
          const fetchedPermissibleLimit = parseFloat(latestFeed.field4) || 1000;
          const load2Current = parseFloat(latestFeed.field5) || 0;
          const load2Power = parseFloat(latestFeed.field6) || 0;
          const load3Current = parseFloat(latestFeed.field7) || 0;
          const load3Power = parseFloat(latestFeed.field8) || 0;

          const extractedLoads: Device[] = [];
          extractedLoads.push({
            name: "Living Room Light",
            power: load1Power,
            voltage: mainsVoltage,
            current: load1Current,
            status: (load1Power > 5) ? "active" : "standby",
            efficiency: 90,
          });

          extractedLoads.push({
            name: "Kitchen Appliance",
            power: load2Power,
            voltage: mainsVoltage,
            current: load2Current,
            status: (load2Power > 5) ? "active" : "standby",
            efficiency: 85,
          });

          extractedLoads.push({
            name: "Bedroom Fan",
            power: load3Power,
            voltage: mainsVoltage,
            current: load3Current,
            status: (load3Power > 5) ? "active" : "standby",
            efficiency: 80,
          });

          setRealtimeData(extractedLoads);
          setPermissibleLimit(fetchedPermissibleLimit);
          setNewLimitInput(fetchedPermissibleLimit.toString());
        } else {
          console.warn("ThingSpeak: No data feeds found.");
          setRealtimeData([]);
        }
      } catch (error) {
        console.error("❌ ThingSpeak data fetch error:", error);
        setRealtimeData([]);
      } finally {
        setLoading(false);
      }
    };

    // Set up an interval to periodically fetch data
    const intervalId = setInterval(fetchEnergyData, 20000);

    // Cleanup function: unsubscribe from auth and clear interval
    return () => {
      unsubscribeAuth();
      clearInterval(intervalId);
    };
  }, [router]);

  // Function to handle updating the permissible power limit on ThingSpeak
  const updatePermissibleLimit = async () => {
    const newLimit = parseFloat(newLimitInput);
    if (isNaN(newLimit) || newLimit < 0) {
      alert('Please enter a valid non-negative number for the new limit.');
      return;
    }

    if (!THINGSPEAK_CHANNEL_ID || !THINGSPEAK_WRITE_API_KEY) {
      alert("ThingSpeak Write API key is not configured. Cannot update limit.");
      console.error("ThingSpeak Write API key is missing.");
      return;
    }

    try {
      const url = `https://api.thingspeak.com/update?api_key=${THINGSPEAK_WRITE_API_KEY}&field4=${newLimit}`;
      const response = await fetch(url, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.text();
      if (parseInt(data) > 0) {
        alert(`Permissible limit updated to ${newLimit}W.`);
        setPermissibleLimit(newLimit);
      } else {
        alert('Failed to update permissible limit on ThingSpeak.');
      }
    } catch (error) {
      console.error("Error setting permissible limit:", error);
      alert('An error occurred while trying to set the limit.');
    }
  };

  const totalConsumption = realtimeData.reduce((sum, item) => sum + item.power, 0);
  const cost = (totalConsumption / 1000) * 0.18;

  // Display loading message while data is being fetched or auth is checked
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Header Section */}
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
          </div>
        </div>
      </header>

      {/* Main Content Area */}
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
              {realtimeData.length > 0 ? realtimeData[0].voltage.toFixed(2) : '0.00'} V
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
                <p className="text-lg font-bold text-white">Current Limit: <span className="text-blue-400">{permissibleLimit.toFixed(0)} W</span></p>
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
          {realtimeData.map((item, index) => {
            const loadFactor = permissibleLimit > 0 ? Math.round((item.power / permissibleLimit) * 100) : 0;
            const displayLoadFactor = Math.min(100, Math.max(0, loadFactor));

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
                    <span className={`text-xs px-2 py-1 rounded-md ${statusColor}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Power</p>
                    <p className="text-lg font-semibold text-white">{item.power.toFixed(2)} W</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Efficiency</p>
                    <p className="text-lg font-semibold text-white">{item.efficiency}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Voltage</p>
                    <p className="text-lg font-semibold text-white">{item.voltage.toFixed(2)} V</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Current</p>
                    <p className="text-lg font-semibold text-white">{item.current.toFixed(2)} A</p>
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
