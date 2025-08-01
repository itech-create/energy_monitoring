"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { PlusCircle, Pencil, Trash2, ArrowLeft } from 'lucide-react';

// Define a type for a load, including a Firestore ID and the ThingSpeak field number
type Device = {
  id: string; // Unique ID for Firestore document
  name: string;
  field: number; // The ThingSpeak field number (1-8) it maps to
};

export default function LoadManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [newDevice, setNewDevice] = useState<Device>({ id: '', name: '', field: 0 });
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editForm, setEditForm] = useState<Device | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [availableFields, setAvailableFields] = useState<number[]>([]);

  // --- Firestore and Auth Logic ---
  useEffect(() => {
    // Authenticate and get the user ID
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/login');
      } else {
        const uid = user.uid;
        setUserId(uid);

        // Subscribe to Firestore for changes in the user's devices
        const devicesCollectionRef = collection(db, `users/${uid}/loads`);
        const unsubscribeFirestore = onSnapshot(devicesCollectionRef, (snapshot) => {
          const fetchedDevices = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Device[];
          setDevices(fetchedDevices);

          // Update available fields for new device creation
          const usedFields = fetchedDevices.map(d => d.field);
          const allFields = [1, 2, 3, 5, 6, 7, 8]; // Exclude field 4 (permissible limit)
          const fieldsToUse = allFields.filter(field => !usedFields.includes(field));
          setAvailableFields(fieldsToUse);

          setLoading(false);
        }, (error) => {
          console.error("Error fetching devices from Firestore:", error);
          setLoading(false);
        });

        // Cleanup function
        return () => {
          unsubscribeAuth();
          unsubscribeFirestore();
        };
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  // --- Firestore Actions for Loads ---
  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newDevice.name || !newDevice.field) {
      alert("Please provide a name and select a field.");
      return;
    }
    try {
      const devicesCollectionRef = collection(db, `users/${userId}/loads`);
      await addDoc(devicesCollectionRef, { name: newDevice.name, field: newDevice.field });
      setNewDevice({ id: '', name: '', field: 0 }); // Reset form
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding new device:", error);
      alert("Failed to add device.");
    }
  };

  const handleEditDevice = async () => {
    if (!userId || !editForm) return;
    try {
      const deviceDocRef = doc(db, `users/${userId}/loads`, editForm.id);
      await setDoc(deviceDocRef, { name: editForm.name, field: editForm.field });
      setEditingDevice(null);
    } catch (error) {
      console.error("Error updating device:", error);
      alert("Failed to update device.");
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!userId) return;
    if (window.confirm("Are you sure you want to delete this device?")) {
      try {
        const deviceDocRef = doc(db, `users/${userId}/loads`, id);
        await deleteDoc(deviceDocRef);
      } catch (error) {
        console.error("Error deleting device:", error);
        alert("Failed to delete device.");
      }
    }
  };

  // --- Display and UI Logic ---
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl animate-pulse">Loading loads...</div>
      </div>
    );
  }

  const handleEditClick = (device: Device) => {
    setEditingDevice(device);
    setEditForm({ ...device });
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <header className="sticky top-0 bg-gray-900 border-b border-gray-800 shadow z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={() => router.push('/dashboard')} className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition">
              <ArrowLeft className="h-6 w-6 text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Manage Loads</h1>
              <p className="text-sm text-gray-400">Add, edit, or remove your connected devices</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center px-4 py-2 text-sm font-medium bg-green-600 rounded-md hover:bg-green-700 transition"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add New Load
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Add New Load Form */}
        {showAddForm && (
          <div className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800">
            <h3 className="text-lg font-semibold mb-4">Add a New Load</h3>
            <form onSubmit={handleAddDevice} className="space-y-4">
              <input
                type="text"
                placeholder="Load Name"
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-md"
                value={newDevice.name}
                onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                required
              />
              <select
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-md"
                value={newDevice.field}
                onChange={(e) => setNewDevice({ ...newDevice, field: parseInt(e.target.value) })}
                required
              >
                <option value={0}>Select ThingSpeak Field</option>
                {availableFields.map(field => (
                  <option key={field} value={field}>Field {field}</option>
                ))}
              </select>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Save Load
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List of Existing Loads */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.length === 0 && (
            <p className="text-center text-gray-500 col-span-full">No loads configured. Click 'Add New Load' to get started!</p>
          )}

          {devices.map((item) => (
            <div
              key={item.id}
              className="bg-gray-900 p-6 rounded-xl shadow border border-gray-800 space-y-4 relative"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 font-medium text-white">
                  <span>{item.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2 py-1 rounded-md bg-blue-900 text-blue-400 border border-blue-500">
                    Field {item.field}
                  </span>
                  <button
                    onClick={() => handleEditClick(item)}
                    className="text-gray-400 hover:text-blue-400 transition"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDevice(item.id)}
                    className="text-gray-400 hover:text-red-400 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Edit Form Modal */}
              {editingDevice && editingDevice.id === item.id && editForm && (
                <div className="absolute inset-0 bg-gray-950 bg-opacity-90 flex items-center justify-center p-4 rounded-xl z-10">
                  <div className="bg-gray-800 p-6 rounded-xl w-full max-w-sm space-y-4">
                    <h4 className="text-lg font-semibold">Edit Load: {item.name}</h4>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setEditingDevice(null)}
                        className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEditDevice}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
