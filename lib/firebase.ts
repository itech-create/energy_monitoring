import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics"; // ✅ Add isSupported

const firebaseConfig = {
  apiKey: "AIzaSyAJ0X6zQd1xugcSBiWC06C33LiqkSY4Psw",
  authDomain: "powerpal-d7657.firebaseapp.com",
  projectId: "powerpal-d7657",
  storageBucket: "powerpal-d7657.appspot.com",
  messagingSenderId: "981728769166",
  appId: "1:981728769166:web:3384dbed91d6b3bd8185df",
  measurementId: "G-87FXTXJ7BQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Only initialize analytics on the client side
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  isSupported().then((yes) => {
    if (yes) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, db, analytics };
