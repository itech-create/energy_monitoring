"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function AddLoadPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [field, setField] = useState<number>(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in.");
      return;
    }

    try {
      // ✅ Replace uuidv4() with built-in crypto.randomUUID()
      const id = crypto.randomUUID();

      const docRef = doc(db, `users/${user.uid}/loads/${id}`);
      await setDoc(docRef, {
        name,
        field,
      });

      alert("Load added successfully!");
      router.push("/dashboard");
    } catch (err) {
      console.error("Error adding load:", err);
      alert("Failed to add load.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 p-6 rounded-lg shadow space-y-4 w-full max-w-md"
      >
        <h1 className="text-xl font-bold">Add Load</h1>
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-700 px-3 py-2 rounded text-white"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Field Number</label>
          <input
            type="number"
            value={field}
            onChange={(e) => setField(Number(e.target.value))}
            required
            className="w-full bg-gray-800 border border-gray-700 px-3 py-2 rounded text-white"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded w-full"
        >
          Save
        </button>
      </form>
    </div>
  );
}
