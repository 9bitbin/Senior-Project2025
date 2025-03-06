// Import Firebase and Firestore
import { app, db, auth } from "../models/database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Function to get the username from Firestore
async function loadUsername(uid) {
    try {
        const userDoc = await getDoc(doc(db, "users", uid)); // Fetch user from Firestore

        if (userDoc.exists()) {
            const username = userDoc.data().username;
            document.getElementById("welcomeUser").innerText = `Welcome, ${username}`;
        } else {
            console.log("User not found in Firestore.");
            document.getElementById("welcomeUser").innerText = "Welcome, User";
        }
    } catch (error) {
        console.error("Error fetching username:", error);
    }
}

// Check if a user is logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadUsername(user.uid); // Get username from Firestore using UID
    } else {
        console.log("No user is logged in.");
        document.getElementById("welcomeUser").innerText = "Welcome, Guest";
    }
});
