import { getUser, getUserWeights } from "../models/user.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

class LoadProfile {
    constructor() {
        this.auth = getAuth();
        this.initialValues = {}; // Store original values here
        this.initialize();
    }

    initialize() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                console.log(`User authenticated: ${user.uid}`);
                this.loadUserData(user.uid);
            } else {
                console.error("No authenticated user found.");
            }
        });
    }

    async loadUserData(uid) {
        try {
            console.log(`Fetching user profile for UID: ${uid}...`);
            const userData = await getUser(uid);
            let latestWeight = ""; // Default empty weight
    
            if (userData) {
                console.log("User data retrieved:", userData);
                this.populateBasicTab(userData);
                this.populateDietTab(userData);
            } else {
                console.warn("No user data found.");
            }
    
            // Fetch Weight Data (Most Recent Entry)
            const weightEntries = await getUserWeights(uid);
            if (weightEntries.length > 0) {
                latestWeight = weightEntries[weightEntries.length - 1].weight; // Get latest weight
                console.log(`Latest weight retrieved: ${latestWeight}`);
                document.getElementById("weight").value = latestWeight;
            } else {
                console.warn("No weight data found.");
            }
    
            // Store original values for reset
            this.storeInitialValues(userData, latestWeight);
    
        } catch (error) {
            console.error("Error loading user data:", error);
        }
    }
    


    populateBasicTab(userData) {
        document.getElementById("birthday").value = userData.birthday || "";
        document.getElementById("gender").value = userData.gender || "";
        document.getElementById("height").value = userData.height || "";

        // Health Condition (Multi-Select)
        const healthConditionSelect = document.getElementById("health-condition");
        if (userData.healthConditions && Array.isArray(userData.healthConditions)) {
            Array.from(healthConditionSelect.options).forEach(option => {
                option.selected = userData.healthConditions.includes(option.value);
            });
        }
    }

    populateDietTab(userData) {
        // Diet Type (Multi-Select)
        const dietSelect = document.getElementById("diet-type");
        if (userData.dietType && Array.isArray(userData.dietType)) {
            Array.from(dietSelect.options).forEach(option => {
                option.selected = userData.dietType.includes(option.value);
            });
        }

        // Allergies (Multi-Select)
        const allergiesSelect = document.getElementById("allergies");
        if (userData.allergies && Array.isArray(userData.allergies)) {
            Array.from(allergiesSelect.options).forEach(option => {
                option.selected = userData.allergies.includes(option.value);
            });
        }
    }

    storeInitialValues(userData, latestWeight) {
        window.initialProfileValues = { // Store globally for view.js
            birthday: userData.birthday || "",
            gender: userData.gender || "",
            height: userData.height || "",
            weight: latestWeight || "", // Store weight from Firestore
            dietType: userData.dietType ? [...userData.dietType] : [],
            allergies: userData.allergies ? [...userData.allergies] : [],
            healthConditions: userData.healthConditions ? [...userData.healthConditions] : []
        };
    
        console.log("Stored initial values globally:", window.initialProfileValues);
    }
    

    restoreInitialValues() {
        if (!window.initialProfileValues) {
            console.warn("No stored initial values found.");
            return;
        }

        // Restore text input values
        document.getElementById("birthday").value = window.initialProfileValues.birthday;
        document.getElementById("gender").value = window.initialProfileValues.gender;
        document.getElementById("height").value = window.initialProfileValues.height;
        document.getElementById("weight").value = window.initialProfileValues.weight; // Restore weight
    
        // Restore Multi-Selects
        this.restoreMultiSelect(document.getElementById("diet-type"), window.initialProfileValues.dietType);
        this.restoreMultiSelect(document.getElementById("allergies"), window.initialProfileValues.allergies);
        this.restoreMultiSelect(document.getElementById("health-condition"), window.initialProfileValues.healthConditions);
    
        console.log("Restored initial values successfully.");
    }
    

    restoreMultiSelect(selectElement, selectedValues) {
        if (!selectElement || !Array.isArray(selectedValues)) return;
    
        Array.from(selectElement.options).forEach(option => {
            option.selected = selectedValues.includes(option.value);
        });
    
        // Trigger change event to update UI
        selectElement.dispatchEvent(new Event("change"));
    }
}

// Ensure the profile data loads when authentication is ready
document.addEventListener("DOMContentLoaded", () => {
    window.profileInstance = new LoadProfile();
});

export default LoadProfile;
