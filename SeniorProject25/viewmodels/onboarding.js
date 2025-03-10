// Import necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { saveProfile } from "../models/user.js"; // Import saveProfile function

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
const analytics = getAnalytics(app);
const auth = getAuth();

document.addEventListener("DOMContentLoaded", () => {
    // Store User Input Data
    const userData = {
        firstName: "",
        lastName: "",
        birthday: "",
        height: "",
        healthConditions: new Set(),
    };

    // Grab Input Fields
    const firstNameInput = document.querySelector('input[placeholder="First Name"]');
    const lastNameInput = document.querySelector('input[placeholder="Last Name"]');
    const birthdayInput = document.querySelector('input[type="date"]');
    const heightInput = document.querySelector('input[placeholder="Enter your height"]');
    const optionButtons = document.querySelectorAll('.option-btn');
    const startButton = document.querySelector('.circle-arrow-btn');

    // Capture User Inputs
    if (firstNameInput) {
        firstNameInput.addEventListener('input', (e) => {
            userData.firstName = e.target.value.trim();
            logUserData();
        });
    }

    if (lastNameInput) {
        lastNameInput.addEventListener('input', (e) => {
            userData.lastName = e.target.value.trim();
            logUserData();
        });
    }

    if (birthdayInput) {
        birthdayInput.addEventListener('change', (e) => {
            userData.birthday = e.target.value;
            logUserData();
        });
    }

    if (heightInput) {
        heightInput.addEventListener('input', (e) => {
            userData.height = e.target.value.trim();
            logUserData();
        });
    }

    // Multi-select (Health Condition)
    optionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.parentElement.parentElement.querySelector('h3').innerText;
            const value = button.innerText;

            if (category === "Health Condition") {
                toggleSelection(userData.healthConditions, value);
            }

            logUserData();
        });
    });

    // Helper Function to Toggle Selection
    function toggleSelection(set, value) {
        if (set.has(value)) {
            set.delete(value);
        } else {
            set.add(value);
        }
    }

    // Log User Data Function
    function logUserData() {
        console.log("Updated User Data:", {
            ...userData,
            healthConditions: Array.from(userData.healthConditions),
        });
    }

    // Save to Firebase on Final Submission
    if (startButton) {
        startButton.addEventListener('click', async () => {
            console.log("Final Submission - User Data:", {
                ...userData,
                healthConditions: Array.from(userData.healthConditions),
            });

            const uid = auth.currentUser?.uid;

            if (uid) {
                // Convert Sets to Arrays before saving
                const formattedData = {
                    ...userData,
                    healthConditions: Array.from(userData.healthConditions),
                };

                // Save the profile data
                await saveProfile(uid, formattedData);

                // Redirect to profile page
                window.location.href = 'profile.html';
            } else {
                console.error("Error: User not authenticated.");
            }
        });
    } else {
        console.error("Error: Start button not found!");
    }
});
