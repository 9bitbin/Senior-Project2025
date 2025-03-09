// Import necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Firebase configuration (same as your existing one)
const firebaseConfig = {
  apiKey: "AIzaSyA6oRNKYzLUlvrRBcr24vRLy4JMQJCHUYI",
  authDomain: "vidia-application.firebaseapp.com",
  projectId: "vidia-application",
  storageBucket: "vidia-application.firebasestorage.app",
  messagingSenderId: "128760641576",
  appId: "1:128760641576:web:4afb7d5daabf7967ab1d1d",
  measurementId: "G-030V44ZV1H"
};

// Initialize Firebase (you already had this)
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();

// =====================================================
// LOGIN FUNCTION (This part was already in your file)
// =====================================================
const login = document.getElementById('loginBtn');
login.addEventListener("click", function(event) {
    event.preventDefault();

    const email = document.getElementById('login_email').value;
    const password = document.getElementById('login_password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Redirect to home page after successful login
            window.location.href = "home.html";
        })
        .catch((error) => {
            alert("Login failed: " + error.message);
        });
});

// =====================================================
// PASSWORD RESET LOGIC (NEWLY ADDED BELOW)
// =====================================================
document.addEventListener("DOMContentLoaded", function() {
    const forgotPasswordLink = document.querySelector('.forget-password');

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(event) {
            event.preventDefault();  // Stop the link from navigating

            const email = prompt("Please enter your email to reset password:");

            if (email) {
                sendPasswordResetEmail(auth, email)
                    .then(() => {
                        alert("Password reset email has been sent. Please check your email.");
                    })
                    .catch((error) => {
                        alert("Error sending password reset email: " + error.message);
                    });
            } else {
                alert("Email is required to reset your password.");
            }
        });
    }
});
