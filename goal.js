// Import Firebase
console.log("✅ goal.js is loaded!");

import { db, auth } from "./firebase-config.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Select Elements from home.html
const proteinGoalInput = document.getElementById("protein-goal");
const carbsGoalInput = document.getElementById("carbs-goal");
const fatGoalInput = document.getElementById("fat-goal");
const setGoalsBtn = document.getElementById("set-goals");
const updateGoalsBtn = document.getElementById("update-goals");
const resetGoalsBtn = document.getElementById("reset-goals");

const proteinGoalDisplay = document.getElementById("protein-goal-display");
const carbsGoalDisplay = document.getElementById("carbs-goal-display");
const fatGoalDisplay = document.getElementById("fat-goal-display");

// 🔹 Set Macronutrient Goals
async function setGoals() {
    console.log("✅ Set Goals button clicked");

    const user = auth.currentUser;
    if (!user) {
        console.error("ERROR: User not logged in!");
        return;
    }

    const proteinGoal = parseFloat(proteinGoalInput.value);
    const carbsGoal = parseFloat(carbsGoalInput.value);
    const fatGoal = parseFloat(fatGoalInput.value);

    if (isNaN(proteinGoal) || isNaN(carbsGoal) || isNaN(fatGoal)) {
        alert("❌ Please enter valid macronutrient goals.");
        return;
    }

    const userDocRef = doc(db, "users", user.uid);
    try {
        await updateDoc(userDocRef, {
            macroGoals: {
                protein: proteinGoal,
                carbs: carbsGoal,
                fat: fatGoal
            }
        });

        console.log("✅ Macronutrient goals set successfully!");
        fetchGoals();
    } catch (error) {
        console.error("❌ ERROR setting macronutrient goals:", error);
    }
}

// 🔹 Fetch & Display Goals
async function fetchGoals() {
    console.log("🔄 Fetching macronutrient goals...");

    const user = auth.currentUser;
    if (!user) {
        console.error("ERROR: User not logged in!");
        return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        let macroGoals = userDoc.data().macroGoals || { protein: 0, carbs: 0, fat: 0 };

        proteinGoalDisplay.innerText = macroGoals.protein;
        carbsGoalDisplay.innerText = macroGoals.carbs;
        fatGoalDisplay.innerText = macroGoals.fat;

        console.log("✅ Macronutrient goals fetched:", macroGoals);
    }
}

// 🔹 Reset Macronutrient Goals
async function resetGoals() {
    console.log("✅ Reset Goals button clicked");

    const user = auth.currentUser;
    if (!user) {
        console.error("ERROR: User not logged in!");
        return;
    }

    const userDocRef = doc(db, "users", user.uid);
    try {
        await updateDoc(userDocRef, {
            macroGoals: {
                protein: 0,
                carbs: 0,
                fat: 0
            }
        });

        console.log("✅ Macronutrient goals reset successfully!");
        fetchGoals();
    } catch (error) {
        console.error("❌ ERROR resetting macronutrient goals:", error);
    }
}

// Ensure User is Logged In & Fetch Goals
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("✅ User logged in, fetching macronutrient goals...");
        fetchGoals();
    } else {
        console.error("❌ User not logged in, redirecting...");
        window.location.href = "index.html";
    }
});

// Attach Event Listeners
setGoalsBtn.addEventListener("click", setGoals);
updateGoalsBtn.addEventListener("click", setGoals);
resetGoalsBtn.addEventListener("click", resetGoals);
