"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { email, password } = credentials;
    if (!email || !password) {
      setMessage({ type: "error", text: "Please enter both email and password." });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Firestore: Fetch user document
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        console.log("User data from DB:", userData);
      } else {
        console.warn("No user data found in Firestore.");
      }

      setMessage({ type: "success", text: "Welcome to PowerPal Dashboard!" });
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (error: unknown) {
        const firebaseError = error as FirebaseError;
      console.error(error);
      let msg = "Login failed. Please try again.";
      if (firebaseError.code === "auth/user-not-found") msg = "User not found.";
      else if (firebaseError.code === "auth/wrong-password") msg = "Incorrect password.";
      setMessage({ type: "error", text: msg });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-200 via-white to-blue-200 opacity-40" />
      <div className="w-full max-w-md bg-white border border-gray-200 shadow-md p-6 rounded-lg relative z-10">
        <div className="flex flex-col items-center space-y-3 mb-6">
          <div className="p-3 bg-yellow-100 rounded-full">
            <Zap className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">PowerPal Dashboard</h1>
          <p className="text-sm text-gray-500">ESP32 Energy Monitoring System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials((prev) => ({ ...prev, email: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-md transition-all disabled:opacity-60"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 text-center text-sm font-medium ${
              message.type === "error" ? "text-red-600" : "text-green-600"
            }`}
          >
            {message.text}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          Don&apos;t have an account? <a href="/signup" className="text-yellow-600 hover:underline">Sign up here</a>
        </p>
      </div>
    </div>
  );
}
