"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
const id = crypto.randomUUID();

export default function AddLoadPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [field, setField] = useState(1);

  const add = async () => {
    const user = auth.currentUser;
    if (!user) return router.replace("/login");
    const id = uuid();
    await setDoc(doc(db, `users/${user.uid}/loads/${id}`), { name, field });
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Add Load</h1>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input className="w-full bg-gray-800 rounded px-3 py-2" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">ThingSpeak Field (1,5,7)</label>
          <input type="number" className="w-full bg-gray-800 rounded px-3 py-2" value={field} onChange={e=>setField(parseInt(e.target.value||"1"))} />
        </div>
        <button onClick={add} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">Save</button>
      </div>
    </div>
  );
}
