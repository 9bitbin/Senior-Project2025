import { auth, db } from "../models/database.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Load data when the user logs in
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log("User is logged in:", user.uid);
        await loadProfileData(user.uid, "Basic"); // Load Basic section by default
    } else {
        console.log("No user logged in.");
    }
});

// Function to load profile data when switching tabs
async function loadProfileData(userId, section = "all") {
    if (!userId) {
        console.error("No user ID available.");
        return;
    }

    const userDocRef = doc(db, "users", userId);
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const userData = docSnap.data();
            console.log(`User Data Loaded for ${section}:`, userData);

            if (section === "all" || section === "Basic") {
                setInputValue("birthday", userData.birthday);
                setInputValue("sex", userData.sex, "select");
                setInputValue("height", userData.height);  
                updateMultiSelect("health-condition", userData.healthCondition || []);

                // Fetch the latest weight entry from subcollection
                await loadLatestWeight(userId);
            }

            if (section === "all" || section === "Dietary") {
                setInputValue("diet-type", userData.dietType, "select");
                updateMultiSelect("allergies", userData.allergies || []);
            }

        } else {
            console.log(`No profile data found for ${section}.`);
        }
    } catch (error) {
        console.error("Error loading profile data:", error);
    }
}

async function loadLatestWeight(userId) {
    if (!userId) return;

    const weightCollectionRef = collection(db, "users", userId, "weight");

    // Get the most recent weight entry
    const q = query(weightCollectionRef, orderBy("date", "desc"), limit(1));

    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const latestWeightDoc = querySnapshot.docs[0];
            const weightData = latestWeightDoc.data();

            console.log("Latest Weight Data:", weightData);
            setInputValue("weight", weightData.value);  // Populate weight input
        } else {
            console.warn("No weight data found for user.");
        }
    } catch (error) {
        console.error("Error fetching weight data:", error);
    }
}
   

// Function to update input fields
function setInputValue(inputId, value, type = "input") {
    const element = document.getElementById(inputId);
    if (!element) {
        console.warn(`Element not found: ${inputId}`);
        return;
    }

    if (value === undefined || value === null) {
        console.warn(`No value found for ${inputId}, keeping default.`);
        return;
    }

    console.log(`Setting ${inputId} to:`, value);

    if (type === "select") {
        // Handle select fields like dietType
        if (Array.isArray(value)) {
            element.value = value[0] || ""; // Pick first item if array
        } else {
            element.value = value || "";
        }
    } else {
        element.value = value || "";
    }
}


// Function to update multiple select fields
function updateMultiSelect(selectId, values) {
    const select = document.getElementById(selectId);
    if (!select) return;

    Array.from(select.options).forEach(option => {
        option.selected = values.includes(option.value);
    });
}

// Function to save profile data
async function saveProfileData(sectionId) {
    const user = auth.currentUser;
    if (!user) {
        console.error("No user logged in.");
        return;
    }

    const userDocRef = doc(db, "users", user.uid);
    let updatedData = {};

    if (sectionId === "Basic") {
        updatedData = {
            birthday: getInputValue("birthday"),
            sex: getInputValue("sex"),
            weight: getInputValue("weight"),
            height: getInputValue("height"),  // Now stored as a string
            healthCondition: getMultiSelectValues("health-condition"),
        };
    } else if (sectionId === "Dietary") {
        updatedData = {
            dietType: getInputValue("diet-type"),
            allergies: getMultiSelectValues("allergies"),
        };
    }

    try {
        await setDoc(userDocRef, updatedData, { merge: true });
        console.log(`Profile updated for ${sectionId}.`);
        alert("Profile saved!");
    } catch (error) {
        console.error("Error updating profile:", error);
    }
}


// Function to get input values
function getInputValue(inputId) {
    const element = document.getElementById(inputId);
    return element ? element.value : "";
}

// Function to get multi-select values
function getMultiSelectValues(selectId) {
    const select = document.getElementById(selectId);
    return select ? Array.from(select.selectedOptions).map(opt => opt.value) : [];
}

// Attach event listeners to Save buttons
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("save-basic").addEventListener("click", () => saveProfileData("Basic"));
    document.getElementById("save-dietary").addEventListener("click", () => saveProfileData("Dietary"));
});

// Load data dynamically when switching tabs
document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", function () {
        let selectedTab = this.textContent.trim();
        if (selectedTab === "Basic") {
            loadProfileData(auth.currentUser?.uid, "Basic");
        } else if (selectedTab === "Dietary") {
            loadProfileData(auth.currentUser?.uid, "Dietary");
        }
    });
});
