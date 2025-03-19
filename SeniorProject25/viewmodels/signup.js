// Import Firebase Authentication
import { app, auth } from "../models/database.js"; // Use existing Firebase instance
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { saveUser } from "../models/user.js"; // Use saveUser instead of saveUsername

// Attach signup event listener
document.getElementById("signupBtn").addEventListener("click", async function (event) {
    event.preventDefault(); // Prevent page reload

    // Inputs
    const username = document.getElementById("signup_username").value.trim();
    const email = document.getElementById("signup_email").value.trim();
    const password = document.getElementById("signup_password").value.trim();
    const confirmpass = document.getElementById("signup_confirmpassword").value.trim();

    if (password !== confirmpass) {
        alert("Passwords Do Not Match!");
        return;
    }

    if (!username || !email || !password) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        // Firebase Authentication: Create User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log("User registered in Firebase Authentication:", user);

        // Firestore: Save Username (Using UID as the document ID)
        await saveUser(user.uid, { username });

        // Redirect to onboarding page
        window.location.href = "onboarding.html";
    } catch (error) {
        console.error("Signup Error:", error);
        alert(error.message);
    }
});
