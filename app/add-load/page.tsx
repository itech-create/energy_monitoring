"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, collection } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function AddLoadPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [field, setField] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const handleAddLoad = async () => {
    setLoading(true);

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        alert("You must be logged in to add a load.");
        setLoading(false);
        return;
      }

      try {
        const loadId = crypto.randomUUID(); // ✅ replaced uuidv4()
        const userLoadsRef = collection(db, `users/${user.uid}/loads`);
        await setDoc(doc(userLoadsRef, loadId), {
          id: loadId,
          name,
          field,
        });

        alert("Load added successfully!");
        router.push("/");
      } catch (error) {
        console.error("Error adding load:", error);
        alert("Failed to add load. Please try again.");
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-lg shadow-lg w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">Add New Load</h1>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Load Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white"
            placeholder="e.g., Refrigerator"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">ThingSpeak Field</label>
          <select
            value={field}
            onChange={(e) => setField(Number(e.target.value))}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white"
          >
            <option value={1}>Field 1 (Current 1 / Power 1)</option>
            <option value={5}>Field 5 (Current 2 / Power 2)</option>
            <option value={7}>Field 7 (Current 3 / Power 3)</option>
          </select>
        </div>

        <button
          onClick={handleAddLoad}
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Load"}
        </button>
      </div>
    </div>
  );
}
