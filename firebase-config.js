import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// 🔹 Replace with your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDlElgQKY_IVWUbBJSK7eoFxwo4zjNVj8E",
  authDomain: "testingvidia02.firebaseapp.com",
  projectId: "testingvidia02",
  storageBucket: "testingvidia02.firebasestorage.app",
  messagingSenderId: "269530214007",
  appId: "1:269530214007:web:754b42124170964a096072"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app); // Initialize Firestore

export { auth, provider, db };

