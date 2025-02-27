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
            document.getElementById("weight").value = data.weight || "";  // Now in lbs
            document.getElementById("height").value = data.height || "";  // Now in inches
            document.getElementById("dob").value = data.dob || "";
            document.getElementById("sex").value = data.sex || "";
            document.getElementById("calorieGoal").value = data.calorieGoal || "";
            document.getElementById("exerciseType").value = data.exerciseType || "";
            document.getElementById("healthGoals").value = data.healthGoals || "";
        }
    } else {
        window.location.href = "index.html"; // Redirect if not logged in
    }
});

// 🔹 Save user profile data
profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to save your profile!");
        return;
    }

    const profileData = {
        name: document.getElementById("name").value,
        age: document.getElementById("age").value,
        weight: document.getElementById("weight").value, // Now stored in lbs
        height: document.getElementById("height").value, // Now stored in inches
        dob: document.getElementById("dob").value,
        sex: document.getElementById("sex").value,
        calorieGoal: document.getElementById("calorieGoal").value,
        exerciseType: document.getElementById("exerciseType").value,
        healthGoals: document.getElementById("healthGoals").value,
    };

    try {
        await setDoc(doc(db, "users", user.uid), profileData);
        alert("Profile saved successfully!");
        window.location.href = "home.html"; // Redirect to dashboard
    } catch (error) {
        alert("Error saving profile: " + error.message);
    }
});
