// app/dashboard/page.tsx
"use client"; // Keep this at the top

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth"; // Import onAuthStateChanged
import { auth } from "@/lib/firebase"; // Import auth

// ... (other imports and Device type) ...

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  // ... (other states) ...

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login"); // Redirect to login if no user
      } else {
        // User is authenticated, proceed with data fetching
        // ... (your ThingSpeak data fetching logic) ...
        setLoading(false); // Set loading to false once auth check is done and data fetching starts
      }
    });

    return () => unsubscribeAuth();
  }, [router]); // Keep router in dependency array

  // ... (rest of your dashboard component) ...
}

// --- ThingSpeak Configuration (Using Environment Variables) ---
// IMPORTANT: These variables must be set in your Vercel project settings
// (or .env.local file for local development)
// For Vite, environment variables should be prefixed with VITE_
// For Next.js, environment variables are typically accessed via process.env.NEXT_PUBLIC_VAR_NAME
// If you are using Next.js, you should change import.meta.env to process.env
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

export default function App() {
  // State variables for managing UI and data
  const [loading, setLoading] = useState<boolean>(true); // Indicates if data is being loaded
  const [realtimeData, setRealtimeData] = useState<Device[]>([]); // Stores the processed energy data for display
  const [permissibleLimit, setPermissibleLimit] = useState<number>(1000); // Global power limit, default to 1000W
  const [newLimitInput, setNewLimitInput] = useState<string>('1000'); // State for the input field to set new limit

  // useEffect hook to fetch data on component mount and periodically
  useEffect(() => {
    // Validate that API keys are loaded
    if (!THINGSPEAK_CHANNEL_ID || !THINGSPEAK_READ_API_KEY || !THINGSPEAK_WRITE_API_KEY) {
      console.error("ThingSpeak API keys are not configured. Please set NEXT_PUBLIC_THINGSPEAK_CHANNEL_ID, NEXT_PUBLIC_THINGSPEAK_READ_API_KEY, and NEXT_PUBLIC_THINGSPEAK_WRITE_API_KEY environment variables.");
      setLoading(false);
      return;
    }

    // Asynchronous function to fetch data from ThingSpeak
    const fetchEnergyData = async () => {
      setLoading(true); // Set loading state to true while fetching

      try {
        // Construct the URL to fetch the latest entry from the ThingSpeak channel
        // 'results=1' fetches only the most recent data point
        const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_READ_API_KEY}&results=1`;
        const response = await fetch(url);

        // Check if the HTTP response was successful
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse the JSON response from ThingSpeak
        const data = await response.json();

        // Ensure data.feeds exists and contains at least one entry
        if (data.feeds && data.feeds.length > 0) {
          const latestFeed = data.feeds[0]; // Get the latest data entry

          // Extract and parse data from ThingSpeak fields
          // IMPORTANT: Adjust field numbers (e.g., field1, field2) based on your ESP32's ThingSpeak mapping
          // Using '|| 0' to default to 0 if parsing fails or field is null/undefined
          const load1Current = parseFloat(latestFeed.field1) || 0; // Assuming Field 1 for Load 1 Current
          const mainsVoltage = parseFloat(latestFeed.field2) || 0; // Assuming Field 2 for Mains Voltage (shared)
          const load1Power = parseFloat(latestFeed.field3) || 0;   // Assuming Field 3 for Load 1 Power
          const fetchedPermissibleLimit = parseFloat(latestFeed.field4) || 1000; // Assuming Field 4 for Permissible Power Limit, default 1000W
          const load2Current = parseFloat(latestFeed.field5) || 0; // Assuming Field 5 for Load 2 Current
          const load2Power = parseFloat(latestFeed.field6) || 0;   // Assuming Field 6 for Load 2 Power
          const load3Current = parseFloat(latestFeed.field7) || 0; // Assuming Field 7 for Load 3 Current
          const load3Power = parseFloat(latestFeed.field8) || 0;   // Assuming Field 8 for Load 3 Power


          // Initialize an array to hold our processed Device objects
          const extractedLoads: Device[] = [];

          // Construct Device objects for each load
          // 'name' is hardcoded here as ThingSpeak fields don't provide dynamic names per load.
          // 'status' is derived based on power consumption (e.g., active if power > 5W).
          // 'efficiency' is a placeholder; it would require more complex calculation or a fixed value.
          extractedLoads.push({
            name: "Living Room Light", // Example name for Load 1
            power: load1Power,
            voltage: mainsVoltage,
            current: load1Current,
            status: (load1Power > 5) ? "active" : "standby", // Threshold for active/standby
            efficiency: 90, // Placeholder efficiency
          });

          extractedLoads.push({
            name: "Kitchen Appliance", // Example name for Load 2
            power: load2Power,
            voltage: mainsVoltage,
            current: load2Current,
            status: (load2Power > 5) ? "active" : "standby", // Threshold for active/standby
            efficiency: 85, // Placeholder efficiency
          });

          extractedLoads.push({
            name: "Bedroom Fan", // Example name for Load 3
            power: load3Power,
            voltage: mainsVoltage,
            current: load3Current,
            status: (load3Power > 5) ? "active" : "standby", // Threshold for active/standby
            efficiency: 80, // Placeholder efficiency
          });

          // Update the state with the fetched data and permissible limit
          setRealtimeData(extractedLoads);
          setPermissibleLimit(fetchedPermissibleLimit);
          setNewLimitInput(fetchedPermissibleLimit.toString()); // Update input field with fetched limit

        } else {
          console.warn("ThingSpeak: No data feeds found in the response. Ensure your ESP32 is sending data and check your channel/API key.");
          setRealtimeData([]); // Clear data if no feeds are found
        }
      } catch (error) {
        console.error("❌ ThingSpeak data fetch error:", error);
        setRealtimeData([]); // Clear data on error
      } finally {
        setLoading(false); // Set loading state to false after fetch attempt (success or failure)
      }
    };

    // Initial data fetch when the component mounts
    fetchEnergyData();

    // Set up an interval to periodically fetch data (e.g., every 20 seconds)
    // This matches the typical ESP32 data upload interval to avoid unnecessary API calls.
    const intervalId = setInterval(fetchEnergyData, 20000); // 20000 milliseconds = 20 seconds

    // Cleanup function: This runs when the component unmounts or before the effect re-runs.
    // It's crucial to clear the interval to prevent memory leaks.
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array ensures this effect runs only once on mount

  // Function to handle updating the permissible power limit on ThingSpeak
  const updatePermissibleLimit = async () => {
    const newLimit = parseFloat(newLimitInput); // Parse the value from the input field

    // Validate the input
    if (isNaN(newLimit) || newLimit < 0) {
      alert('Please enter a valid non-negative number for the new limit.');
      return;
    }

    // Validate that API keys are configured before attempting to write
    if (!THINGSPEAK_CHANNEL_ID || !THINGSPEAK_WRITE_API_KEY) {
      alert("ThingSpeak Write API key is not configured. Cannot update limit.");
      console.error("ThingSpeak Write API key is missing.");
      return;
    }

    try {
      // Construct the URL for ThingSpeak Write API to update Field 4 (permissible power)
      // Using POST method for updates is generally recommended.
      const url = `https://api.thingspeak.com/update?api_key=${THINGSPEAK_WRITE_API_KEY}&field4=${newLimit}`;
      const response = await fetch(url, { method: 'POST' });

      // Check if the ThingSpeak update request was successful
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.text(); // ThingSpeak returns the entry ID on success (or 0 on failure)

      // If the update was successful (entry ID > 0)
      if (parseInt(data) > 0) {
        alert(`Permissible limit updated to ${newLimit}W. The ESP32 will pick this up shortly.`);
        setPermissibleLimit(newLimit); // Update local state immediately
        // Optionally, trigger a full data fetch to ensure all displayed values are consistent
        // fetchEnergyData(); // Uncomment if you want immediate full refresh after setting limit
      } else {
        alert('Failed to update permissible limit on ThingSpeak. Please check your Write API key or channel settings.');
      }
    } catch (error) {
      console.error("Error setting permissible limit:", error);
      alert('An error occurred while trying to set the limit. Please try again.');
    }
  };

  // Calculate total consumption and estimated cost for display
  // Using reduce to sum power from all available devices
  const totalConsumption = realtimeData.reduce((sum, item) => sum + item.power, 0);
  // Assuming a fixed cost per kWh, and converting total power (W) to kWh for cost calculation
  // For instantaneous cost, it's typically (Power in kW * Cost per kWh)
  // If totalConsumption is in Watts, convert to kW (divide by 1000) for kWh cost calculation
  const cost = (totalConsumption / 1000) * 0.18; // Assuming $0.18/kWh

  // Display loading message while data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl animate-pulse">Loading energy data from ThingSpeak...</div>
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
          {/* Settings button for the limit control - can be a placeholder or link to more settings */}
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
            {/* Display average voltage if multiple loads have voltage, or just mainsVoltage */}
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
            // Calculate load factor relative to the permissible limit
            // Ensure permissibleLimit is not zero to prevent division by zero
            const loadFactor = permissibleLimit > 0 ? Math.round((item.power / permissibleLimit) * 100) : 0;
            const displayLoadFactor = Math.min(100, Math.max(0, loadFactor)); // Cap between 0 and 100%

            // Determine status color based on active/standby status
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
