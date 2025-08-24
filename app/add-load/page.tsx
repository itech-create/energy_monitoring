"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function AddLoadPage() {
  const [name, setName] = useState("");
  const [field, setField] = useState("field1");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) return router.replace("/login");

      const id = crypto.randomUUID();

      await setDoc(doc(db, `users/${user.uid}/loads/${id}`), {
        id,
        name,
        field,
        status: "auto", // default
        power: 0,
      });

      router.push("/dashboard");
    } catch (err) {
      console.error("Error adding load:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-xl font-bold text-white mb-4">Add New Load</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm">Load Name</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 rounded bg-gray-700 text-white"
              placeholder="e.g., Refrigerator"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm">ThingSpeak Field</label>
            <select
              className="w-full mt-1 px-3 py-2 rounded bg-gray-700 text-white"
              value={field}
              onChange={(e) => setField(e.target.value)}
            >
              <option value="field1">Field 1 (Current / Power 1)</option>
              <option value="field2">Field 2 (Current / Power 2)</option>
              <option value="field3">Field 3 (Current / Power 3)</option>
              <option value="field4">Field 4 (Current / Power 4)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            {loading ? "Adding..." : "Add Load"}
          </button>
        </form>
      </div>
    </div>
  );
}
