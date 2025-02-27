import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// 🔹 Elements to update BMI information
const bmiValueEl = document.getElementById("bmi-value");
const bmiCategoryEl = document.getElementById("bmi-category");
const bmiMessageEl = document.getElementById("bmi-message");

// 🔹 Function to calculate BMI using Imperial Units
async function calculateBMI() {
    const user = auth.currentUser;
    if (!user) {
        console.log("No user logged in");
        return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        console.log("User profile not found");
        return;
    }

    const userData = userDoc.data();
    const weight = userData.weight; // Weight in lbs
    const height = userData.height; // Height in inches

    if (!weight || !height) {
        bmiValueEl.innerText = "Data missing";
        bmiCategoryEl.innerText = "Please update your profile.";
        return;
    }

    // 🔹 API URL for BMI Calculation (Using Imperial Units)
    const bmiApiUrl = `https://body-mass-index-bmi-calculator.p.rapidapi.com/imperial?weight=${weight}&height=${height}`;

    try {
        const response = await fetch(bmiApiUrl, {
            method: "GET",
            headers: {
                "x-rapidapi-host": "body-mass-index-bmi-calculator.p.rapidapi.com",
                "x-rapidapi-key": "6ef7d8b092msh8f0f7027753276dp19011fjsn33971607c751" // api key for rapid api
            }
        });

        const data = await response.json();
        if (response.ok) {
            bmiValueEl.innerText = data.bmi.toFixed(2);
            bmiCategoryEl.innerText = data.weightCategory || "Not Available"; // Updated field for category
        }
    } catch (error) {
        console.error("Error fetching BMI:", error);
    }
}

// 🔹 Run BMI Calculation After User Logs In
onAuthStateChanged(auth, (user) => {
    if (user) {
        calculateBMI();
    }
});


