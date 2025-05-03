import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

const profileForm = document.getElementById("profileForm");

// 🔹 Check if user is logged in
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        // 🔹 If user profile exists, pre-fill the form
        if (userDoc.exists()) {
            const data = userDoc.data();
            document.getElementById("name").value = data.name || "";
            document.getElementById("age").value = data.age || "";
            document.getElementById("weight").value = data.weight || "";
            document.getElementById("height").value = data.height || "";
            document.getElementById("dob").value = data.dob || "";
            document.getElementById("sex").value = data.sex || "";
            document.getElementById("calorieGoal").value = data.calorieGoal || "";
            document.getElementById("exerciseType").value = data.exerciseType || "";
            document.getElementById("healthGoals").value = data.healthGoals || "";

            document.getElementById("activityLevel").value = data.activityLevel || "";
            document.getElementById("dietType").value = data.dietType || "";
            document.getElementById("allergies").value = data.allergies || "";
            document.getElementById("budgetPreference").value = data.budgetPreference || "";
            document.getElementById("sleepHours").value = data.sleepHours || "";
            document.getElementById("waterIntakeGoal").value = data.waterIntakeGoal || "";
            document.getElementById("preferredWorkoutTime").value = data.preferredWorkoutTime || "";
            document.getElementById("mentalHealthFocus").value = data.mentalHealthFocus || "";
        }
    } else {
        window.location.href = "index.html"; // Redirect if not logged in
    }
});

// 🔹 Save user profile data (merged safely)
profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to save your profile!");
        return;
    }

    const updatedData = {
        name: document.getElementById("name").value,
        age: document.getElementById("age").value,
        weight: document.getElementById("weight").value,
        height: document.getElementById("height").value,
        dob: document.getElementById("dob").value,
        sex: document.getElementById("sex").value,
        calorieGoal: document.getElementById("calorieGoal").value,
        exerciseType: document.getElementById("exerciseType").value,
        healthGoals: document.getElementById("healthGoals").value,
        activityLevel: document.getElementById("activityLevel").value,
        dietType: document.getElementById("dietType").value,
        allergies: document.getElementById("allergies").value,
        budgetPreference: document.getElementById("budgetPreference").value,
        sleepHours: document.getElementById("sleepHours").value,
        waterIntakeGoal: document.getElementById("waterIntakeGoal").value,
        preferredWorkoutTime: document.getElementById("preferredWorkoutTime").value,
        mentalHealthFocus: document.getElementById("mentalHealthFocus").value,
    };

    const userDocRef = doc(db, "users", user.uid);

    try {
        // 🔐 Merge with existing profile
        const existingDoc = await getDoc(userDocRef);
        const existingData = existingDoc.exists() ? existingDoc.data() : {};

        const mergedData = {
            ...existingData,
            ...updatedData
        };

        await setDoc(userDocRef, mergedData);
        alert("✅ Profile saved successfully!");
        window.location.href = "home.html";
    } catch (error) {
        alert("❌ Error saving profile: " + error.message);
    }
});
