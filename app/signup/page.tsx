"use client"; // This directive marks the component as a Client Component

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // For navigation in Next.js
import { createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'; // Firebase Auth functions
import { auth } from '@/lib/firebase'; // Assuming you have your Firebase config in '@/lib/firebase'
import { Zap } from 'lucide-react'; // For the logo icon
import { FirebaseError } from 'firebase/app'; // Import FirebaseError for type checking

export default function SignupPage() {
  // State variables for form inputs and UI feedback
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true); // For initial auth check
  const [signupError, setSignupError] = useState<string | null>(null); // To display signup errors

  const router = useRouter(); // Initialize Next.js router for redirection

  // useEffect hook to check authentication status on component mount
  // If a user is already logged in, redirect them to the dashboard
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, redirect to dashboard
        router.replace('/dashboard'); // Use replace to prevent going back to signup page
      } else {
        // No user is signed in, show the signup form
        setLoading(false);
      }
    });

    // Cleanup function: unsubscribe from the auth listener when the component unmounts
    return () => unsubscribe();
  }, [router]); // Dependency array includes router to ensure effect re-runs if router object changes

  // Function to handle the signup form submission
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior (page reload)
    setSignupError(null); // Clear any previous errors

    // Basic client-side validation for password match
    if (password !== confirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }

    setLoading(true); // Show loading indicator during signup attempt

    try {
      // Attempt to create a new user with email and password using Firebase Auth
      await createUserWithEmailAndPassword(auth, email, password);
      // If successful, the onAuthStateChanged listener will handle redirection
      // You might also want to show a success message or redirect to login page explicitly
      alert('Account created successfully! You are now logged in.');
      router.replace('/dashboard'); // Or '/login' if you want them to log in after signup
    } catch (error: unknown) { // Changed 'any' to 'unknown' for better type safety
      // Handle various Firebase authentication errors
      let errorMessage = 'An unknown error occurred during signup. Please try again.';
      if (error instanceof FirebaseError) { // Check if the error is a FirebaseError
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'The email address is already in use by another account.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'The email address is not valid.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/password sign-up is not enabled. Please contact support.';
            break;
          case 'auth/weak-password':
            errorMessage = 'The password is too weak. Please choose a stronger password.';
            break;
          default:
            errorMessage = error.message; // Fallback to Firebase's default error message
        }
      } else if (error instanceof Error) {
        errorMessage = error.message; // Handle generic JS errors
      }
      setSignupError(errorMessage); // Set the error message to display to the user
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

  // Render the signup form
  return (
    <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center p-4">
      <div className="bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-800 w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="flex flex-col items-center space-y-3">
          <div className="p-3 bg-blue-800 rounded-full">
            <Zap className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create Your PowerPal Account</h1>
          <p className="text-sm text-gray-400">Join us to start managing your energy</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="space-y-4">
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
              minLength={6} // Firebase requires a minimum password length
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-md border border-gray-700 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Display Signup Error */}
          {signupError && (
            <p className="text-red-500 text-sm text-center">{signupError}</p>
          )}

          {/* Signup Button */}
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded-md font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading} // Disable button while loading
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        {/* Link to Login page */}
        <p className="text-center text-sm text-gray-400">
          Already have an account?{' '}
          <a href="/login" className="text-blue-400 hover:underline">
            Login here
          </a>
        </p>
      </div>
    </div>
  );
}
