import { auth, provider } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

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
        if (isSignUp) {
            await createUserWithEmailAndPassword(auth, email, password);
            alert("Signup successful! Please log in.");
            toggleAuthMode(); // Switch to login mode after signup
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            alert("Login successful! Redirecting...");
            window.location.href = "home.html"; // Redirect to home page
        }
    } catch (error) {
        alert("Error: " + error.message);
    }
});

// 🔹 Google Login
googleLogin.addEventListener("click", async () => {
    try {
        await signInWithPopup(auth, provider);
        alert("Google login successful! Redirecting...");
        window.location.href = "home.html";
    } catch (error) {
        alert("Error: " + error.message);
    }
});
