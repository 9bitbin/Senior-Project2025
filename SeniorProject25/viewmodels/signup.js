// Import Firebase Authentication
import { app, auth } from "../models/database.js"; // Use existing Firebase instance
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { save } from "../models/database.js"; // Import Firestore save function

// Attach signup event listener
document.getElementById("signupBtn").addEventListener("click", async function (event) {
    event.preventDefault(); // Prevent page reload

    // Inputs
    const username = document.getElementById("signup_username").value.trim();
    const email = document.getElementById("signup_email").value.trim();
    const password = document.getElementById("signup_password").value.trim();
    const confirmpass = document.getElementById("signup_confirmpassword").value.trim();
if(password !=confirmpass ){
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
        await save(user.uid, username);

        // Redirect to profile page after successful signup
        window.location.href = "profile.html";
    } catch (error) {
        console.error("Signup Error:", error);
        alert(error.message);
    }
});
