"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { setDoc, doc } from "firebase/firestore";

export default function AddLoadPage() {
  const [name, setName] = useState("");
  const [field, setField] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return router.replace("/login");

    // ✅ use crypto.randomUUID instead of uuid()
    const id = crypto.randomUUID();

    await setDoc(doc(db, `users/${user.uid}/loads/${id}`), {
      name,
      field: parseInt(field),
    });

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 p-6 rounded-xl space-y-4 w-full max-w-sm"
      >
        <h1 className="text-xl font-semibold">Add Load</h1>

        <input
          type="text"
          placeholder="Load Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
          required
        />

        <input
          type="number"
          placeholder="Field Number"
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Save
        </button>
      </form>
    </div>
  );
}
