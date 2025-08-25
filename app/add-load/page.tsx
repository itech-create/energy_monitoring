"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function AddLoadPage() {
  const [name, setName] = useState("");
  const [field, setField] = useState("field1");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      await addDoc(collection(db, `users/${user.uid}/loads`), {
        name,
        field,
        status: "auto",
        power: 0,
        current: 0,
        cost: 0,
      });
      router.push("/dashboard");
    } catch (err) {
      console.error("Error adding load:", err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center text-white">
          Add New Load
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Load Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Load Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Refrigerator"
              className="w-full p-2 rounded bg-gray-800 text-white focus:ring-2 focus:ring-blue-600 outline-none"
              required
            />
          </div>

          {/* ThingSpeak Field */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              ThingSpeak Field
            </label>
            <select
              value={field}
              onChange={(e) => setField(e.target.value)}
              className="w-full p-2 rounded bg-gray-800 text-white focus:ring-2 focus:ring-blue-600 outline-none"
            >
              <option value="field1">Field 1 (Current 1 / Power 1)</option>
              <option value="field2">Field 2 (Current 2 / Power 2)</option>
              <option value="field3">Field 3 (Current 3 / Power 3)</option>
              <option value="field4">Field 4 (Current 4 / Power 4)</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-semibold rounded-lg shadow"
          >
            {loading ? "Adding..." : "Add Load"}
          </button>
        </form>

        {/* Go Back Button */}
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg shadow mt-2"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
