"use client"; // This directive marks the component as a Client Component

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // For navigation in Next.js
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'; // Firebase Auth functions
import { auth } from '@/lib/firebase'; // Assuming you have your Firebase config in '@/lib/firebase'
import { Zap } from 'lucide-react'; // For the logo icon
import { FirebaseError } from 'firebase/app'; // Import FirebaseError for type checking

export default function LoginPage() {
  // State variables for form inputs and UI feedback
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true); // For initial auth check
  const [loginError, setLoginError] = useState<string | null>(null); // To display login errors

  const router = useRouter(); // Initialize Next.js router for redirection

  // useEffect hook to check authentication status on component mount
  // If a user is already logged in, redirect them to the dashboard
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, redirect to dashboard
        router.replace('/dashboard'); // Use replace to prevent going back to login page
      } else {
        // No user is signed in, show the login form
        setLoading(false);
      }
    });

    // Cleanup function: unsubscribe from the auth listener when the component unmounts
    return () => unsubscribe();
  }, [router]); // Dependency array includes router to ensure effect re-runs if router object changes

  // Function to handle the login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior (page reload)
    setLoginError(null); // Clear any previous errors
    setLoading(true); // Show loading indicator during login attempt

    try {
      // Attempt to sign in with email and password using Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);
      // If successful, the onAuthStateChanged listener will handle redirection
    } catch (error: unknown) { // Changed 'any' to 'unknown' for better type safety
      // Handle various Firebase authentication errors
      let errorMessage = 'An unknown error occurred. Please try again.';
      if (error instanceof FirebaseError) { // Check if the error is a FirebaseError
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address format.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled.';
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            errorMessage = 'Incorrect email or password.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed login attempts. Please try again later.';
            break;
          default:
            errorMessage = error.message; // Fallback to Firebase's default error message
        }
      } else if (error instanceof Error) {
        errorMessage = error.message; // Handle generic JS errors
      }
      setLoginError(errorMessage); // Set the error message to display to the user
      setLoading(false); // Stop loading
    }
  };

  // If loading (checking auth status), display a loading message
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl animate-pulse">Checking authentication status...</div>
      </div>
    );
  }

  // Render the login form
  return (
    <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center p-4">
      <div className="bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-800 w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="flex flex-col items-center space-y-3">
          <div className="p-3 bg-blue-800 rounded-full">
            <Zap className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome Back to PowerPal</h1>
          <p className="text-sm text-gray-400">Sign in to manage your energy consumption</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-md border border-gray-700 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-md border border-gray-700 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Display Login Error */}
          {loginError && (
            <p className="text-red-500 text-sm text-center">{loginError}</p>
          )}

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading} // Disable button while loading
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Optional: Link to a signup page (if you create one) */}
        <p className="text-center text-sm text-gray-400">
          Don&apos;t have an account?{' '} {/* Escaped apostrophe */}
          <a href="/signup" className="text-blue-400 hover:underline">
            Sign up here
          </a>
        </p>
      </div>
    </div>
  );
}
