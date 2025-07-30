"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore"; // add this
import { db } from "@/lib/firebase"; // make sure this is imported
import { FirebaseError } from "firebase/app";


export default function SignupPage() {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const router = useRouter();

//   const handleSignup = async (e: React.FormEvent) => {

//     e.preventDefault();
//     const { email, password } = credentials;

//     if (!email || !password) {
//       setMessage({ type: "error", text: "Please enter both email and password." });
//       return;
//     }

//     setIsLoading(true);
//     setMessage(null);

//     try {
//       await createUserWithEmailAndPassword(auth, email, password);
//       setMessage({ type: "success", text: "Account created successfully! Redirecting..." });

//       setTimeout(() => {
//         router.push("/dashboard"); // Or redirect to login: router.push("/login")
//       }, 1500);
//     } catch (error: any) {
//       let msg = "Signup failed. Please try again.";
//       if (error.code === "auth/email-already-in-use") msg = "Email already in use.";
//       else if (error.code === "auth/invalid-email") msg = "Invalid email format.";
//       else if (error.code === "auth/weak-password") msg = "Password should be at least 6 characters.";

//       setMessage({ type: "error", text: msg });
//       console.error(error);
//     }

//     setIsLoading(false);
//   };

const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  const { email, password } = credentials;

  if (!email || !password) {
    setMessage({ type: "error", text: "Please enter both email and password." });
    return;
  }

  setIsLoading(true);
  setMessage(null);

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save user info in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      createdAt: new Date().toISOString(),
    });

    setMessage({ type: "success", text: "Account created successfully! Redirecting..." });

    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    let msg = "Signup failed. Please try again.";
    if (firebaseError.code === "auth/email-already-in-use") msg = "Email already in use.";
    else if (firebaseError.code === "auth/invalid-email") msg = "Invalid email format.";
    else if (firebaseError.code === "auth/weak-password") msg = "Password should be at least 6 characters.";

    setMessage({ type: "error", text: msg });
    console.error(error);
  }

  setIsLoading(false);
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-200 via-white to-blue-200 opacity-40" />

      <div className="w-full max-w-md bg-white border border-gray-200 shadow-md p-6 rounded-lg relative z-10">
        <div className="flex flex-col items-center space-y-3 mb-6">
          <div className="p-3 bg-yellow-100 rounded-full">
            <UserPlus className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Create PowerPal Account</h1>
          <p className="text-sm text-gray-500">Sign up to monitor your energy usage</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
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
            {isLoading ? "Creating account..." : "Sign Up"}
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
          Already have an account? <a href="/login" className="text-yellow-600 hover:underline">Login here</a>
        </p>
      </div>
    </div>
  );
}
