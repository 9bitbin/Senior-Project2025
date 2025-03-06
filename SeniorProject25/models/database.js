// Import Firebase and Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA6oRNKYzLUlvrRBcr24vRLy4JMQJCHUYI",
    authDomain: "vidia-application.firebaseapp.com",
    projectId: "vidia-application",
    storageBucket: "vidia-application.firebasestorage.app",
    messagingSenderId: "128760641576",
    appId: "1:128760641576:web:4afb7d5daabf7967ab1d1d",
    measurementId: "G-030V44ZV1H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Save function for Firestore (Uses UID as document ID)
export async function save(uid, username) {
    if (!uid || !username.trim()) {
        console.error("Invalid UID or username. Not saving to Firestore.");
        return;
    }

    try {
        await setDoc(doc(db, "users", uid), { username: username });
        console.log(`User "${username}" saved successfully in Firestore!`);
    } catch (error) {
        console.error("Error saving user to Firestore:", error);
    }
}

export { db, app, auth };
