import { auth, provider, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

const formTitle = document.getElementById("formTitle");
const authBtn = document.getElementById("authBtn");
const toggleText = document.getElementById("toggleText");
const emailField = document.getElementById("email");
const passwordField = document.getElementById("password");
const googleLogin = document.getElementById("googleLogin");

let isSignUp = false; // Default mode is Login

// 🔹 Function to Toggle Between Login & Signup
function toggleAuthMode() {
    isSignUp = !isSignUp;
    formTitle.innerText = isSignUp ? "Sign Up" : "Login";
    authBtn.innerText = isSignUp ? "Sign Up" : "Login";

    // Update the toggle text & reattach event listener
    toggleText.innerHTML = isSignUp
        ? 'Already have an account? <a href="#" id="toggleAuth">Login</a>'
        : 'Don\'t have an account? <a href="#" id="toggleAuth">Sign Up</a>';

    // Reattach the event listener to the dynamically updated toggle link
    document.getElementById("toggleAuth").addEventListener("click", (e) => {
        e.preventDefault();
        toggleAuthMode();
    });
}

// Attach event listener on page load
document.getElementById("toggleAuth").addEventListener("click", (e) => {
    e.preventDefault();
    toggleAuthMode();
});

// 🔹 Handle Login/Signup Button Click
authBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailField.value;
    const password = passwordField.value;

    try {
        let userCredential;
        if (isSignUp) {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            alert("Signup successful! Please complete your profile.");
            window.location.href = "profile.html"; // Redirect new users to profile page
        } else {
            userCredential = await signInWithEmailAndPassword(auth, email, password);
            alert("Login successful! Checking profile...");
            checkUserProfile(userCredential.user.uid); // Check if the user has a profile
        }
    } catch (error) {
        alert("Error: " + error.message);
    }
});

// 🔹 Google Login
googleLogin.addEventListener("click", async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        alert("Google login successful! Checking profile...");
        checkUserProfile(result.user.uid); // Check if the user has a profile
    } catch (error) {
        alert("Error: " + error.message);
    }
});

// 🔹 Check if User Has a Profile in Firestore
async function checkUserProfile(userId) {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        window.location.href = "home.html"; // User has a profile → Go to dashboard
    } else {
        window.location.href = "profile.html"; // New user → Go to profile setup
    }
}

