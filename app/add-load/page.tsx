"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function AddLoadPage() {
  const [name, setName] = useState("");
  const [field, setField] = useState("");
  const router = useRouter();

  const handleAddLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return router.replace("/login");

    const id = crypto.randomUUID();
    await setDoc(doc(db, `users/${user.uid}/loads/${id}`), {
      name,
      field,
      status: "auto",
      power: 0,
      current: 0,
      cost: 0,
    });

    router.push("/dashboard");
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-white mb-4">Add Load</h1>
      <form
        onSubmit={handleAddLoad}
        className="bg-gray-900 p-6 rounded-lg shadow space-y-4"
      >
        <input
          type="text"
          placeholder="Load Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
          required
        />
        <input
          type="text"
          placeholder="Field"
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
          required
        />
        <button
          type="submit"
          className="w-full px-4 py-2 rounded bg-blue-600 hover:bg-blue-500"
        >
          Add Load
        </button>
      </form>
    </div>
  );
}
