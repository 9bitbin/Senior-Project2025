import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// 🔹 Replace with your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyD1iXSx2Y22IzeVcmUoVacPR5fVMp1SJpg",
  authDomain: "testingvidia.firebaseapp.com",
  projectId: "testingvidia",
  storageBucket: "testingvidia.firebasestorage.app",
  messagingSenderId: "98113240298",
  appId: "1:98113240298:web:f1871fda29b7d5f7996b93"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app); // Initialize Firestore

export { auth, provider, db };

