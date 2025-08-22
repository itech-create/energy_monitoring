"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export default function AddLoadPage() {
  const router = useRouter();
  const [loadName, setLoadName] = useState("");
  const [selectedField, setSelectedField] = useState("1");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newLoad = {
        id: uuidv4(),
        name: loadName,
        field: selectedField,
      };

      // Save to localStorage (or replace with API call if backend exists)
      const existing = JSON.parse(localStorage.getItem("loads") || "[]");
      existing.push(newLoad);
      localStorage.setItem("loads", JSON.stringify(existing));

      // Redirect back to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("❌ Error adding load:", error);
      alert("Failed to add load. Please check console logs.");
    } finally {
      setIsLoading(false); // ✅ ensures button resets
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 text-white p-6 rounded-lg w-96 shadow-lg"
      >
        <h2 className="text-xl font-bold mb-4">Add New Load</h2>

        <label className="block mb-2">Load Name</label>
        <input
          type="text"
          value={loadName}
          onChange={(e) => setLoadName(e.target.value)}
          placeholder="e.g., Refrigerator"
          className="w-full p-2 mb-4 rounded bg-gray-800 border border-gray-600"
          required
        />

        <label className="block mb-2">ThingSpeak Field</label>
        <select
          value={selectedField}
          onChange={(e) => setSelectedField(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-gray-800 border border-gray-600"
        >
          <option value="1">Field 1 (Current 1 / Power 1)</option>
          <option value="2">Field 2 (Voltage)</option>
          <option value="3">Field 3 (Power 1)</option>
          <option value="5">Field 5 (Current 2 / Power 2)</option>
          <option value="6">Field 6 (Power 2)</option>
          <option value="7">Field 7 (Current 3 / Power 3)</option>
          <option value="8">Field 8 (Power 3)</option>
        </select>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded"
        >
          {isLoading ? "Adding..." : "Add Load"}
        </button>
      </form>
    </div>
  );
}
